/**
 * UNPRO — /entrepreneurs/audit-ia
 * « Voir comment l'IA voit mon entreprise »
 *
 * Entrée à friction minimale du funnel entrepreneur : un nom d'entreprise
 * suffit. Aucune donnée inventée — chaque fait porte sa provenance
 * (Vérifié / Déclaré / Déduit / En attente). Le CTA unique mène à
 * l'activation 350 $.
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
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OFFER_350 } from "@/lib/copy/offer350";

type Provenance = "verified" | "declared" | "inferred" | "pending";

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
    <div className="alex-immersive min-h-[100dvh] bg-[#050816] text-white">
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
  const highGaps = gaps.filter((g) => g.impact === "high");

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onRestart}
        className="text-[12.5px] text-white/50 underline underline-offset-4 hover:text-white/80"
      >
        ← Analyser une autre entreprise
      </button>

      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">Audit de recommandation IA</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight" style={{ letterSpacing: "-0.03em" }}>
          {result.business_name ?? "Votre entreprise"}
        </h1>
        <p className="mt-1 text-[13px] text-white/55">
          {[result.trade, result.city].filter(Boolean).join(" · ") || "Territoire à confirmer"}
        </p>
      </header>

      {/* Score */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Prêt à être recommandé par l'IA</h2>
          <span className="text-3xl font-semibold tabular-nums">{result.readiness_score}%</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-[width] duration-700"
            style={{ width: `${Math.max(4, result.readiness_score)}%` }}
          />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/65">
          {baseline.recommendable
            ? "UNPRO détient assez de données confirmées pour vous considérer dans ses recommandations."
            : "UNPRO ne détient pas encore assez de données confirmées pour vous recommander avec confiance."}
        </p>
      </section>

      {/* Ce que l'IA comprend */}
      {baseline.facts.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h2 className="text-sm font-semibold text-white">Ce que l'IA comprend aujourd'hui</h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {baseline.facts.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/45">
                  {f.label}
                  <ProvenanceTag provenance={f.provenance} source={f.source} />
                </dt>
                <dd className="mt-0.5 truncate text-[14px] font-medium text-white/90" title={f.value}>
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          {baseline.review_note && (
            <p className="mt-3 text-[12.5px] text-white/45">{baseline.review_note}</p>
          )}
        </section>
      )}

      {/* Écart de recommandation */}
      {gaps.length > 0 && (
        <section className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-200" aria-hidden />
            <h2 className="text-sm font-semibold text-white">
              Écart de recommandation — {gaps.length} élément{gaps.length > 1 ? "s" : ""} manquant
              {gaps.length > 1 ? "s" : ""}
            </h2>
          </div>
          <ul className="mt-3 space-y-3">
            {gaps.map((g) => (
              <li key={g.key} className="border-l-2 border-amber-300/30 pl-3">
                <p className="text-[14px] font-medium text-white/90">{g.label}</p>
                <p className="text-[12.5px] leading-relaxed text-white/55">{g.why}</p>
              </li>
            ))}
          </ul>
          {highGaps.length > 0 && (
            <p className="mt-3 text-[12.5px] text-amber-100/80">
              {highGaps.length} de ces éléments bloquent complètement une recommandation.
            </p>
          )}
        </section>
      )}

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
            Analyse de capacité en cours pour votre domaine et votre territoire.
            <span className="ml-2 align-middle">
              <ProvenanceTag provenance="pending" />
            </span>
          </p>
        )}
      </section>

      {/* CTA unique */}
      <section className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-5">
        <h2 className="text-[19px] font-bold leading-tight">
          Devenez le professionnel que l'IA peut recommander
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          Rendez-vous exclusifs garantis. Jamais de leads partagés. {OFFER_350.subtitle}
        </p>
        <Button
          onClick={onActivate}
          size="lg"
          className="mt-4 h-14 w-full rounded-2xl bg-white text-[16px] font-semibold text-[#050816] hover:bg-white/90"
        >
          Activer mon profil pour être recommandable <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <p className="mt-2 text-center text-[12px] text-white/45">
          {OFFER_350.paymentNote} · {OFFER_350.disclaimer}
        </p>
      </section>
    </div>
  );
}
