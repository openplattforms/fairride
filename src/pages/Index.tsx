import { useAuth } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import CustomerDashboard from '@/components/customer/CustomerDashboard';
import DriverDashboard from '@/components/driver/DriverDashboard';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const Index = () => {
  const { user, role, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') === 'driver' ? 'driver' : 'customer';

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
    return <AuthForm defaultRole={requestedRole} />;
  }

  // IMPORTANT: Drivers ALWAYS go to DriverDashboard, never to customer panel
  if (role === 'driver') {
    return <DriverDashboard />;
  }

  return <CustomerDashboard />;
};

export default Index;
