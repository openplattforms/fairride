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
import { Navigation, Gift, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RideBooking() {
  const { profile } = useAuth();
  const { location: currentLocation } = useGeolocation(true);
  const { getAddress } = useReverseGeocode();
  const { toast } = useToast();

  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

  // Set current location as pickup
  useEffect(() => {
    if (currentLocation && !pickup) {
      setPickup(currentLocation);
      getAddress(currentLocation).then(setPickupAddress);
    }
  }, [currentLocation, pickup, getAddress]);

  // Calculate price when route changes
  useEffect(() => {
    if (pickup && dropoff) {
      const distance = calculateDistance(pickup, dropoff);
      const basePrice = 3.5;
      const pricePerKm = 1.5;
      let price = basePrice + distance * pricePerKm;

      // Apply first ride discount
      if (profile && !profile.first_ride_used) {
        price = 0;
      }

      setEstimatedPrice(Math.round(price * 100) / 100);
      setEstimatedDuration(Math.round(distance * 3)); // ~3 min per km
    }
  }, [pickup, dropoff, profile]);

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
    if (!pickup || !dropoff || !profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .insert({
          customer_id: profile.id,
          pickup_location: pickup,
          dropoff_location: dropoff,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          status: 'pending',
          price: estimatedPrice || 0,
          distance: calculateDistance(pickup, dropoff),
          duration: estimatedDuration || 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Fahrt angefragt!',
        description: 'Wir suchen einen Fahrer für dich...',
      });

      // Redirect to ride tracking would happen here
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
    <div className="h-screen flex flex-col">
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
          <div className="absolute top-4 left-4 right-4 bg-card/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-border">
            <p className="text-sm text-center">
              Tippe auf die Karte, um {selectingLocation === 'pickup' ? 'den Abholort' : 'das Ziel'} zu wählen
            </p>
          </div>
        )}
      </div>

      {/* Booking Panel */}
      <Card className="rounded-t-3xl border-t border-border bg-card animate-slide-up">
        <CardContent className="p-6 space-y-4">
          {/* Loyalty Info */}
          {profile && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-warning" />
                <span>{profile.loyalty_points} Punkte</span>
              </div>
              {!profile.first_ride_used && (
                <div className="flex items-center gap-2 text-primary">
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

          {/* Price Estimate */}
          {estimatedPrice !== null && estimatedDuration !== null && (
            <div className="flex items-center justify-between py-3 px-4 bg-secondary rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Geschätzte Ankunft</p>
                <p className="font-medium">{estimatedDuration} min</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Preis</p>
                <p className="font-bold text-xl">
                  {profile && !profile.first_ride_used ? (
                    <span className="text-primary">Gratis</span>
                  ) : (
                    `${estimatedPrice.toFixed(2)} €`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Book Button */}
          <Button
            className="w-full h-14 text-lg font-semibold"
            disabled={!pickup || !dropoff || loading}
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
