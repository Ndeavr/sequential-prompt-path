/**
 * UNPRO — /entrepreneurs/audit-ia
 * « Voir comment l'IA voit mon entreprise »
 *
 * Entrée à friction minimale du funnel entrepreneur : un nom d'entreprise
 * suffit. Aucune donnée inventée — chaque fait porte sa provenance
 * (Vérifié / Déclaré / Déduit / En attente). Le parcours est gamifié :
 * score, niveau, missions pondérées, CTA sticky vers l'activation 350 $.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  PenLine,
  Search,
  Sparkles,
  Clock3,
  MapPin,
  Lock,
  Check,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OFFER_350 } from "@/lib/copy/offer350";

type Provenance = "verified" | "declared" | "inferred" | "pending";
type MissionStatus = "confirmed" | "detected" | "missing";

interface Candidate {
  kind: "contractor" | "prospect";
  id: string;
  business_name: string | null;
  city: string | null;
  trade: string | null;
  has_rbq: boolean;
}
interface Fact {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
  source?: string;
}
interface Mission {
  key: string;
  label: string;
  status: MissionStatus;
  points: number;
  earned: number;
  impact: "high" | "medium" | "low";
  detected_value: string | null;
  why: string;
  unlocks: string;
  cta: string;
}
interface Gap {
  key: string;
  label: string;
  why: string;
  impact: "high" | "medium" | "low";
}
interface AuditResult {
  audit_id: string;
  token: string;
  business_name: string | null;
  city: string | null;
  trade: string | null;
  readiness_score: number;
  baseline: {
    facts: Fact[];
    checks: { key: string; label: string; ok: boolean }[];
    missions?: Mission[];
    level?: string;
    remaining_steps?: number;
    recommendable: boolean;
    review_note: string | null;
  };
  gaps: Gap[];
  capacity: Record<string, any>;
}

const PROVENANCE_META: Record<Provenance, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  verified: { label: "Vérifié", cls: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200", Icon: BadgeCheck },
  declared: { label: "Déclaré", cls: "border-sky-300/25 bg-sky-400/10 text-sky-200", Icon: PenLine },
  inferred: { label: "Déduit", cls: "border-amber-300/25 bg-amber-400/10 text-amber-100", Icon: Sparkles },
  pending: { label: "En attente", cls: "border-white/15 bg-white/5 text-white/60", Icon: Clock3 },
};

function ProvenanceTag({ provenance, source }: { provenance: Provenance; source?: string }) {
  const m = PROVENANCE_META[provenance] ?? PROVENANCE_META.pending;
  return (
    <span
      title={source ? `${m.label} — ${source}` : m.label}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${m.cls}`}
    >
      <m.Icon className="h-2.5 w-2.5" aria-hidden />
      {m.label}
    </span>
  );
}

export default function PageAiRecommendationAudit() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [query, setQuery] = useState(sp.get("q") ?? "");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const debounce = useRef<number | null>(null);

  const utm = {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
  };

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase.functions.invoke("ai-recommendation-audit", {
      body: { action: "search", query: q },
    });
    setCandidates(((data as any)?.candidates ?? []) as Candidate[]);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (!touched) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => runSearch(query), 320);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [query, touched, runSearch]);

  async function runAudit(c: Candidate | null) {
    setAuditing(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-recommendation-audit", {
        body: {
          action: "audit",
          kind: c ? c.kind : "unknown",
          id: c?.id ?? null,
          business_name: c?.business_name ?? query.trim(),
          query: query.trim(),
          source: "public_audit_ia",
          utm,
        },
      });
      if (fnErr || !(data as any)?.ok) {
        setError("Analyse indisponible pour le moment. Réessayez dans quelques secondes.");
        return;
      }
      setResult(data as AuditResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Analyse indisponible pour le moment. Réessayez dans quelques secondes.");
    } finally {
      setAuditing(false);
    }
  }

  async function activate() {
    if (!result) return;
    await supabase.functions.invoke("ai-recommendation-audit", {
      body: {
        action: "event",
        audit_id: result.audit_id,
        token: result.token,
        event_type: "activation_started",
      },
    });
    const params = new URLSearchParams();
    if (result.business_name) params.set("entreprise", result.business_name);
    if (result.city) params.set("ville", result.city);
    if (result.trade) params.set("metier", result.trade);
    params.set("audit", result.audit_id);
    navigate(`/entrepreneurs/garantie?${params.toString()}`);
  }

  return (
    <div className="alex-immersive min-h-[100dvh] overflow-x-hidden bg-[#050816] text-white">
      <Helmet>
        <title>Audit de recommandation IA — Comment l'IA voit votre entreprise | UNPRO</title>
        <meta
          name="description"
          content="Voyez ce que l'IA comprend de votre entreprise au Québec : identité, spécialité, territoire, signaux de confiance. Audit gratuit, données étiquetées Vérifié / Déclaré / Déduit."
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/audit-ia" />
      </Helmet>

      <main className="mx-auto w-full max-w-md px-5 py-8 sm:max-w-lg">
        {!result ? (
          <>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
              UNPRO · Audit de recommandation IA
            </p>
            <h1
              className="mt-3 text-[30px] font-extrabold leading-[1.06] sm:text-[38px]"
              style={{ letterSpacing: "-0.04em" }}
            >
              Voir comment l'IA voit mon entreprise
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Entrez seulement le nom de votre entreprise. Nous affichons ce que UNPRO sait déjà,
              ce qui est confirmé, et ce qui manque pour que vous soyez recommandé.
            </p>

            <div className="mt-6">
              <label htmlFor="audit-q" className="sr-only">
                Nom de votre entreprise
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  id="audit-q"
                  value={query}
                  autoComplete="organization"
                  onChange={(e) => {
                    setTouched(true);
                    setQuery(e.target.value);
                  }}
                  placeholder="Nom de votre entreprise"
                  className="h-14 rounded-2xl border-white/12 bg-white/[0.05] pl-9 text-[16px] text-white placeholder:text-white/40"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/40" />
                )}
              </div>

              {candidates.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {candidates.map((c) => (
                    <li key={`${c.kind}-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => runAudit(c)}
                        disabled={auditing}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-medium text-white">
                            {c.business_name}
                          </span>
                          <span className="block truncate text-[12px] text-white/55">
                            {[c.trade, c.city].filter(Boolean).join(" · ") || "Territoire à confirmer"}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                onClick={() => runAudit(null)}
                disabled={auditing || query.trim().length < 2}
                size="lg"
                className="mt-4 h-14 w-full rounded-2xl bg-white text-[16px] font-semibold text-[#050816] hover:bg-white/90"
              >
                {auditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours…
                  </>
                ) : (
                  <>
                    Lancer mon audit gratuit <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>

              {error && <p className="mt-3 text-[13px] text-rose-300">{error}</p>}

              <p className="mt-4 text-[12.5px] leading-relaxed text-white/45">
                Aucune donnée financière demandée. UNPRO n'invente jamais un avis, une licence RBQ,
                une assurance ni un rendez-vous.
              </p>
            </div>
          </>
        ) : (
          <AuditReport result={result} onActivate={activate} onRestart={() => setResult(null)} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ Ring */
function ScoreRing({ score, level }: { score: number; level: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div>
      <div className="relative mx-auto h-[132px] w-[132px]">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="url(#unproRing)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)" }}
        />
        <defs>
          <linearGradient id="unproRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold leading-none tabular-nums">{score}</span>
        <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/45">/ 100</span>
      </div>
      </div>
      <p className="mt-3 text-center text-[13px] font-semibold text-sky-200">{level}</p>
    </div>
  );
}

/* -------------------------------------------------------------- Missions */
const STATUS_META: Record<MissionStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "Confirmé", cls: "border-emerald-300/20 bg-emerald-400/[0.07]", dot: "bg-emerald-400" },
  detected: { label: "Détecté — confirmez en 1 clic", cls: "border-sky-300/25 bg-sky-400/[0.07]", dot: "bg-sky-400" },
  missing: { label: "À compléter", cls: "border-white/10 bg-white/[0.03]", dot: "bg-white/25" },
};

function MissionRow({ m }: { m: Mission }) {
  const meta = STATUS_META[m.status];
  const blocking = m.status !== "confirmed" && m.impact === "high";
  return (
    <li className={`rounded-2xl border p-3.5 ${meta.cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
            <p className="truncate text-[14.5px] font-semibold text-white">{m.label}</p>
          </div>
          {m.detected_value && (
            <p className="mt-1 truncate text-[12.5px] text-white/70" title={m.detected_value}>
              {m.detected_value}
            </p>
          )}
          <p className="mt-1 text-[12px] leading-relaxed text-white/50">
            {m.status === "confirmed" ? m.unlocks : m.why}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums ${
            m.status === "confirmed" ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-white/75"
          }`}
        >
          {m.status === "confirmed" ? <Check className="h-3.5 w-3.5" aria-hidden /> : `+${m.points - m.earned}`}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] text-white/60">
          {meta.label}
        </span>
        {blocking && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-400/10 px-2 py-0.5 text-[10.5px] font-medium text-rose-200">
            <Lock className="h-2.5 w-2.5" aria-hidden /> Bloquant
          </span>
        )}
        {m.status !== "confirmed" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] px-2 py-0.5 text-[10.5px] text-cyan-100">
            <Zap className="h-2.5 w-2.5" aria-hidden /> {m.unlocks}
          </span>
        )}
      </div>
    </li>
  );
}

function AuditReport({
  result,
  onActivate,
  onRestart,
}: {
  result: AuditResult;
  onActivate: () => void;
  onRestart: () => void;
}) {
  const { baseline, gaps, capacity } = result;
  const missions: Mission[] =
    baseline.missions ??
    baseline.checks.map((c) => ({
      key: c.key,
      label: c.label,
      status: (c.ok ? "confirmed" : "missing") as MissionStatus,
      points: Math.round(100 / Math.max(1, baseline.checks.length)),
      earned: c.ok ? Math.round(100 / Math.max(1, baseline.checks.length)) : 0,
      impact: "high" as const,
      detected_value: null,
      why: gaps.find((g) => g.key === c.key)?.why ?? "",
      unlocks: "",
      cta: c.ok ? "Confirmé" : "Compléter",
    }));

  const remaining = baseline.remaining_steps ?? missions.filter((m) => m.status !== "confirmed").length;
  const level = baseline.level ?? (result.readiness_score >= 85 ? "Recommandable" : "Invisible pour l'IA");
  const toConfirm = missions.filter((m) => m.status === "detected");
  const detectedFacts = baseline.facts.filter((f) => f.provenance === "verified" || f.provenance === "inferred");
  const ctaLabel = toConfirm.length > 0 ? "Confirmer mes informations" : "Compléter mon profil";

  return (
    <div className="space-y-4 pb-28">
      <button
        type="button"
        onClick={onRestart}
        className="text-[12.5px] text-white/50 underline underline-offset-4 hover:text-white/80"
      >
        ← Analyser une autre entreprise
      </button>

      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Audit de recommandation IA</p>
        <h1 className="mt-2 break-words text-[26px] font-extrabold leading-tight" style={{ letterSpacing: "-0.03em" }}>
          {result.business_name ?? "Votre entreprise"}
        </h1>
        <p className="mt-1 text-[13px] text-white/55">
          {[result.trade, result.city].filter(Boolean).join(" · ") || "Territoire à confirmer"}
        </p>
      </header>

      {/* Score + progression */}
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <ScoreRing score={result.readiness_score} level={level} />
        <p className="mt-4 text-center text-[13.5px] leading-relaxed text-white/70">
          {remaining === 0
            ? "Toutes les informations clés sont confirmées."
            : `${remaining} étape${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} pour devenir recommandable.`}
        </p>
        
      </section>

      {/* Ce que l'IA peut déjà dire de vous */}
      {detectedFacts.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-semibold text-white">Ce que l'IA peut déjà dire de vous</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detectedFacts.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-white/45">
                  {f.label}
                  <ProvenanceTag provenance={f.provenance} source={f.source} />
                </dt>
                <dd className="mt-0.5 truncate text-[14px] font-medium text-white/90" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {baseline.review_note && <p className="mt-3 text-[12.5px] text-white/45">{baseline.review_note}</p>}
        </section>
      )}

      {/* Missions */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Vos missions de recommandabilité</h2>
          <span className="text-[12px] tabular-nums text-white/45">
            {missions.filter((m) => m.status === "confirmed").length}/{missions.length}
          </span>
        </div>
        <ul className="mt-3 space-y-2.5">
          {missions
            .slice()
            .sort((a, b) => (a.status === "confirmed" ? 1 : 0) - (b.status === "confirmed" ? 1 : 0) || b.points - a.points)
            .map((m) => (
              <MissionRow key={m.key} m={m} />
            ))}
        </ul>
      </section>

      {/* Capacité réelle */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sky-300" aria-hidden />
          <h2 className="text-sm font-semibold text-white">Capacité de votre territoire</h2>
        </div>
        {capacity?.status === "verified" ? (
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/75">
            {capacity.market_open === false
              ? `${capacity.trade} à ${capacity.city} : territoire complet pour le moment.`
              : `${capacity.trade} à ${capacity.city} : ${capacity.remaining} place${
                  Number(capacity.remaining) > 1 ? "s" : ""
                } sur ${capacity.max} encore disponible${Number(capacity.remaining) > 1 ? "s" : ""}.`}
            <span className="ml-2 align-middle">
              <ProvenanceTag provenance="verified" source="Capacité UNPRO" />
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
            {capacity?.label ?? "Confirmez votre territoire et votre spécialité pour voir les places disponibles."}
            <span className="ml-2 align-middle">
              <ProvenanceTag provenance="pending" />
            </span>
          </p>
        )}
      </section>

      {/* Offre */}
      <section className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-5">
        <h2 className="text-[19px] font-bold leading-tight">
          Devenez le professionnel que l'IA peut recommander
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          Rendez-vous exclusifs garantis. Jamais de leads partagés. {OFFER_350.subtitle}
        </p>
        <p className="mt-3 text-center text-[12px] text-white/45">
          {OFFER_350.paymentNote} · {OFFER_350.disclaimer}
        </p>
      </section>

      {/* CTA sticky mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050816]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <Button
            onClick={onActivate}
            size="lg"
            className="h-14 w-full rounded-2xl bg-white px-3 text-[15px] font-semibold leading-tight text-[#050816] hover:bg-white/90"
          >
            <span className="truncate">{ctaLabel}</span>
            <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
}
