import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DriverDashboard from '@/components/driver/DriverDashboard';
import { Loader2 } from 'lucide-react';

/**
 * Dedicated driver route - only accessible to users with driver role.
 * Customers are redirected to customer app.
 */
export default function Driver() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // Not logged in -> redirect to login with driver role preset
      if (!user) {
        navigate('/app?role=driver', { replace: true });
        return;
      }

      // Customer trying to access driver route -> redirect to customer app
      if (role === 'customer') {
        navigate('/app', { replace: true });
        return;
      }
    }
  }, [user, role, loading, navigate]);

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

  // Only show driver dashboard if user is a driver
  if (role === 'driver') {
    return <DriverDashboard />;
  }

  // Fallback loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
