import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { Gift, Star, Trophy, Zap } from 'lucide-react';

const rewards = [
  { id: '1', name: '10% Rabatt', points: 100, icon: Gift },
  { id: '2', name: '20% Rabatt', points: 250, icon: Star },
  { id: '3', name: '50% Rabatt', points: 500, icon: Trophy },
  { id: '4', name: 'Gratis Fahrt', points: 1000, icon: Zap },
];

export default function LoyaltyPanel() {
  const { profile } = useAuth();

  if (!profile) return null;

  const currentPoints = profile.loyalty_points;
  const nextReward = rewards.find(r => r.points > currentPoints) || rewards[rewards.length - 1];
  const progress = nextReward ? (currentPoints / nextReward.points) * 100 : 100;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-warning" />
          Treueprogramm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Points */}
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{currentPoints}</p>
          <p className="text-muted-foreground">Punkte gesammelt</p>
        </div>

        {/* First Ride Bonus */}
        {!profile.first_ride_used && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <Gift className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold text-primary">Erste Fahrt gratis!</p>
            <p className="text-sm text-muted-foreground">Dein Willkommensgeschenk wartet</p>
          </div>
        )}

        {/* Progress to next reward */}
        {nextReward && currentPoints < nextReward.points && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nächste Belohnung</span>
              <span className="font-medium">{nextReward.name}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Noch {nextReward.points - currentPoints} Punkte
            </p>
          </div>
        )}

        {/* Available Rewards */}
        <div className="space-y-3">
          <h4 className="font-semibold">Belohnungen</h4>
          <div className="grid gap-2">
            {rewards.map(reward => {
              const Icon = reward.icon;
              const isAvailable = currentPoints >= reward.points;
              
              return (
                <div
                  key={reward.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isAvailable 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">{reward.name}</p>
                      <p className="text-xs text-muted-foreground">{reward.points} Punkte</p>
                    </div>
                  </div>
                  {isAvailable && (
                    <Button size="sm" variant="outline">
                      Einlösen
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fahrten insgesamt</span>
            <span className="font-medium">{profile.total_rides}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
