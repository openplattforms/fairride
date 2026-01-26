import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import RideBooking from './RideBooking';
import RideTracking from './RideTracking';
import RideHistory from './RideHistory';
import MyRides from './MyRides';
import SepaForm from './SepaForm';
import LoyaltyPanel from '@/components/loyalty/LoyaltyPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, History, CreditCard, Star, User, Car } from 'lucide-react';

export default function CustomerDashboard() {
  const { user, profile, signOut } = useAuth();
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'booking' | 'history' | 'payment' | 'loyalty' | 'myrides' | null>(null);

  // Check for active ride on mount
  useEffect(() => {
    const checkActiveRide = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('rides')
        .select('id')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'accepted', 'arriving', 'in_progress'])
        .maybeSingle();

      if (data) {
        setActiveRideId(data.id);
      }
    };

    checkActiveRide();
  }, [user]);

  // Subscribe to ride status changes
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('customer-rides')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
        filter: `customer_id=eq.${user.id}`,
      }, (payload) => {
        const newStatus = payload.new.status;
        if (['completed', 'cancelled'].includes(newStatus)) {
          setActiveRideId(null);
        } else if (['pending', 'accepted', 'arriving', 'in_progress'].includes(newStatus)) {
          setActiveRideId(payload.new.id);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: `customer_id=eq.${user.id}`,
      }, (payload) => {
        setActiveRideId(payload.new.id);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleRideComplete = () => {
    setActiveRideId(null);
  };

  const handleMenuAction = (panel: typeof activePanel) => {
    setActivePanel(panel);
    setMenuOpen(false);
  };

  // Show tracking if there's an active ride
  if (activeRideId) {
    return <RideTracking rideId={activeRideId} onCancel={handleRideComplete} />;
  }

  // Show sub-panels
  if (activePanel === 'history') {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => setActivePanel(null)}>
          ← Zurück
        </Button>
        <RideHistory />
      </div>
    );
  }

  if (activePanel === 'myrides') {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => setActivePanel(null)}>
          ← Zurück
        </Button>
        <MyRides />
      </div>
    );
  }

  if (activePanel === 'payment') {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => setActivePanel(null)}>
          ← Zurück
        </Button>
        <SepaForm />
      </div>
    );
  }

  if (activePanel === 'loyalty') {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" className="mb-4" onClick={() => setActivePanel(null)}>
          ← Zurück
        </Button>
        <LoyaltyPanel />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Menu Button */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-50 rounded-full bg-card/95 backdrop-blur-sm shadow-lg"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="py-6 space-y-6">
            {/* Profile Section */}
            <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{profile?.full_name || 'Kunde'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleMenuAction('myrides')}
              >
                <Car className="w-5 h-5 mr-3" />
                Meine Fahrten
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleMenuAction('history')}
              >
                <History className="w-5 h-5 mr-3" />
                Fahrtverlauf
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleMenuAction('payment')}
              >
                <CreditCard className="w-5 h-5 mr-3" />
                Zahlungsmethode
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleMenuAction('loyalty')}
              >
                <Star className="w-5 h-5 mr-3" />
                Treueprogramm
              </Button>
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={signOut}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Abmelden
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RideBooking />
    </div>
  );
}
