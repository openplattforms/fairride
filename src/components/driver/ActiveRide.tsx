import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/ride';
import MapView from '@/components/map/MapView';
import { Navigation, Phone, MapPin, CheckCircle, ArrowRight, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RideData {
  id: string;
  customer_id: string;
  driver_id: string | null;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string | null;
  status: string;
  price: number;
}

interface ActiveRideProps {
  ride: RideData;
  driverId: string;
  currentLocation: Location | null;
  onComplete: () => void;
}

export default function ActiveRide({ ride, driverId, currentLocation, onComplete }: ActiveRideProps) {
  const { toast } = useToast();
  const [rideState, setRideState] = useState(ride);
  const [customerInfo, setCustomerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [lastLocation, setLastLocation] = useState<Location | null>(null);
  const [lastTime, setLastTime] = useState<number>(Date.now());

  // Fetch customer info
  useEffect(() => {
    const fetchCustomer = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', ride.customer_id)
        .single();

      if (data) {
        setCustomerInfo({
          name: data.full_name || 'Kunde',
          phone: data.phone || ''
        });
      }
    };

    fetchCustomer();
  }, [ride.customer_id]);

  // Calculate speed and ETA
  useEffect(() => {
    if (!currentLocation) return;

    if (lastLocation) {
      const distance = calculateDistance(lastLocation, currentLocation) * 1000; // meters
      const timeElapsed = (Date.now() - lastTime) / 1000; // seconds
      if (timeElapsed > 0) {
        const currentSpeed = (distance / timeElapsed) * 3.6; // km/h
        setSpeed(Math.round(currentSpeed));
      }
    }

    setLastLocation(currentLocation);
    setLastTime(Date.now());

    // Calculate ETA
    const targetLocation = rideState.status === 'arriving' || rideState.status === 'accepted'
      ? { lat: rideState.pickup_lat, lng: rideState.pickup_lng }
      : { lat: rideState.dropoff_lat, lng: rideState.dropoff_lng };

    const distance = calculateDistance(currentLocation, targetLocation);
    setEta(Math.round(distance * 3)); // ~3 min per km
  }, [currentLocation, rideState.status]);

  // Update driver location in database
  useEffect(() => {
    if (!currentLocation) return;

    const updateLocation = async () => {
      await supabase
        .from('driver_locations')
        .upsert({
          driver_id: driverId,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          speed: speed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'driver_id' });
    };

    updateLocation();
  }, [currentLocation, driverId, speed]);

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

  const updateRideStatus = async (status: string) => {
    const updates: any = { status };
    
    if (status === 'in_progress') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('rides')
      .update(updates)
      .eq('id', ride.id);

    if (!error) {
      setRideState(prev => ({ ...prev, ...updates }));

      if (status === 'completed') {
        // Award loyalty points to customer
        await supabase.rpc('award_loyalty_points', {
          p_user_id: ride.customer_id,
          p_points: Math.floor(Number(ride.price) * 10),
        });

        toast({
          title: 'Fahrt abgeschlossen!',
          description: `Du hast ${Number(ride.price).toFixed(2)} € verdient.`,
        });
        onComplete();
      } else if (status === 'arriving') {
        toast({
          title: 'Status aktualisiert',
          description: 'Der Kunde wurde benachrichtigt.',
        });
      } else if (status === 'in_progress') {
        toast({
          title: 'Fahrt gestartet',
          description: 'Navigiere zum Zielort.',
        });
      }
    }
  };

  const getNextAction = () => {
    switch (rideState.status) {
      case 'accepted':
        return { label: 'Zum Abholort navigieren', status: 'arriving' };
      case 'arriving':
        return { label: 'Kunde abgeholt', status: 'in_progress' };
      case 'in_progress':
        return { label: 'Fahrt abschließen', status: 'completed' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const pickupLocation: Location = { lat: ride.pickup_lat, lng: ride.pickup_lng };
  const dropoffLocation: Location = { lat: ride.dropoff_lat, lng: ride.dropoff_lng };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={currentLocation || pickupLocation}
          pickup={pickupLocation}
          dropoff={dropoffLocation}
          driverLocation={currentLocation}
          showRoute
          className="h-full"
        />

        {/* Speed and ETA */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <div className="bg-card/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-border shadow-lg">
            <p className="text-2xl font-bold">{speed} km/h</p>
          </div>
          {eta !== null && (
            <div className="bg-card/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-border shadow-lg">
              <p className="text-sm text-muted-foreground">Ankunft in</p>
              <p className="text-xl font-bold">{eta} min</p>
            </div>
          )}
        </div>
      </div>

      {/* Ride Info Panel */}
      <Card className="rounded-t-3xl border-t border-border bg-card shadow-2xl animate-slide-up">
        <CardContent className="p-6 space-y-4">
          {/* Customer Info */}
          {customerInfo && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{customerInfo.name}</h3>
                  <p className="text-sm text-muted-foreground">Kunde</p>
                </div>
              </div>
              <Button size="icon" variant="outline" className="rounded-full">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Route */}
          <div className="space-y-3 py-3 border-t border-b border-border">
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1.5 ${
                rideState.status === 'arriving' || rideState.status === 'accepted' 
                  ? 'bg-primary animate-pulse' 
                  : 'bg-muted-foreground'
              }`} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Abholung</p>
                <p className="font-medium">{ride.pickup_address || 'Abholort'}</p>
              </div>
              {(rideState.status === 'arriving' || rideState.status === 'accepted') && (
                <Navigation className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex items-start gap-3">
              <MapPin className={`w-4 h-4 mt-1 ${
                rideState.status === 'in_progress' 
                  ? 'text-primary animate-pulse' 
                  : 'text-destructive'
              }`} />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Ziel</p>
                <p className="font-medium">{ride.dropoff_address || 'Zielort'}</p>
              </div>
              {rideState.status === 'in_progress' && (
                <Navigation className="w-5 h-5 text-primary" />
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Verdienst</span>
            <span className="text-2xl font-bold text-primary">{Number(ride.price).toFixed(2)} €</span>
          </div>

          {/* Action Button */}
          {nextAction && (
            <Button
              className="w-full h-14 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]"
              onClick={() => updateRideStatus(nextAction.status)}
            >
              {nextAction.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              {nextAction.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
