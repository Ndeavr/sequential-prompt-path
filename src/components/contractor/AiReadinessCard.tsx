/**
 * UNPRO — Carte « Visibilité IA & UNPRO » du tableau de bord entrepreneur.
 *
 * Affiche uniquement des états réels : complétion du profil, préparation IA
 * UNPRO, admissibilité aux recommandations, vérification, territoires,
 * services, disponibilité, prochaine action. Aucune promesse de position dans
 * ChatGPT.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarClock, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MATCHING_FIELD_LABELS, type MatchingFieldKey } from "@/lib/matching/matchingQuestions";
import { chatgptIntegrationCopy } from "@/lib/ai/chatgptIntegration";

interface MatchingProfileRow {
  profile_completion: number;
  ai_profile_readiness: number;
  recommendation_eligible: boolean;
  verification_status: string;
  missing_matching_fields: MatchingFieldKey[] | null;
  answers: Record<string, unknown> | null;
  status: string;
}

export function AiReadinessCard({ contractorId }: { contractorId?: string | null }) {
  const navigate = useNavigate();
  const [row, setRow] = useState<MatchingProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const integration = chatgptIntegrationCopy("fr");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!contractorId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("contractor_matching_profiles")
        .select(
          "profile_completion, ai_profile_readiness, recommendation_eligible, verification_status, missing_matching_fields, answers, status",
        )
        .eq("contractor_id", contractorId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setRow((data as unknown as MatchingProfileRow) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contractorId]);

  const completion = row?.profile_completion ?? 0;
  const missing = (row?.missing_matching_fields ?? []) as MatchingFieldKey[];
  const answers = (row?.answers ?? {}) as Record<string, unknown>;
  const territories = Array.isArray(answers.territories) ? (answers.territories as string[]) : [];
  const services = Array.isArray(answers.services_wanted) ? (answers.services_wanted as string[]) : [];
  const availability = typeof answers.availability === "string" ? (answers.availability as string) : null;

  const AVAILABILITY_LABEL: Record<string, string> = {
    this_week: "Cette semaine",
    "2_weeks": "D'ici 2 semaines",
    "1_month": "D'ici 1 mois",
    next_season: "Prochaine saison",
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Visibilité IA &amp; UNPRO</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Préparation du profil IA UNPRO — indicateur UNPRO, pas un score OpenAI.
          </p>
        </div>
        <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12.5px] text-muted-foreground">Complétion du profil</span>
          <span className="text-[15px] font-bold tabular-nums text-foreground">{completion}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-[13px]">
        <li className="flex items-center gap-2">
          <BadgeCheck
            className={`h-4 w-4 ${row?.recommendation_eligible ? "text-success" : "text-muted-foreground"}`}
            aria-hidden
          />
          <span className="text-foreground/85">
            {row?.recommendation_eligible
              ? "Admissible aux recommandations UNPRO"
              : "Pas encore admissible aux recommandations UNPRO"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-foreground/85">
            Vérification : {row?.verification_status ?? "non vérifié"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-foreground/85">
            {territories.length > 0 ? territories.slice(0, 3).join(", ") : "Territoires à confirmer"}
            {services.length > 0 ? ` · ${services.slice(0, 2).join(", ")}` : ""}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-foreground/85">
            {availability ? AVAILABILITY_LABEL[availability] ?? availability : "Disponibilité à confirmer"}
          </span>
        </li>
      </ul>

      {missing.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          À compléter : {missing.slice(0, 3).map((m) => MATCHING_FIELD_LABELS[m] ?? m).join(", ")}
        </p>
      )}

      <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Intégration assistants IA (dont ChatGPT) : {integration.badge}. {integration.text}
      </p>

      <Button
        onClick={() => navigate("/entrepreneurs/profil")}
        className="mt-4 h-11 w-full rounded-2xl font-semibold"
        disabled={loading}
      >
        {completion >= 100 ? "Revoir mon profil" : "Compléter mon profil"}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}
