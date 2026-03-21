/**
 * Banner shown when a contractor had Signature but downgraded.
 * Their data is preserved but booking is disabled.
 */
import { AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function SignatureDowngradeBanner() {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 text-warning" />
        </div>
        <div className="space-y-1">
          <p className="text-body font-semibold text-foreground">
            Votre système Signature est en pause
          </p>
          <p className="text-meta text-muted-foreground leading-relaxed">
            Vos paramètres et types de rendez-vous sont conservés. Réactivez votre plan pour remettre vos réservations en ligne.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => navigate("/pricing")}
        className="gap-2 w-full sm:w-auto"
      >
        <Crown className="w-4 h-4" />
        Réactiver le plan Signature
      </Button>
    </div>
  );
}
