/**
 * Retour Stripe générique. Ne confirme JAMAIS un paiement ni une activation :
 * seul le webhook Stripe active, et l'espace Pro affiche l'état serveur réel.
 * Une visite manuelle de cette URL n'a aucun effet.
 */
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageCheckoutSuccess() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-16 space-y-6 text-center">
        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">Confirmation du paiement en cours</h1>
        <p className="text-base text-muted-foreground">
          Votre profil sera activé seulement lorsque Stripe aura confirmé le paiement. Votre espace Pro affichera l'état réel.
        </p>
        <div className="space-y-2">
          <Button size="lg" className="w-full h-12 rounded-xl" onClick={() => navigate("/pro")}>
            Voir l'état dans mon espace Pro
          </Button>
          <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => navigate("/")}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
