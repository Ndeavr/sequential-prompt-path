/**
 * UNPRO — ExtrapolationTimeline
 * 4-step animated timeline: Google → RBQ → NEQ → Avis.
 */
import { motion } from "framer-motion";
import { Building2, FileText, Scale, Star, CheckCircle2, AlertTriangle, Loader2, XCircle, MapPin, Phone, Globe } from "lucide-react";
import type { BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";
import type { ExtrapolationOutput } from "@/services/verification/extrapolationOrchestrator";

type StepKey = "google" | "rbq" | "neq" | "reviews";
type RuntimeState = "pending" | "loading" | "ok" | "empty" | "error";

interface Props {
  pick: BusinessSearchResult;
  output: ExtrapolationOutput | null;
  loading: boolean;
}

function StatusIcon({ state }: { state: RuntimeState }) {
  const map = {
    pending: <div className="w-4 h-4 rounded-full border-2 border-border" />,
    loading: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
    ok: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    empty: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    error: <XCircle className="w-4 h-4 text-red-500" />,
  } as const;
  return map[state];
}

function Step({
  icon: Icon, label, state, children, index,
}: {
  icon: typeof Building2; label: string; state: RuntimeState;
  children: React.ReactNode; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative pl-10"
    >
      <div className="absolute left-0 top-0 flex flex-col items-center h-full">
        <div className="w-8 h-8 rounded-full bg-card border border-border/60 flex items-center justify-center shadow-sm">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        {index < 3 && <div className="flex-1 w-px bg-border/40 my-1" />}
      </div>
      <div className="pb-6">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <StatusIcon state={state} />
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </motion.div>
  );
}

export default function ExtrapolationTimeline({ pick, output, loading }: Props) {
  const stateFor = (key: StepKey): RuntimeState => {
    if (key === "google") return "ok";
    if (!output && loading) return "loading";
    if (!output) return "pending";
    const sub = output[key as "rbq" | "neq" | "reviews"];
    return (sub?.status as RuntimeState) ?? "pending";
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-5 md:p-6">
      <Step icon={Building2} label="Google Business" state="ok" index={0}>
        <div className="space-y-1">
          <p className="text-foreground font-medium">{pick.business_name}</p>
          {pick.city && (
            <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {pick.city}{pick.province ? `, ${pick.province}` : ""}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1">
            {pick.rating > 0 && (
              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {pick.rating} ({pick.review_count})</span>
            )}
            {pick.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {pick.phone}</span>}
            {pick.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Site</span>}
          </div>
        </div>
      </Step>

      <Step icon={FileText} label="Licence RBQ" state={stateFor("rbq")} index={1}>
        {!output && loading && <span>Recherche dans le registre RBQ…</span>}
        {output?.rbq.status === "ok" && (
          <div className="space-y-0.5">
            <p className="text-foreground">N° {output.rbq.rbq_number ?? "—"} · {output.rbq.rbq_status ?? "—"}</p>
            {output.rbq.registered_name && <p>Nom enregistré : {output.rbq.registered_name}</p>}
            {(output.rbq.subcategories?.length ?? 0) > 0 && (
              <p className="text-[11px]">Sous-catégories : {output.rbq.subcategories!.slice(0, 3).join(", ")}</p>
            )}
          </div>
        )}
        {output?.rbq.status === "empty" && <span>Aucune licence RBQ trouvée publiquement pour ce nom.</span>}
        {output?.rbq.status === "error" && <span>Registre RBQ indisponible — réessayez plus tard.</span>}
      </Step>

      <Step icon={Scale} label="Registre des entreprises (NEQ)" state={stateFor("neq")} index={2}>
        {!output && loading && <span>Recherche au Registraire des entreprises…</span>}
        {output?.neq.status === "ok" && (
          <div className="space-y-0.5">
            <p className="text-foreground">NEQ {output.neq.neq} · {output.neq.neq_status}</p>
            {output.neq.legal_name && <p>Nom légal : {output.neq.legal_name}</p>}
            {output.neq.registration_date && <p className="text-[11px]">Enregistré le {output.neq.registration_date}</p>}
          </div>
        )}
        {output?.neq.status === "empty" && <span>Aucune fiche NEQ publique trouvée pour ce nom.</span>}
        {output?.neq.status === "error" && <span>Registraire indisponible — réessayez plus tard.</span>}
      </Step>

      <Step icon={Star} label="Analyse des avis" state={stateFor("reviews")} index={3}>
        {output?.reviews.status === "ok" && (
          <div className="space-y-1">
            <p className="text-foreground">
              {output.reviews.sentiment === "excellent" && "Avis excellents"}
              {output.reviews.sentiment === "positive" && "Avis positifs"}
              {output.reviews.sentiment === "mixed" && "Avis mitigés"}
              {output.reviews.sentiment === "negative" && "Avis défavorables"}
              {" · "}
              {output.reviews.volume_tier === "high" && "volume élevé"}
              {output.reviews.volume_tier === "medium" && "volume moyen"}
              {output.reviews.volume_tier === "low" && "volume faible"}
              {output.reviews.volume_tier === "very_low" && "très peu d'avis"}
            </p>
            {(output.reviews.red_flags?.length ?? 0) > 0 && (
              <ul className="list-disc pl-4 text-amber-600 dark:text-amber-400 space-y-0.5">
                {output.reviews.red_flags!.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}
        {output?.reviews.status === "empty" && <span>Pas assez d'avis publics pour analyser.</span>}
        {!output && loading && <span>Analyse des avis…</span>}
      </Step>
    </div>
  );
}
