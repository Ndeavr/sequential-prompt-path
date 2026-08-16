/**
 * UNPRO — Carte « Revenez demain » (garde-fou d'utilisation raisonnable).
 * Aucune donnée n'est perdue : uploads, projets, analyses et designs restent accessibles.
 * Aucun langage technique, aucun compteur affiché.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { DAILY_LIMIT_COPY, type DailyGuardFeature, type DailyLimitPayload } from "@/lib/copy/usagePolicy";

interface Props {
  feature: DailyGuardFeature;
  payload?: DailyLimitPayload | null;
  className?: string;
}

export default function DailyLimitReachedCard({ feature, payload, className }: Props) {
  const fallback = DAILY_LIMIT_COPY[feature];
  const title = payload?.title ?? fallback.title;
  const body = payload?.body ?? fallback.body;
  const reassurance = payload?.reassurance ?? fallback.reassurance;
  const ctaLabel = payload?.cta_label ?? fallback.ctaLabel;
  const ctaHref = payload?.cta_href ?? fallback.ctaHref;

  return (
    <Card className={`border-border/60 bg-card/70 backdrop-blur-xl ${className ?? ""}`}>
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{reassurance}</p>
        </div>
        <Button asChild size="lg" className="w-full gap-2 rounded-full sm:w-auto">
          <Link to={ctaHref}>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
