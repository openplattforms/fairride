import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, MapPin, Car, CreditCard, Calendar } from 'lucide-react';
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
  distance_km: number | null;
  promo_discount: number | null;
  promo_type: string | null;
  first_ride_discount: boolean;
}

interface TransactionItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  iban_last4: string | null;
  cardholder_name: string | null;
}

export default function RideHistory() {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rides' | 'transactions'>('rides');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const [ridesRes, transRes] = await Promise.all([
        supabase
          .from('rides')
          .select('id, pickup_address, dropoff_address, status, price, created_at, completed_at, distance_km, promo_discount, promo_type, first_ride_discount')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('sepa_transactions')
          .select('id, amount, status, created_at, iban_last4, cardholder_name')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (ridesRes.data) setRides(ridesRes.data);
      if (transRes.data) setTransactions(transRes.data);
      setLoading(false);
    };

    loadData();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500',
      pending: 'bg-yellow-500/10 text-yellow-500',
      in_progress: 'bg-blue-500/10 text-blue-500',
    };
    const labels: Record<string, string> = {
      completed: 'Abgeschlossen',
      cancelled: 'Storniert',
      pending: 'Wartend',
      in_progress: 'Unterwegs',
      accepted: 'Akzeptiert',
      arriving: 'Ankunft',
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
              <div key={i} className="h-20 bg-secondary rounded-lg" />
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
          Verlauf
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'rides' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
            onClick={() => setActiveTab('rides')}
          >
            Fahrten
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'transactions' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
            onClick={() => setActiveTab('transactions')}
          >
            Transaktionen
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeTab === 'rides' ? (
          rides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Noch keine Fahrten</p>
          ) : (
            rides.map((ride) => (
              <div key={ride.id} className="p-4 bg-secondary/50 rounded-xl space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ride.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                      </span>
                    </div>
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
                    {getStatusBadge(ride.status || '')}
                    {ride.first_ride_discount && (
                      <p className="text-xs text-primary mt-1">Gratis Fahrt</p>
                    )}
                    {ride.promo_discount && Number(ride.promo_discount) > 0 && (
                      <p className="text-xs text-primary mt-1">-{Number(ride.promo_discount).toFixed(2)} € Rabatt</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Noch keine Transaktionen</p>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="p-4 bg-secondary/50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{Number(tx.amount).toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.iban_last4 ? `****${tx.iban_last4}` : 'SEPA'} • {tx.cardholder_name || 'Kontoinhaber'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(tx.status || 'pending')}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(tx.created_at), 'dd.MM.yy', { locale: de })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
