/**
 * UNPRO — Écran de décision d'offre.
 * Affiche UNIQUEMENT ce que le serveur a calculé :
 *  - 12 mois gratuits (avec le nombre réel de places restantes) ;
 *  - Activation Express 350 $ ;
 *  - aucune offre active ;
 *  - ou une demande de précision quand la catégorie n'est pas reconnue.
 * Aucun chiffre inventé, aucun faux bouton, aucun cul-de-sac.
 */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  freeOfferScarcitySentence,
  type ContractorOfferDecision,
} from "@/lib/offers/resolveContractorOffer";

export const EXPRESS_350_VALUE_POINTS = [
  "Nettoyage complet de votre profil d'entreprise",
  "Vérification de vos services et de votre territoire",
  "Profil UNPRO prêt à publier",
  "Configuration de votre calendrier de rendez-vous",
  "Plan d'action de 30 jours",
] as const;

interface OfferDecisionCardProps {
  decision: ContractorOfferDecision;
  city: string | null | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAcceptFree: () => void;
  onAcceptExpress: () => void;
  onPrecise?: () => void;
  busy?: boolean;
}

export default function OfferDecisionCard({
  decision,
  city,
  loading,
  error,
  onRetry,
  onAcceptFree,
  onAcceptExpress,
  onPrecise,
  busy = false,
}: OfferDecisionCardProps) {
  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Vérification de votre admissibilité…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Impossible de vérifier votre admissibilité
          </h2>
          <p className="text-sm text-muted-foreground">
            Rien n'a été modifié à votre dossier. Réessayez dans un instant.
          </p>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (decision.offer === "free_founding") {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Votre profil est admissible à l'offre de lancement
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {freeOfferScarcitySentence(decision.cityRemaining, city)}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Aucun paiement et aucune carte de crédit. Votre profil doit être complété
            et votre calendrier connecté pour devenir admissible aux recommandations.
          </p>
          <Button onClick={onAcceptFree} disabled={busy} className="w-full gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
            Activer mes 12 mois gratuits
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (decision.offer === "express_350") {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Activation Express — 350 $</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Paiement unique, sans renouvellement automatique.
              {decision.reason === "city_full" && city
                ? ` Les 10 places de lancement à ${city} sont comblées.`
                : ""}
            </p>
          </div>
          <ul className="space-y-2">
            {EXPRESS_350_VALUE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
          <Button onClick={onAcceptExpress} disabled={busy} className="w-full gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            )}
            Continuer vers l'activation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (decision.offer === "none") {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Aucune offre active pour votre profession
          </h2>
          <p className="text-sm text-muted-foreground">
            UNPRO n'ouvre pas encore d'activation pour votre profession. Votre intérêt
            est noté et nous vous écrirons dès qu'une offre sera disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Précisons votre service principal</h2>
        <p className="text-sm text-muted-foreground">
          Nous n'avons pas reconnu votre service principal avec certitude. Indiquez-le
          pour connaître l'offre qui s'applique réellement à votre entreprise.
        </p>
        {onPrecise && (
          <Button variant="outline" onClick={onPrecise} className="gap-2">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Préciser mon service
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
