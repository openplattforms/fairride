import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import RideBooking from '@/components/customer/RideBooking';
import DriverDashboard from '@/components/driver/DriverDashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (role === 'driver') {
    return <DriverDashboard />;
  }

  return <RideBooking />;
};

export default Index;
