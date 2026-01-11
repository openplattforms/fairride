import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Location } from '@/types/ride';
import { MapPin, Navigation, Clock } from 'lucide-react';

type RideRequestRide = {
  id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  price: number;
  duration_minutes: number | null;
};

interface RideRequestProps {
  ride: RideRequestRide;
  currentLocation: Location | null;
  onAccept: () => void;
  onDecline?: () => void;
}

export default function RideRequest({ ride, currentLocation, onAccept, onDecline }: RideRequestProps) {
  const calculateDistanceKm = (from: Location, to: Location): number => {
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const pickupLoc: Location = { lat: ride.pickup_lat, lng: ride.pickup_lng };

  const distanceToPickup = currentLocation ? calculateDistanceKm(currentLocation, pickupLoc) : null;
  const durationMin = ride.duration_minutes ?? 0;

  return (
    <Card className="border-border bg-secondary/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-primary rounded-full mt-2" />
              <div>
                <p className="text-xs text-muted-foreground">Abholung</p>
                <p className="text-sm font-medium line-clamp-1">{ride.pickup_address || 'Abholort'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3 h-3 text-destructive mt-1.5" />
              <div>
                <p className="text-xs text-muted-foreground">Ziel</p>
                <p className="text-sm font-medium line-clamp-1">{ride.dropoff_address || 'Zielort'}</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{Number(ride.price).toFixed(2)} €</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3" />
              <span>{durationMin} min</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {distanceToPickup !== null ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4" />
              <span>{distanceToPickup.toFixed(1)} km entfernt</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onDecline && (
              <Button variant="outline" onClick={onDecline}>
                Ablehnen
              </Button>
            )}
            <Button onClick={onAccept} className="px-6">
              Annehmen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
