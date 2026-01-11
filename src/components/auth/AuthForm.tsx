import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  defaultRole?: 'customer' | 'driver';
}

export default function AuthForm({ defaultRole = 'customer' }: AuthFormProps) {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'customer' | 'driver'>(defaultRole);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password);
        toast({
          title: 'Willkommen zurück!',
          description: 'Du wurdest erfolgreich angemeldet.',
        });
      } else {
        await signUp(formData.email, formData.password, formData.name, formData.phone, role);
        toast({
          title: 'Konto erstellt!',
          description: 'Bitte bestätige deine E-Mail-Adresse.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Melde dich an, um fortzufahren' 
            : 'Erstelle ein neues Konto'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={role === 'customer' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('customer')}
                >
                  <User className="w-4 h-4 mr-2" />
                  Kunde
                </Button>
                <Button
                  type="button"
                  variant={role === 'driver' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setRole('driver')}
                >
                  <Car className="w-4 h-4 mr-2" />
                  Fahrer
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dein Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+49 123 456789"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="deine@email.de"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' 
                ? 'Noch kein Konto? Registrieren' 
                : 'Bereits ein Konto? Anmelden'}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
