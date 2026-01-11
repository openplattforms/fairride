import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { Ride, Location } from '@/types/ride';
import MapView from '@/components/map/MapView';
import RideRequest from './RideRequest';
import ActiveRide from './ActiveRide';
import { Power, MapPin, Star, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const { location: currentLocation } = useGeolocation(true);
  const { toast } = useToast();

  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [pendingRides, setPendingRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayRides, setTodayRides] = useState(0);

  // Fetch driver info
  useEffect(() => {
    const fetchDriver = async () => {
      if (!profile) return;

      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (data) {
        setDriverId(data.id);
        setIsOnline(data.is_online);
      }
    };

    fetchDriver();
  }, [profile]);

  // Update driver location continuously
  useEffect(() => {
    if (!driverId || !currentLocation || !isOnline) return;

    const updateLocation = async () => {
      await supabase
        .from('driver_locations')
        .upsert({
          driver_id: driverId,
          location: currentLocation,
          updated_at: new Date().toISOString(),
        });
    };

    updateLocation();
    const interval = setInterval(updateLocation, 5000);

    return () => clearInterval(interval);
  }, [driverId, currentLocation, isOnline]);

  // Subscribe to new ride requests
  useEffect(() => {
    if (!driverId || !isOnline) return;

    const fetchPendingRides = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null);

      if (data) {
        setPendingRides(data as any);
      }
    };

    fetchPendingRides();

    const subscription = supabase
      .channel('pending-rides')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          setPendingRides(prev => [...prev, payload.new as any]);
          toast({
            title: 'Neue Fahrtanfrage!',
            description: 'Eine neue Fahrt wartet auf dich.',
          });
        } else if (payload.eventType === 'UPDATE') {
          setPendingRides(prev => prev.filter(r => r.id !== payload.new.id));
          if (payload.new.driver_id === driverId) {
            setActiveRide(payload.new as any);
          }
        } else if (payload.eventType === 'DELETE') {
          setPendingRides(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [driverId, isOnline, toast]);

  // Check for active ride
  useEffect(() => {
    if (!driverId) return;

    const checkActiveRide = async () => {
      const { data } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'arriving', 'in_progress'])
        .single();

      if (data) {
        setActiveRide(data as any);
      }
    };

    checkActiveRide();
  }, [driverId]);

  // Fetch today's stats
  useEffect(() => {
    if (!driverId) return;

    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('rides')
        .select('price')
        .eq('driver_id', driverId)
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString());

      if (data) {
        setTodayRides(data.length);
        setTodayEarnings(data.reduce((sum, ride) => sum + ride.price, 0));
      }
    };

    fetchStats();
  }, [driverId, activeRide]);

  const toggleOnline = async () => {
    if (!driverId) return;

    const newStatus = !isOnline;
    await supabase
      .from('drivers')
      .update({ is_online: newStatus })
      .eq('id', driverId);

    setIsOnline(newStatus);
    toast({
      title: newStatus ? 'Du bist jetzt online' : 'Du bist jetzt offline',
      description: newStatus 
        ? 'Du kannst jetzt Fahrtanfragen empfangen.'
        : 'Du empfängst keine neuen Anfragen mehr.',
    });
  };

  const handleAcceptRide = async (ride: Ride) => {
    if (!driverId) return;

    const { error } = await supabase
      .from('rides')
      .update({
        driver_id: driverId,
        status: 'accepted',
      })
      .eq('id', ride.id)
      .eq('status', 'pending');

    if (!error) {
      setActiveRide({ ...ride, driver_id: driverId, status: 'accepted' });
      setPendingRides(prev => prev.filter(r => r.id !== ride.id));
      toast({
        title: 'Fahrt angenommen!',
        description: 'Navigiere zum Abholort.',
      });
    }
  };

  const handleRideComplete = () => {
    setActiveRide(null);
  };

  if (activeRide) {
    return (
      <ActiveRide
        ride={activeRide}
        driverId={driverId!}
        currentLocation={currentLocation}
        onComplete={handleRideComplete}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          center={currentLocation || { lat: 52.52, lng: 13.405 }}
          className="h-full"
        />

        {/* Online Toggle */}
        <div className="absolute top-4 left-4 right-4">
          <Card className="bg-card/90 backdrop-blur-sm border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <Switch
                  checked={isOnline}
                  onCheckedChange={toggleOnline}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current location indicator */}
        {currentLocation && (
          <div className="absolute bottom-32 right-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span>GPS aktiv</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats & Requests Panel */}
      <Card className="rounded-t-3xl border-t border-border bg-card animate-slide-up">
        <CardContent className="p-6 space-y-4">
          {/* Today's Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Heute verdient</span>
              </div>
              <p className="text-2xl font-bold">{todayEarnings.toFixed(2)} €</p>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Star className="w-4 h-4" />
                <span className="text-sm">Fahrten heute</span>
              </div>
              <p className="text-2xl font-bold">{todayRides}</p>
            </div>
          </div>

          {/* Pending Rides */}
          {isOnline && pendingRides.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Neue Anfragen</h3>
              {pendingRides.slice(0, 3).map(ride => (
                <RideRequest
                  key={ride.id}
                  ride={ride}
                  currentLocation={currentLocation}
                  onAccept={() => handleAcceptRide(ride)}
                />
              ))}
            </div>
          )}

          {isOnline && pendingRides.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Power className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Warte auf neue Fahrtanfragen...</p>
            </div>
          )}

          {!isOnline && (
            <div className="text-center py-8">
              <Button onClick={toggleOnline} size="lg" className="px-8">
                <Power className="w-5 h-5 mr-2" />
                Online gehen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
