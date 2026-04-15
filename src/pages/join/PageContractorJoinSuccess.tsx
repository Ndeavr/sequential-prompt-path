import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Calendar, User } from "lucide-react";

export default function PageContractorJoinSuccess() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-green-500/20 rounded-full p-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Bienvenue chez UNPRO! 🎉</h1>
          <p className="text-muted-foreground text-sm">
            Votre compte entrepreneur est maintenant activé. Vous êtes prêt à recevoir vos premiers rendez-vous qualifiés.
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Prochaines étapes</h3>
            {[
              { icon: User, text: "Complétez votre profil public" },
              { icon: Calendar, text: "Configurez vos disponibilités" },
              { icon: ArrowRight, text: "Recevez vos premiers rendez-vous" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="bg-primary/10 rounded-full p-2">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{step.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={() => window.location.href = "/pro"}>
          Accéder à mon espace pro <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
