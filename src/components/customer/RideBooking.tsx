import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/ride';
import LocationSearch from './LocationSearch';
import MapView from '@/components/map/MapView';
import { Navigation, Gift, Star, Loader2, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RideBooking() {
  const { profile, user } = useAuth();
  const { location: currentLocation } = useGeolocation(true);
  const { getAddress } = useReverseGeocode();
  const { toast } = useToast();

  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');

  // Set current location as pickup
  useEffect(() => {
    if (currentLocation && !pickup) {
      setPickup(currentLocation);
      getAddress(currentLocation).then(setPickupAddress);
    }
  }, [currentLocation, pickup, getAddress]);

  // Calculate price with AI when route changes
  useEffect(() => {
    if (pickup && dropoff) {
      const distance = calculateDistance(pickup, dropoff);
      const duration = Math.round(distance * 3); // ~3 min per km
      setEstimatedDuration(duration);
      
      // Call AI for price calculation
      calculateAIPrice(distance, duration);
    }
  }, [pickup, dropoff, pickupAddress, dropoffAddress]);

  const calculateDistance = (from: Location, to: Location): number => {
    const R = 6371;
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          distance_km: distance,
          duration_minutes: duration,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Price calculation failed');
      }

      const data = await response.json();
      
      // Apply first ride discount
      let finalPrice = data.price;
      if (profile && !profile.first_ride_used) {
        finalPrice = 0;
      }

      setEstimatedPrice(Math.round(finalPrice * 100) / 100);
      setPriceBreakdown(data.breakdown);
    } catch (error) {
      console.error('AI price error:', error);
      // Fallback calculation
      const basePrice = 3.5;
      const pricePerKm = 1.5;
      let price = basePrice + distance * pricePerKm;
      
      if (profile && !profile.first_ride_used) {
        price = 0;
      }
      
      setEstimatedPrice(Math.round(price * 100) / 100);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleMapClick = async (location: Location) => {
    const address = await getAddress(location);
    
    if (selectingLocation === 'pickup') {
      setPickup(location);
      setPickupAddress(address);
    } else if (selectingLocation === 'dropoff') {
      setDropoff(location);
      setDropoffAddress(address);
    }
    setSelectingLocation(null);
  };

  const handleBookRide = async () => {
    if (!pickup || !dropoff || !user) return;

    setLoading(true);
    try {
      const distance = calculateDistance(pickup, dropoff);
      
      const { data, error } = await supabase
        .from('rides')
        .insert({
          customer_id: user.id,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          pickup_address: pickupAddress,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          dropoff_address: dropoffAddress,
          status: 'pending',
          price: estimatedPrice || 0,
          distance_km: distance,
          duration_minutes: estimatedDuration || 0,
          first_ride_discount: profile && !profile.first_ride_used,
          scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

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
          {/* Loyalty Info */}
          {profile && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">{profile.loyalty_points} Punkte</span>
              </div>
              {!profile.first_ride_used && (
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Gift className="w-4 h-4" />
                  <span>Erste Fahrt gratis!</span>
                </div>
              )}
            </div>
          )}

          {/* Location Inputs */}
          <div className="space-y-3">
            <div onClick={() => setSelectingLocation('pickup')}>
              <LocationSearch
                placeholder="Abholort"
                value={pickupAddress}
                onChange={setPickupAddress}
                onSelect={(loc, addr) => {
                  setPickup(loc);
                  setPickupAddress(addr);
                }}
                icon="pickup"
              />
            </div>

            <div onClick={() => setSelectingLocation('dropoff')}>
              <LocationSearch
                placeholder="Wohin?"
                value={dropoffAddress}
                onChange={setDropoffAddress}
                onSelect={(loc, addr) => {
                  setDropoff(loc);
                  setDropoffAddress(addr);
                }}
                icon="dropoff"
              />
            </div>
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
                    <p className="font-bold text-2xl">
                      {profile && !profile.first_ride_used ? (
                        <span className="text-primary">Gratis</span>
                      ) : (
                        `${estimatedPrice?.toFixed(2)} €`
                      )}
                    </p>
                  )}
                </div>
              </div>
              
              {priceBreakdown && !profile?.first_ride_used && (
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
