import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Location } from '@/types/ride';
import MapView from '@/components/map/MapView';
import { Phone, MessageCircle, X, Car, Clock, MapPin } from 'lucide-react';

interface RideTrackingProps {
  rideId: string;
  onCancel: () => void;
}

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

interface DriverInfo {
  full_name: string | null;
  phone: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  rating: number;
}

export default function RideTracking({ rideId, onCancel }: RideTrackingProps) {
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);

  // Subscribe to ride updates
  useEffect(() => {
    const fetchRide = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();
      
      if (data) {
        setRide(data as RideData);
        if (data.driver_id) {
          fetchDriverInfo(data.driver_id);
        }
      }
    };

    fetchRide();

    const subscription = supabase
      .channel(`ride-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `id=eq.${rideId}`,
      }, (payload) => {
        setRide(payload.new as RideData);
        if (payload.new.driver_id && !driverInfo) {
          fetchDriverInfo(payload.new.driver_id);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [rideId]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!ride?.driver_id) return;

    const fetchInitialLocation = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('latitude, longitude, speed')
        .eq('driver_id', ride.driver_id)
        .single();
      
      if (data) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
        setSpeed(data.speed || 0);
      }
    };

    fetchInitialLocation();

    const subscription = supabase
      .channel(`driver-location-${ride.driver_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_locations',
        filter: `driver_id=eq.${ride.driver_id}`,
      }, (payload) => {
        const newData = payload.new as any;
        const newLocation = { lat: newData.latitude, lng: newData.longitude };
        
        setDriverLocation(newLocation);
        setSpeed(newData.speed || 0);
        
        // Calculate ETA
        if (ride) {
          const targetLocation = ride.status === 'arriving' 
            ? { lat: ride.pickup_lat, lng: ride.pickup_lng }
            : { lat: ride.dropoff_lat, lng: ride.dropoff_lng };
          const distance = calculateDistance(newLocation, targetLocation);
          setEta(Math.round(distance * 3)); // ~3 min per km
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [ride?.driver_id, ride?.status]);

  const fetchDriverInfo = async (driverId: string) => {
    // First get driver data
    const { data: driverData } = await supabase
      .from('drivers')
      .select('user_id, vehicle_model, vehicle_plate, rating')
      .eq('id', driverId)
      .single();
    
    if (driverData) {
      // Then get profile for name/phone
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', driverData.user_id)
        .single();

      setDriverInfo({
        full_name: profileData?.full_name || 'Fahrer',
        phone: profileData?.phone || '',
        vehicle_model: driverData.vehicle_model,
        vehicle_plate: driverData.vehicle_plate,
        rating: Number(driverData.rating) || 5.0,
      });
    }
  };

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

  const handleCancelRide = async () => {
    await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideId);
    onCancel();
  };

  const getStatusText = () => {
    switch (ride?.status) {
      case 'pending':
        return 'Suche nach Fahrer...';
      case 'accepted':
        return 'Fahrer gefunden!';
      case 'arriving':
        return 'Fahrer ist unterwegs zu dir';
      case 'in_progress':
        return 'Fahrt läuft';
      case 'completed':
        return 'Fahrt abgeschlossen';
      default:
        return 'Status unbekannt';
    }
  };

  if (!ride) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <Car className="w-16 h-16 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Lade Fahrtdetails...</p>
        </div>
      </div>
    );
  }

  const pickupLocation: Location = { lat: ride.pickup_lat, lng: ride.pickup_lng };
  const dropoffLocation: Location = { lat: ride.dropoff_lat, lng: ride.dropoff_lng };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={driverLocation || pickupLocation}
          pickup={pickupLocation}
          dropoff={dropoffLocation}
          driverLocation={driverLocation}
          showRoute
          className="h-full"
        />

        {/* Status Badge */}
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-card/95 backdrop-blur-sm px-4 py-3 rounded-xl border border-border shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <span className="font-medium">{getStatusText()}</span>
              </div>
              {eta && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">{eta} min</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Speed indicator */}
        {speed !== null && ride.status !== 'pending' && (
          <div className="absolute top-20 right-4 bg-card/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-border shadow-lg">
            <p className="text-xl font-bold">{Math.round(speed)} km/h</p>
          </div>
        )}
      </div>

      {/* Driver Info Panel */}
      <Card className="rounded-t-3xl border-t border-border bg-card shadow-2xl animate-slide-up">
        <CardContent className="p-6 space-y-4">
          {driverInfo ? (
            <>
              {/* Driver Details */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-secondary rounded-full flex items-center justify-center">
                  <Car className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{driverInfo.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {driverInfo.vehicle_model} • {driverInfo.vehicle_plate}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{driverInfo.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" className="rounded-full">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Route Info */}
              <div className="space-y-3 py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full mt-1.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Abholung</p>
                    <p className="font-medium">{ride.pickup_address || 'Abholort'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-destructive mt-1" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ziel</p>
                    <p className="font-medium">{ride.dropoff_address || 'Zielort'}</p>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between py-3 px-4 bg-secondary rounded-xl">
                <span className="text-muted-foreground">Preis</span>
                <span className="font-bold text-2xl">{Number(ride.price).toFixed(2)} €</span>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Suche nach verfügbaren Fahrern...</p>
            </div>
          )}

          {/* Cancel Button */}
          {ride.status === 'pending' && (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleCancelRide}
            >
              <X className="w-4 h-4 mr-2" />
              Fahrt stornieren
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
