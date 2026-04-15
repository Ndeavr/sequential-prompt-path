import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock } from "lucide-react";

export default function PageContractorJoinCheckout() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Finaliser votre inscription</h1>
          <p className="text-sm text-muted-foreground">Complétez vos informations pour activer votre compte UNPRO</p>
        </div>

        {/* Identity */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">Informations de l'entreprise</h3>
            <div className="space-y-3">
              <div><Label className="text-xs">Nom de l'entreprise</Label><Input placeholder="Votre entreprise" /></div>
              <div><Label className="text-xs">Nom du propriétaire</Label><Input placeholder="Prénom Nom" /></div>
              <div><Label className="text-xs">Courriel</Label><Input type="email" placeholder="email@entreprise.ca" /></div>
              <div><Label className="text-xs">Téléphone</Label><Input placeholder="450-555-0000" /></div>
              <div><Label className="text-xs">Numéro RBQ (optionnel)</Label><Input placeholder="1234-5678-90" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Paiement sécurisé</h3>
            <p className="text-xs text-muted-foreground">
              Le paiement sera traité via Stripe. Vous serez redirigé vers une page de paiement sécurisée.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Module de paiement Stripe</p>
              <p className="text-xs text-muted-foreground mt-1">Prêt à connecter</p>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full">
          Confirmer et payer
        </Button>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Chiffrement SSL • Annulation flexible • Aucun engagement à long terme
        </p>
      </div>
    </div>
  );
}
