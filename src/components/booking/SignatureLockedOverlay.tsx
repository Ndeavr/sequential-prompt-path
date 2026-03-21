/**
 * Premium locked overlay shown when contractor doesn't have Signature plan.
 * Shows teaser content with upgrade CTA.
 */
import { Lock, Crown, Calendar, QrCode, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { PlanCode } from "@/hooks/useContractorPlan";

interface SignatureLockedOverlayProps {
  currentPlan: PlanCode;
  planLabel: string;
  variant?: "full" | "inline";
}

const FEATURES = [
  { icon: Calendar, label: "Page de réservation publique premium" },
  { icon: MapPin, label: "Moteur intelligent avec transport" },
  { icon: QrCode, label: "QR codes et liens de réservation" },
  { icon: Sparkles, label: "Recommandations IA par Alex" },
];

const PLAN_TEASERS: Record<string, { headline: string; sub: string }> = {
  recrue: {
    headline: "Découvrez la Réservation Signature",
    sub: "Transformez votre agenda en moteur de conversion intelligent.",
  },
  pro: {
    headline: "Passez à la Réservation Signature",
    sub: "Vos clients méritent une expérience de réservation premium.",
  },
  premium: {
    headline: "Débloquez la puissance Signature",
    sub: "Un lien qui réserve à votre place, optimisé par l'intelligence artificielle.",
  },
  elite: {
    headline: "Vous y êtes presque",
    sub: "Le plan Signature active le système de rendez-vous intelligent le plus avancé du marché.",
  },
};

export function SignatureLockedOverlay({
  currentPlan,
  planLabel,
  variant = "full",
}: SignatureLockedOverlayProps) {
  const navigate = useNavigate();
  const teaser = PLAN_TEASERS[currentPlan] ?? PLAN_TEASERS.recrue;

  if (variant === "inline") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-body font-semibold text-foreground">Disponible uniquement avec le plan Signature</p>
          <p className="text-meta text-muted-foreground mt-1">
            Votre plan actuel : <span className="font-medium text-foreground">{planLabel}</span>
          </p>
        </div>
        <Button onClick={() => navigate("/pricing")} className="gap-2">
          <Crown className="w-4 h-4" />
          Passer au plan Signature
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {teaser.headline}
          </h2>
          <p className="text-body text-muted-foreground leading-relaxed">
            {teaser.sub}
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-3 text-left max-w-xs mx-auto">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-meta text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Pitch */}
        <div className="rounded-xl bg-muted/50 border border-border/40 p-4">
          <p className="text-meta text-muted-foreground italic leading-relaxed">
            « Un simple lien informe. Une réservation Signature convertit. »
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            size="lg"
            onClick={() => navigate("/pricing")}
            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          >
            <Crown className="w-4 h-4" />
            Activer Réservation Signature
          </Button>
          <p className="text-caption text-muted-foreground">
            Plan actuel : <span className="font-medium">{planLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
