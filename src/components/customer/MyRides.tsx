import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, Calendar, X, Loader2 } from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ScheduledRide {
  id: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  status: string;
  price: number;
  scheduled_time: string | null;
  created_at: string;
}

export default function MyRides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const loadRides = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('rides')
        .select('id, pickup_address, dropoff_address, status, price, scheduled_time, created_at')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'accepted', 'arriving', 'in_progress'])
        .order('created_at', { ascending: false });

      if (data) {
        setRides(data);
      }
      setLoading(false);
    };

    loadRides();

    // Subscribe to changes
    const subscription = supabase
      .channel('my-rides')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rides',
        filter: `customer_id=eq.${user?.id}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setRides(prev => prev.filter(r => r.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          const newRide = payload.new as ScheduledRide;
          if (['completed', 'cancelled'].includes(newRide.status)) {
            setRides(prev => prev.filter(r => r.id !== newRide.id));
          } else {
            setRides(prev => prev.map(r => r.id === newRide.id ? newRide : r));
          }
        } else if (payload.eventType === 'INSERT') {
          setRides(prev => [payload.new as ScheduledRide, ...prev]);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleCancelRide = async (rideId: string) => {
    setCancellingId(rideId);
    
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', rideId);

    if (!error) {
      toast({
        title: 'Fahrt storniert',
        description: 'Deine Fahrt wurde erfolgreich storniert.',
      });
      setRides(prev => prev.filter(r => r.id !== rideId));
    } else {
      toast({
        title: 'Fehler',
        description: 'Die Fahrt konnte nicht storniert werden.',
        variant: 'destructive',
      });
    }
    
    setCancellingId(null);
  };

  const canCancel = (ride: ScheduledRide) => {
    // Can always cancel pending rides
    if (ride.status === 'pending') return true;
    // Can cancel scheduled rides if they're in the future
    if (ride.scheduled_time && isFuture(parseISO(ride.scheduled_time))) return true;
    // Can cancel accepted rides (with fee shown)
    if (ride.status === 'accepted') return true;
    return false;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Suche Fahrer...',
      accepted: 'Fahrer unterwegs',
      arriving: 'Fahrer kommt an',
      in_progress: 'Fahrt läuft',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-500',
      accepted: 'bg-blue-500',
      arriving: 'bg-primary',
      in_progress: 'bg-green-500',
    };
    return colorMap[status] || 'bg-muted-foreground';
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-secondary rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Meine Fahrten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rides.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Keine aktiven oder geplanten Fahrten
          </p>
        ) : (
          rides.map((ride) => (
            <div key={ride.id} className="p-4 bg-secondary/50 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(ride.status)} animate-pulse`} />
                    <span className="text-sm font-medium">{getStatusText(ride.status)}</span>
                  </div>

                  {/* Scheduled time */}
                  {ride.scheduled_time && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Geplant: {format(parseISO(ride.scheduled_time), 'dd. MMM yyyy, HH:mm', { locale: de })}
                      </span>
                    </div>
                  )}

                  {/* Route */}
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />
                    <p className="text-sm truncate">{ride.pickup_address || 'Abholort'}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 text-destructive mt-1 shrink-0" />
                    <p className="text-sm truncate">{ride.dropoff_address || 'Zielort'}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-lg">{Number(ride.price).toFixed(2)} €</p>
                </div>
              </div>

              {/* Cancel button */}
              {canCancel(ride) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={cancellingId === ride.id}
                    >
                      {cancellingId === ride.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Stornieren
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Fahrt stornieren?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {ride.status === 'pending'
                          ? 'Diese Stornierung ist kostenlos, da noch kein Fahrer zugewiesen wurde.'
                          : 'Möglicherweise fällt eine Stornierungsgebühr an, da bereits ein Fahrer zugewiesen wurde.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleCancelRide(ride.id)}>
                        Stornieren
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
