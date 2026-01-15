import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/ride';
import LocationSearch from './LocationSearch';
import MapView from '@/components/map/MapView';
import { Navigation, Gift, Star, Loader2, Clock, Calendar, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function extractHouseNumberFromFormattedAddress(address: string) {
  // expects "Street 12a, City" or "Street, City"
  const firstPart = address.split(',')[0] ?? address;
  const match = firstPart.match(/^(.*?)(?:\s+(\d+[a-zA-Z]?))\s*$/);
  return {
    street: match ? match[1].trim() : firstPart.trim(),
    houseNumber: match ? (match[2] || '').trim() : '',
  };
}

export default function RideBooking() {
  const { profile, user } = useAuth();
  const { location: currentLocation } = useGeolocation(true);
  const { getAddress, searchAddress } = useReverseGeocode();
  const { toast } = useToast();

  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupHouseNumber, setPickupHouseNumber] = useState('');
  const [dropoffHouseNumber, setDropoffHouseNumber] = useState('');
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [discount, setDiscount] = useState<{ type: string; amount: number } | null>(null);

  // Check if today's discount applies (30% today)
  const isTodayDiscount = true;

  const fullPickupAddress = useMemo(
    () => (pickupHouseNumber ? `${pickupAddress} ${pickupHouseNumber}` : pickupAddress).trim(),
    [pickupAddress, pickupHouseNumber]
  );
  const fullDropoffAddress = useMemo(
    () => (dropoffHouseNumber ? `${dropoffAddress} ${dropoffHouseNumber}` : dropoffAddress).trim(),
    [dropoffAddress, dropoffHouseNumber]
  );

  // Set current location as pickup (best-effort; might not include house number)
  useEffect(() => {
    if (currentLocation && !pickup && !pickupAddress) {
      setPickup(currentLocation);
      getAddress(currentLocation).then((addr) => {
        setPickupAddress(addr.split(',')[0] ?? addr);
        const { houseNumber } = extractHouseNumberFromFormattedAddress(addr);
        if (houseNumber) setPickupHouseNumber(houseNumber);
      });
    }
  }, [currentLocation, pickup, pickupAddress, getAddress]);

  // If user types/changes house number, refine pickup/dropoff pin by geocoding full address.
  useEffect(() => {
    const refine = async (kind: 'pickup' | 'dropoff') => {
      const base = kind === 'pickup' ? pickupAddress : dropoffAddress;
      const hn = kind === 'pickup' ? pickupHouseNumber : dropoffHouseNumber;
      if (!base || !hn) return;

      const results = await searchAddress(`${base} ${hn}`);
      if (results.length === 0) return;

      if (kind === 'pickup') setPickup(results[0].location);
      else setDropoff(results[0].location);
    };

    refine('pickup');
    refine('dropoff');
  }, [pickupAddress, pickupHouseNumber, dropoffAddress, dropoffHouseNumber, searchAddress]);

  // Calculate price with AI when route changes
  useEffect(() => {
    if (pickup && dropoff) {
      const distance = calculateDistance(pickup, dropoff);
      const duration = Math.round(distance * 3);
      setEstimatedDuration(duration);
      calculateAIPrice(distance, duration);
    } else {
      setEstimatedPrice(null);
      setOriginalPrice(null);
      setPriceBreakdown(null);
      setEstimatedDuration(null);
      setDiscount(null);
    }
  }, [pickup, dropoff, fullPickupAddress, fullDropoffAddress]);

  const calculateDistance = (from: Location, to: Location): number => {
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      (Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateAIPrice = async (distance: number, duration: number) => {
    setPriceLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          distance_km: distance,
          duration_minutes: duration,
          pickup_address: fullPickupAddress,
          dropoff_address: fullDropoffAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Price calculation failed');
      }

      const data = await response.json();
      const basePrice = data.price;
      setOriginalPrice(basePrice);
      setPriceBreakdown(data.breakdown);

      // Apply discounts
      let finalPrice = basePrice;
      let discountApplied: { type: string; amount: number } | null = null;

      // First ride free only if price under 20€
      if (profile && !profile.first_ride_used && basePrice < 20) {
        finalPrice = 0;
        discountApplied = { type: 'Erste Fahrt gratis!', amount: basePrice };
      }
      // 30% discount today for all rides
      else if (isTodayDiscount) {
        const discountAmount = basePrice * 0.3;
        finalPrice = basePrice - discountAmount;
        discountApplied = { type: '30% Rabatt heute!', amount: discountAmount };
      }

      setEstimatedPrice(Math.round(finalPrice * 100) / 100);
      setDiscount(discountApplied);
    } catch (error) {
      console.error('AI price error:', error);
      // Fallback calculation
      const basePrice = 3.5;
      const pricePerKm = 1.5;
      let price = basePrice + distance * pricePerKm;
      setOriginalPrice(price);

      // Apply discounts in fallback too
      if (profile && !profile.first_ride_used && price < 20) {
        setDiscount({ type: 'Erste Fahrt gratis!', amount: price });
        price = 0;
      } else if (isTodayDiscount) {
        const discountAmount = price * 0.3;
        setDiscount({ type: '30% Rabatt heute!', amount: discountAmount });
        price = price - discountAmount;
      }

      setEstimatedPrice(Math.round(price * 100) / 100);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleMapClick = async (location: Location) => {
    const address = await getAddress(location);
    const { street, houseNumber } = extractHouseNumberFromFormattedAddress(address);

    if (selectingLocation === 'pickup') {
      setPickup(location);
      setPickupAddress(street);
      setPickupHouseNumber(houseNumber);
    } else if (selectingLocation === 'dropoff') {
      setDropoff(location);
      setDropoffAddress(street);
      setDropoffHouseNumber(houseNumber);
    }
    setSelectingLocation(null);
  };

  const handleBookRide = async () => {
    if (!pickup || !dropoff || !user) return;

    if (!pickupHouseNumber || !dropoffHouseNumber) {
      toast({
        title: 'Hausnummer fehlt',
        description: 'Bitte gib für Abholort und Ziel eine Hausnummer ein, damit der Pin exakt sitzt.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const distance = calculateDistance(pickup, dropoff);

      // Determine promo details
      const isFirstRideFree = profile && !profile.first_ride_used && (originalPrice || 0) < 20;
      const promoDiscount = discount?.amount || 0;
      const promoType = discount?.type || null;

      const { data, error } = await supabase
        .from('rides')
        .insert({
          customer_id: user.id,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          pickup_address: fullPickupAddress,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          dropoff_address: fullDropoffAddress,
          status: 'pending',
          price: originalPrice || 0, // Store original price
          distance_km: distance,
          duration_minutes: estimatedDuration || 0,
          first_ride_discount: isFirstRideFree,
          promo_discount: promoDiscount,
          promo_type: promoType,
          scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark first ride as used if applicable
      if (isFirstRideFree) {
        await supabase.from('profiles').update({ first_ride_used: true }).eq('user_id', user.id);
      }

      toast({
        title: 'Fahrt angefragt!',
        description: 'Wir suchen einen Fahrer für dich...',
      });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={currentLocation || { lat: 52.52, lng: 13.405 }}
          pickup={pickup}
          dropoff={dropoff}
          showRoute={!!pickup && !!dropoff}
          onMapClick={handleMapClick}
          pickupDraggable={!!pickup}
          dropoffDraggable={!!dropoff}
          onPickupChange={(loc) => {
            setPickup(loc);
            getAddress(loc).then((addr) => {
              const { street, houseNumber } = extractHouseNumberFromFormattedAddress(addr);
              setPickupAddress(street);
              setPickupHouseNumber(houseNumber);
            });
          }}
          onDropoffChange={(loc) => {
            setDropoff(loc);
            getAddress(loc).then((addr) => {
              const { street, houseNumber } = extractHouseNumberFromFormattedAddress(addr);
              setDropoffAddress(street);
              setDropoffHouseNumber(houseNumber);
            });
          }}
          className="h-full"
        />

        {selectingLocation && (
          <div className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-sm px-4 py-3 rounded-xl border border-border shadow-lg animate-fade-in">
            <p className="text-sm text-center font-medium">
              Tippe auf die Karte, um {selectingLocation === 'pickup' ? 'den Abholort' : 'das Ziel'} zu wählen
            </p>
          </div>
        )}
      </div>

      {/* Booking Panel */}
      <Card className="rounded-t-3xl border-t border-border bg-card shadow-2xl animate-slide-up">
        <CardContent className="p-6 space-y-4">
          {/* Loyalty Info & Promo Banner */}
          <div className="space-y-2">
            {profile && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{profile.loyalty_points} Punkte</span>
                </div>
                {!profile.first_ride_used && (
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Gift className="w-4 h-4" />
                    <span>Erste Fahrt gratis (unter 20€)!</span>
                  </div>
                )}
              </div>
            )}
            {isTodayDiscount && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Heute: 30% Rabatt auf alle Fahrten!</span>
              </div>
            )}
          </div>

          {/* Location Inputs with House Number */}
          <div className="space-y-3">
            <div onClick={() => setSelectingLocation('pickup')}>
              <LocationSearch
                placeholder="Abholort (Straße)"
                value={pickupAddress}
                onChange={(v) => {
                  setPickupAddress(v);
                  // Pin follows house number – reset precise location until house number present
                  if (!pickupHouseNumber) setPickup(null);
                }}
                onSelect={(loc, addr) => {
                  const { street, houseNumber } = extractHouseNumberFromFormattedAddress(addr);
                  setPickupAddress(street);
                  if (houseNumber) {
                    setPickupHouseNumber(houseNumber);
                    setPickup(loc);
                  } else {
                    setPickup(null);
                  }
                }}
                houseNumber={pickupHouseNumber}
                onHouseNumberChange={(v) => {
                  setPickupHouseNumber(v);
                  if (!v) setPickup(null);
                }}
              />
            </div>

            <div onClick={() => setSelectingLocation('dropoff')}>
              <LocationSearch
                placeholder="Zielort (Straße)"
                value={dropoffAddress}
                onChange={(v) => {
                  setDropoffAddress(v);
                  if (!dropoffHouseNumber) setDropoff(null);
                }}
                onSelect={(loc, addr) => {
                  const { street, houseNumber } = extractHouseNumberFromFormattedAddress(addr);
                  setDropoffAddress(street);
                  if (houseNumber) {
                    setDropoffHouseNumber(houseNumber);
                    setDropoff(loc);
                  } else {
                    setDropoff(null);
                  }
                }}
                houseNumber={dropoffHouseNumber}
                onHouseNumberChange={(v) => {
                  setDropoffHouseNumber(v);
                  if (!v) setDropoff(null);
                }}
              />
            </div>

            {(fullPickupAddress || fullDropoffAddress) && (
              <div className="text-xs text-muted-foreground">
                {fullPickupAddress && <div>Abholort: <span className="text-foreground">{fullPickupAddress}</span></div>}
                {fullDropoffAddress && <div>Ziel: <span className="text-foreground">{fullDropoffAddress}</span></div>}
              </div>
            )}
          </div>

          {/* Schedule Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Abfahrtszeit (optional)
            </Label>
            <Input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-secondary border-0"
            />
          </div>

          {/* Price Estimate */}
          {(estimatedPrice !== null || priceLoading) && estimatedDuration !== null && (
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Geschätzte Ankunft
                  </p>
                  <p className="font-semibold text-lg">{estimatedDuration} min</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Preis</p>
                  {priceLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-auto" />
                  ) : (
                    <div>
                      {discount && <p className="text-xs text-primary font-medium">{discount.type}</p>}
                      <div className="flex items-center gap-2 justify-end">
                        {originalPrice && originalPrice !== estimatedPrice && (
                          <span className="text-sm line-through text-muted-foreground">{originalPrice.toFixed(2)} €</span>
                        )}
                        <p className="font-bold text-2xl">
                          {estimatedPrice === 0 ? <span className="text-primary">Gratis</span> : `${estimatedPrice?.toFixed(2)} €`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {priceBreakdown && estimatedPrice !== 0 && (
                <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span>Grundpreis</span>
                    <span>{priceBreakdown.base?.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strecke</span>
                    <span>{priceBreakdown.distance?.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zeit</span>
                    <span>{priceBreakdown.time?.toFixed(2)} €</span>
                  </div>
                  {priceBreakdown.fuel_surcharge > 0 && (
                    <div className="flex justify-between">
                      <span>Kraftstoffzuschlag</span>
                      <span>{priceBreakdown.fuel_surcharge?.toFixed(2)} €</span>
                    </div>
                  )}
                  {discount && (
                    <div className="flex justify-between text-primary font-medium">
                      <span>{discount.type}</span>
                      <span>-{discount.amount.toFixed(2)} €</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Book Button */}
          <Button
            className="w-full h-14 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]"
            disabled={!pickup || !dropoff || loading || priceLoading}
            onClick={handleBookRide}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Navigation className="w-5 h-5 mr-2" />
                Fahrt buchen
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

