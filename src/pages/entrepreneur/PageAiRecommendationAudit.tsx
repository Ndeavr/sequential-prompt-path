/**
 * UNPRO — /entrepreneurs/audit-ia
 * Dominant contractor acquisition entry point.
 *
 * Visual system: `.audit-gold` — black top nav, white canvas, gold primary,
 * green success, thin gray borders, numbered step cards, premium
 * operational-dashboard density. Mirrors the reference mockup journey:
 *   1. Audit IA gratuit → 2. Résultat → 3. Réclamez votre profil →
 *   4. Éléments manquants → 5. Activation → 6. Recommandable par l'IA
 *
 * Trust contract: nothing is invented. Every fact carries its provenance
 * (Vérifié / Déclaré / Déduit / En attente). The readiness score is the
 * deterministic production score computed server-side from real missions —
 * never a marketing number.
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
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { AuditProHeader } from "@/components/audit-ia/AuditProHeader";
import { JourneySteps } from "@/components/audit-ia/JourneySteps";
import { OperationalSections } from "@/components/audit-ia/OperationalSections";

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
  generated_at?: string;
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
  verified: { label: "Vérifié", cls: "border-success/35 bg-[hsl(152_69%_31%/0.08)] text-success", Icon: BadgeCheck },
  declared: { label: "Déclaré", cls: "border-primary/30 bg-secondary text-secondary-foreground", Icon: PenLine },
  inferred: { label: "Déduit", cls: "border-amber-500/35 bg-amber-50 text-amber-800", Icon: Sparkles },
  pending: { label: "En attente", cls: "border-border bg-muted text-muted-foreground", Icon: Clock3 },
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
  const auditCardRef = useRef<HTMLDivElement | null>(null);
  const autoRunRef = useRef(false);

  const inviteToken = sp.get("t");
  /** Exact verified prospect pre-selected by a tokenized outreach link. */
  const prospectId = sp.get("p");
  /** Outreach activation token — forwarded to garantie checkout as `t`. */
  const activationToken = sp.get("at");

  const utm = {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    // Outreach attribution travels inside the audit row's utm payload so the
    // audit → checkout chain stays attributable to the exact token.
    outreach_token: activationToken,
  };

  // Funnel: page view = audit_opened on the canonical funnel logger.
  useEffect(() => {
    void logFunnelEvent({
      event_type: "landing_view",
      event_source: "app",
      current_path: "/entrepreneurs/audit-ia",
      step: "audit_opened",
      metadata: { ...utm, invite: Boolean(inviteToken), outreach_prospect: prospectId },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lien d'invitation affilié : enregistre l'ouverture réelle et pré-remplit le nom.
  const trackInvite = useCallback(
    async (event: "opened" | "started" | "completed") => {
      if (!inviteToken) return null;
      const { data } = await supabase.functions.invoke("affiliate-audit-track", {
        body: { token: inviteToken, event },
      });
      return (data as any)?.audit ?? null;
    },
    [inviteToken],
  );

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    void trackInvite("opened").then((a) => {
      if (!cancelled && a?.business_name) setQuery((q) => q || a.business_name);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteToken, trackInvite]);

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

  // Tokenized outreach link (SMS score-first): auto-run the exact prospect's
  // audit on arrival — the visitor immediately sees THEIR score, no form.
  useEffect(() => {
    if (!prospectId || autoRunRef.current) return;
    autoRunRef.current = true;
    void runAudit({
      kind: "prospect",
      id: prospectId,
      business_name: query.trim() || null,
      city: null,
      trade: null,
      has_rbq: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  async function runAudit(c: Candidate | null) {
    setAuditing(true);
    setError(null);
    void trackInvite("started");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ai-recommendation-audit", {
        body: {
          action: "audit",
          kind: c ? c.kind : "unknown",
          id: c?.id ?? null,
          business_name: c?.business_name ?? query.trim(),
          query: query.trim(),
          source: prospectId
            ? "outreach_first_touch"
            : inviteToken
              ? "affiliate_invite"
              : "public_audit_ia",
          utm,
        },
      });
      if (fnErr || !(data as any)?.ok) {
        setError("Analyse indisponible pour le moment. Réessayez dans quelques secondes.");
        return;
      }
      const res = data as AuditResult;
      setResult(res);
      void trackInvite("completed");
      // Existing business recognised in UNPRO records → eligibility signal.
      if (c) {
        void supabase.functions.invoke("ai-recommendation-audit", {
          body: {
            action: "event",
            audit_id: res.audit_id,
            token: res.token,
            event_type: "eligible_or_existing_business",
            metadata: { kind: c.kind, matched_id: c.id },
          },
        });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Analyse indisponible pour le moment. Réessayez dans quelques secondes.");
    } finally {
      setAuditing(false);
    }
  }

  async function activate() {
    if (!result) return;
    // claim_started → activation_started, both attribution-preserving.
    for (const event_type of ["claim_started", "activation_started"] as const) {
      await supabase.functions.invoke("ai-recommendation-audit", {
        body: { action: "event", audit_id: result.audit_id, token: result.token, event_type },
      });
    }
    const params = new URLSearchParams();
    if (result.business_name) params.set("entreprise", result.business_name);
    if (result.city) params.set("ville", result.city);
    if (result.trade) params.set("metier", result.trade);
    params.set("audit", result.audit_id);
    params.set("audit_token", result.token);
    // Preserve outreach attribution: garantie reads `t` for the attributed
    // activation checkout (create-activation-checkout).
    if (activationToken) params.set("t", activationToken);
    navigate(`/entrepreneurs/garantie?${params.toString()}`);
  }

  const scrollToAudit = useCallback(() => {
    auditCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const currentStep = result ? 2 : 1;

  return (
    <div className="audit-gold min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <Helmet>
        <title>Audit IA gratuit — Découvrez comment l'IA voit votre entreprise | UNPRO</title>
        <meta
          name="description"
          content="Audit IA gratuit en 30 secondes : voyez ce que l'IA comprend de votre entreprise au Québec et ce qui l'empêche encore de vous recommander. Données réelles, étiquetées Vérifié / Déclaré / Déduit / En attente."
        />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/audit-ia" />
      </Helmet>

      <AuditProHeader onAuditClick={scrollToAudit} />

      <main>
        {/* ------------------------------------------------------- Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              UNPRO · Intelligence résidentielle
            </p>
            <h1
              className="mt-3 text-[30px] font-bold leading-[1.08] text-foreground sm:text-[44px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Découvrez comment l'IA comprend votre entreprise — et ce qui l'empêche encore de vous
              recommander.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
              Découvrez ce que l'IA comprend déjà de votre entreprise — et ce qui pourrait encore vous
              empêcher d'être recommandée.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToAudit}
                className="gold-btn inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
              >
                Obtenir mon audit IA gratuit <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <span className="text-[12.5px] text-muted-foreground">30 secondes · aucune carte de crédit</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Journey */}
        <JourneySteps currentStep={currentStep} />

        {/* ------------------------------------------- Step card / result */}
        <div ref={auditCardRef} className="mx-auto w-full max-w-3xl scroll-mt-24 px-4 py-10 sm:px-6">
          {!result ? (
            <section
              aria-labelledby="audit-start-title"
              className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="gold-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold tabular-nums">
                  1
                </span>
                <div>
                  <h2 id="audit-start-title" className="text-[19px] font-bold leading-tight text-foreground">
                    Audit IA gratuit (30 secondes)
                  </h2>
                  <p className="text-[12.5px] text-muted-foreground">
                    Aucune carte de crédit. Valeur immédiate, avant toute inscription.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="audit-q" className="sr-only">
                  Nom de votre entreprise
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="audit-q"
                    value={query}
                    autoComplete="organization"
                    onChange={(e) => {
                      setTouched(true);
                      setQuery(e.target.value);
                    }}
                    placeholder="Nom de votre entreprise"
                    className="h-14 rounded-2xl border-input bg-card pl-9 text-[16px] text-foreground shadow-sm placeholder:text-muted-foreground"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
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
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary/50 hover:bg-secondary/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-medium text-foreground">
                              {c.business_name}
                            </span>
                            <span className="block truncate text-[12px] text-muted-foreground">
                              {[c.trade, c.city].filter(Boolean).join(" · ") || "Territoire à confirmer"}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  onClick={() => runAudit(null)}
                  disabled={auditing || query.trim().length < 2}
                  size="lg"
                  className="gold-btn mt-4 h-14 w-full rounded-2xl border-0 text-[16px] font-bold hover:text-primary-foreground"
                >
                  {auditing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours…
                    </>
                  ) : (
                    <>
                      Obtenir mon audit IA gratuit <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>

                {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}

                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  UNPRO n'invente jamais un avis, une licence RBQ, une assurance ni un rendez-vous.
                </p>
              </div>
            </section>
          ) : (
            <AuditReport result={result} onActivate={activate} onRestart={() => setResult(null)} />
          )}
        </div>

        {/* ------------------------------------- Operational sections A–F */}
        <OperationalSections />
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
          <circle cx="66" cy="66" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
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
              <stop offset="0%" stopColor="hsl(43 74% 44%)" />
              <stop offset="100%" stopColor="hsl(152 69% 31%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-bold leading-none tabular-nums text-foreground">{score}</span>
          <span className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] font-semibold text-primary">{level}</p>
    </div>
  );
}

/* -------------------------------------------------------------- Missions */
const STATUS_META: Record<MissionStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "Confirmé", cls: "border-success/25 bg-[hsl(152_69%_31%/0.05)]", dot: "bg-success" },
  detected: { label: "Détecté — confirmez en 1 clic", cls: "border-primary/30 bg-secondary/70", dot: "bg-primary" },
  missing: { label: "À compléter", cls: "border-border bg-muted/60", dot: "bg-muted-foreground/40" },
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
            <p className="truncate text-[14.5px] font-semibold text-foreground">{m.label}</p>
          </div>
          {m.detected_value && (
            <p className="mt-1 truncate text-[12.5px] text-foreground/80" title={m.detected_value}>
              {m.detected_value}
            </p>
          )}
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {m.status === "confirmed" ? m.unlocks : m.why}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums ${
            m.status === "confirmed" ? "bg-[hsl(152_69%_31%/0.12)] text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {m.status === "confirmed" ? <Check className="h-3.5 w-3.5" aria-hidden /> : `+${m.points - m.earned}`}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10.5px] text-muted-foreground">
          {meta.label}
        </span>
        {blocking && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-50 px-2 py-0.5 text-[10.5px] font-medium text-rose-700">
            <Lock className="h-2.5 w-2.5" aria-hidden /> Bloquant
          </span>
        )}
        {m.status !== "confirmed" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-secondary px-2 py-0.5 text-[10.5px] text-secondary-foreground">
            <Zap className="h-2.5 w-2.5" aria-hidden /> {m.unlocks}
          </span>
        )}
      </div>
    </li>
  );
}

/** Qualitative state derived from the deterministic score + real missions. */
function qualitativeState(
  score: number,
  recommendable: boolean,
  missions: Mission[],
): { label: string; cls: string } {
  if (recommendable && score >= 85)
    return { label: "Bien compris", cls: "border-success/35 bg-[hsl(152_69%_31%/0.08)] text-success" };
  if (missions.some((m) => m.status !== "confirmed" && m.impact === "high"))
    return { label: "Bloquant — action requise", cls: "border-rose-500/30 bg-rose-50 text-rose-700" };
  return { label: "À compléter", cls: "border-primary/35 bg-secondary text-secondary-foreground" };
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
  const state = qualitativeState(result.readiness_score, baseline.recommendable, missions);
  const detectedFacts = baseline.facts.filter((f) => f.provenance === "verified" || f.provenance === "inferred");
  // Only the 1–3 highest-impact missing items, in priority order.
  const priorityMissing = missions
    .filter((m) => m.status !== "confirmed")
    .sort(
      (a, b) =>
        (a.impact === "high" ? 0 : a.impact === "medium" ? 1 : 2) -
          (b.impact === "high" ? 0 : b.impact === "medium" ? 1 : 2) || b.points - a.points,
    )
    .slice(0, 3);
  const generatedAt = result.generated_at ? new Date(result.generated_at) : new Date();

  return (
    <div className="space-y-4 pb-28">
      <button
        type="button"
        onClick={onRestart}
        className="text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Analyser une autre entreprise
      </button>

      {/* Étape 2 — résultat */}
      <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="gold-btn mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold tabular-nums">
            2
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Votre résultat d'audit</p>
            <h1
              className="mt-1 break-words text-[24px] font-bold leading-tight text-foreground sm:text-[28px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {result.business_name ?? "Votre entreprise"}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {[result.trade, result.city].filter(Boolean).join(" · ") || "Territoire à confirmer"}
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Généré le {generatedAt.toLocaleString("fr-CA")}
            </p>
            <span
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${state.cls}`}
            >
              {state.label}
            </span>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <ScoreRing score={result.readiness_score} level={level} />
          <p className="mt-4 text-center text-[13.5px] leading-relaxed text-muted-foreground">
            {remaining === 0
              ? "Toutes les informations clés sont confirmées."
              : `${remaining} étape${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} pour devenir recommandable.`}
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Résultat basé sur les informations réellement disponibles sur votre entreprise.
          </p>

        </div>
      </section>

      {/* Ce que l'IA peut déjà dire de vous */}
      {detectedFacts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">Ce que l'IA comprend déjà de votre entreprise</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detectedFacts.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {f.label}
                  <ProvenanceTag provenance={f.provenance} source={f.source} />
                </dt>
                <dd className="mt-0.5 truncate text-[14px] font-medium text-foreground" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {baseline.review_note && <p className="mt-3 text-[12.5px] text-muted-foreground">{baseline.review_note}</p>}
        </section>
      )}

      {/* Éléments manquants prioritaires (1–3, réels uniquement) */}
      {priorityMissing.length > 0 && (
        <section className="rounded-2xl border border-primary/35 bg-secondary/50 p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Les {priorityMissing.length} éléments qui bloquent encore votre recommandation
          </h2>
          <ul className="mt-3 space-y-2">
            {priorityMissing.map((m) => (
              <li
                key={m.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground">{m.label}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{m.why}</p>
                </div>
                <ProvenanceTag provenance="pending" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Missions complètes */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Vos missions de recommandabilité</h2>
          <span className="text-[12px] tabular-nums text-muted-foreground">
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
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">Capacité de votre territoire</h2>
        </div>
        {capacity?.status === "verified" ? (
          <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/85">
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
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {capacity?.label ?? "Confirmez votre territoire et votre spécialité pour voir les places disponibles."}
            <span className="ml-2 align-middle">
              <ProvenanceTag provenance="pending" />
            </span>
          </p>
        )}
      </section>

      {/* Activation — offre canonique résolue depuis la config production */}
      <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-secondary to-card p-5 shadow-md">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Étape 5 — Activation</p>
        <h2 className="mt-2 text-[19px] font-bold leading-tight text-foreground">
          Soyez le professionnel que l'IA peut recommander.
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          Rendez-vous exclusifs garantis. Jamais de leads partagés. {OFFER_350.subtitle}
        </p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-[34px] font-bold leading-none tracking-tight text-foreground">
            {OFFER_350.price_label}
          </span>
          <span className="pb-1 text-[12.5px] text-muted-foreground">
            {OFFER_350.card.eyebrow.replace("À partir de ", "à partir de ")}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {OFFER_350.card.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[13px] text-foreground/85">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          {OFFER_350.paymentNote} · {OFFER_350.disclaimer}
        </p>
      </section>

      {/* CTA sticky mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md sm:max-w-lg">
          <Button
            onClick={onActivate}
            size="lg"
            className="gold-btn h-14 w-full rounded-2xl border-0 px-3 text-[15px] font-bold leading-tight hover:text-primary-foreground"
          >
            <span className="truncate">Compléter mon profil et devenir recommandable</span>
            <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
}
