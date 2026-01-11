import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Car, MapPin, Star, Clock, Shield, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Heute 30% Rabatt auf alle Fahrten!</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dein Fahrdienst in deiner Stadt
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Schnell, sicher und zuverlässig. Buche deine Fahrt in Sekunden und verfolge deinen Fahrer in Echtzeit.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 rounded-xl"
              onClick={() => navigate('/app')}
            >
              <Car className="w-5 h-5 mr-2" />
              Jetzt Fahrt buchen
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 rounded-xl"
              onClick={() => navigate('/app?role=driver')}
            >
              Als Fahrer starten
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Schnelle Abholung</h3>
              <p className="text-muted-foreground text-sm">
                Fahrer in deiner Nähe sind innerhalb weniger Minuten bei dir.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Live-Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Verfolge deinen Fahrer in Echtzeit auf der Karte.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Sichere Zahlung</h3>
              <p className="text-muted-foreground text-sm">
                SEPA-Lastschrift für bequeme und sichere Bezahlung.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Promo Banner */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary to-primary/80 border-0 text-primary-foreground">
          <CardContent className="p-8 text-center">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">Erste Fahrt gratis!</h2>
            <p className="opacity-90 mb-4">
              Deine erste Fahrt unter 20€ ist komplett kostenlos. Registriere dich jetzt!
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => navigate('/app')}
            >
              Kostenlos registrieren
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-muted-foreground text-sm">
          <p>© 2026 RideApp. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </div>
  );
}
