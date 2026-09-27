/**
 * UNPRO — Écran compact avant activation (espace entrepreneur).
 *
 * Remplace le tableau de bord complet tant que l'entente n'est pas activée.
 * Un seul bouton, une seule prochaine étape, jamais de faux succès :
 * la destination est déterminée par l'état réel du dossier côté serveur.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  profile: any;
}

type Target = {
  step: 1 | 2 | 3;
  stepLabel: string;
  detail: string;
  cta: string;
  to: string;
};

export default function ProActivationCompact({ profile }: Props) {
  const navigate = useNavigate();
  const [target, setTarget] = useState<Target | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        let quote: any = null;
        if (profile?.id) {
          const { data, error: qErr } = await supabase
            .from("contractor_pricing_quotes" as any)
            .select("id, pricing_status, recommended_plan, target_monthly_appointments")
            .eq("contractor_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (qErr) throw qErr;
          quote = data;
        }
        if (cancelled) return;

        if (!quote) {
          setTarget({
            step: 1,
            stepLabel: "Étape 1 sur 3 · Votre entreprise",
            detail:
              "Confirmez votre entreprise, votre métier et votre territoire. Ce qui est déjà connu est prérempli.",
            cta: "Confirmer mon entreprise",
            to: "/entrepreneur/devis-personnalise",
          });
        } else if (quote.pricing_status === "waitlisted") {
          setTarget({
            step: 2,
            stepLabel: "Étape 2 sur 3 · Votre objectif",
            detail:
              "Votre métier est très demandé dans ce territoire. Ajustez votre objectif pour voir l'entente disponible.",
            cta: "Ajuster mon objectif",
            to: "/entrepreneur/devis-personnalise?status=waitlisted",
          });
        } else {
          setTarget({
            step: 3,
            stepLabel: "Étape 3 sur 3 · Votre entente de départ",
            detail:
              "Votre entente de départ est prête : ce qu'elle inclut, ses conditions et son prix avec taxes.",
            cta: "Voir mon entente et activer",
            to: `/entrepreneur/plan-personnalise/${quote.id}`,
          });
        }
      } catch {
        if (!cancelled) {
          setError(
            "Nous n'avons pas pu charger la suite de votre activation. Réessayez dans un instant.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const go = () => {
    if (!target || busy) return;
    setBusy(true);
    navigate(target.to);
  };

  return (
    <div className="max-w-md mx-auto px-1 py-6 space-y-5" data-testid="pro-activation-compact">
      <div>
        <p className="text-sm text-muted-foreground truncate">
          {profile?.business_name || "Votre entreprise"}
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground mt-1">
          Terminons votre activation
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement de votre dossier…
        </div>
      ) : error ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-2xl border border-border text-sm font-semibold"
          >
            Réessayer
          </button>
        </div>
      ) : target ? (
        <div className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground" data-testid="activation-step">
            {target.stepLabel}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{target.detail}</p>
          <button
            onClick={go}
            disabled={busy}
            data-testid="activation-primary-cta"
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Activation en cours…
              </>
            ) : (
              <>
                {target.cta} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground leading-relaxed">
        L'activation de votre entente et la vérification de votre licence RBQ sont deux étapes
        distinctes. Les mandats commencent seulement après la vérification.
      </p>
    </div>
  );
}
