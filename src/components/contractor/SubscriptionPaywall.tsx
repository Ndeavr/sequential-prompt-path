import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface SubscriptionPaywallProps {
  title?: string;
  message?: string;
}

const SubscriptionPaywall = ({
  title = "Abonnement requis",
  message = "Activez votre abonnement pour accéder aux demandes de clients.",
}: SubscriptionPaywallProps) => (
  <Card className="max-w-md mx-auto mt-12">
    <CardContent className="flex flex-col items-center text-center gap-4 py-8">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild>
        <Link to="/pro/billing">Voir les plans</Link>
      </Button>
    </CardContent>
  </Card>
);

export default SubscriptionPaywall;
