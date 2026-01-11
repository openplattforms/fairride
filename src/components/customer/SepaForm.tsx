import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SepaForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    iban: '',
    cardholder_name: '',
  });

  useEffect(() => {
    const loadSepaData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('iban, cardholder_name')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFormData({
          iban: data.iban || '',
          cardholder_name: data.cardholder_name || '',
        });
        if (data.iban) {
          setSaved(true);
        }
      }
    };

    loadSepaData();
  }, [user]);

  const formatIban = (value: string): string => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Group into blocks of 4
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIban(e.target.value);
    setFormData(prev => ({ ...prev, iban: formatted }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          iban: formData.iban.replace(/\s/g, ''), // Store without spaces
          cardholder_name: formData.cardholder_name,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSaved(true);
      toast({
        title: 'Zahlungsdaten gespeichert',
        description: 'Deine SEPA-Daten wurden sicher gespeichert.',
      });
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
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Zahlungsmethode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardholder">Kontoinhaber</Label>
            <Input
              id="cardholder"
              value={formData.cardholder_name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, cardholder_name: e.target.value }));
                setSaved(false);
              }}
              placeholder="Max Mustermann"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={formData.iban}
              onChange={handleIbanChange}
              placeholder="DE89 3704 0044 0532 0130 00"
              required
              maxLength={27}
            />
            <p className="text-xs text-muted-foreground">
              Deine Bankdaten werden sicher verschlüsselt gespeichert.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || saved}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saved ? (
              <Check className="w-4 h-4 mr-2" />
            ) : null}
            {saved ? 'Gespeichert' : 'Speichern'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
