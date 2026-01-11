import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, CreditCard, User } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RideHistoryItem {
  id: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  status: string;
  price: number;
  created_at: string;
  completed_at: string | null;
  customer_id: string;
}

interface CustomerSepaInfo {
  iban: string | null;
  cardholder_name: string | null;
  full_name: string | null;
}

interface Props {
  driverId: string;
}

export default function DriverHistory({ driverId }: Props) {
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<Record<string, CustomerSepaInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: ridesData } = await supabase
        .from('rides')
        .select('id, pickup_address, dropoff_address, status, price, created_at, completed_at, customer_id')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ridesData) {
        setRides(ridesData);

        // Fetch customer SEPA info for completed rides
        const customerIds = [...new Set(ridesData.map((r) => r.customer_id))];
        if (customerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, iban, cardholder_name, full_name')
            .in('user_id', customerIds);

          if (profiles) {
            const infoMap: Record<string, CustomerSepaInfo> = {};
            profiles.forEach((p) => {
              infoMap[p.user_id] = {
                iban: p.iban,
                cardholder_name: p.cardholder_name,
                full_name: p.full_name,
              };
            });
            setCustomerInfo(infoMap);
          }
        }
      }

      setLoading(false);
    };

    loadData();
  }, [driverId]);

  const formatIban = (iban: string | null): string => {
    if (!iban) return '—';
    // Show only last 4 characters for privacy
    return `****${iban.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500',
    };
    const labels: Record<string, string> = {
      completed: 'Abgeschlossen',
      cancelled: 'Storniert',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-muted text-muted-foreground'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
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
          Fahrthistorie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rides.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Noch keine abgeschlossenen Fahrten</p>
        ) : (
          rides.map((ride) => {
            const customer = customerInfo[ride.customer_id];
            const isCompleted = ride.status === 'completed';

            return (
              <div key={ride.id} className="p-4 bg-secondary/50 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-2">
                      {format(new Date(ride.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                    </p>
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
                    <p className="font-bold text-xl text-primary">{Number(ride.price).toFixed(2)} €</p>
                    {getStatusBadge(ride.status || '')}
                  </div>
                </div>

                {/* Customer SEPA Info for completed rides */}
                {isCompleted && customer && (
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.full_name || 'Kunde'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm mt-1">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {customer.cardholder_name || '—'} • IBAN: {formatIban(customer.iban)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
