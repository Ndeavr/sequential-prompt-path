/**
 * UNPRO — Parcours entrepreneur de Clara, directement dans le chat.
 *
 * Nom/site → fiche Google réelle (`business-lookup`) → confirmation →
 * objectifs → analyse réelle (`ai-recommendation-audit`) → questions
 * strictement nécessaires → proposition serveur (`compute-pricing-quote`) →
 * activation préremplie (page du plan existante, paiement/connexion au besoin).
 *
 * Aucune donnée inventée : chaque valeur garde sa provenance
 * (public = fiche Google confirmée, declared = dit par l'entrepreneur,
 * inferred = déduit par UNPRO).
 */
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, MapPin, Phone, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getClaraQualification,
  saveClaraQualification,
  type ClaraProvenance,
} from "@/services/clara/claraContractorQualification";
import { computePricingQuote, formatCAD, type PricingQuote } from "@/services/contractorPricingQuoteService";
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";

type Candidate = {
  place_id: string;
  business_name: string;
  address: string;
  city?: string;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  category_label?: string;
  primary_type_label?: string;
  categories?: string[];
};

type Mission = { key: string; label: string; status: string; why?: string; impact?: string };
type Fact = { key: string; label: string; value: string; provenance: string; source?: string };
type AuditResult = {
  ok: boolean;
  audit_id: string;
  token: string;
  generated_at: string;
  business_name: string | null;
  city: string | null;
  trade: string | null;
  readiness_score: number | null;
  baseline: {
    facts: Fact[];
    missions: Mission[];
    level: string;
    matched: { merged_sources: string[] };
  };
  gaps: { key: string; label: string; why: string; impact: string }[];
};

type Step =
  | "name" | "searching" | "pick" | "goals" | "priority" | "auditing" | "audit_done"
  | "trade" | "customer" | "areas" | "goal_detail" | "goal_detail2" | "appointments"
  | "avg_value" | "quoting" | "proposal" | "failed";

const GOALS = [
  { key: "visibility", label: "Être plus visible sur Google et les moteurs d’IA" },
  { key: "contracts", label: "Obtenir plus de contrats" },
  { key: "matching", label: "Recevoir des demandes mieux adaptées à mes services" },
  { key: "time", label: "Réduire le temps consacré à trouver des clients" },
] as const;
type GoalKey = (typeof GOALS)[number]["key"];

const FLOW_KEY = "unpro_clara_contractor_flow";

type FlowMemory = {
  priority?: GoalKey | "other";
  contract_goal?: number;
  prefer?: string;
  avoid?: string;
  time_sink?: string;
  appointments?: number;
  avg_value?: number;
  avg_value_label?: string;
};

function readFlow(): FlowMemory {
  try { return JSON.parse(sessionStorage.getItem(FLOW_KEY) || "{}"); } catch { return {}; }
}
function writeFlow(patch: FlowMemory) {
  try { sessionStorage.setItem(FLOW_KEY, JSON.stringify({ ...readFlow(), ...patch })); } catch { /* */ }
}

const PROVENANCE_LABEL: Record<string, string> = {
  public: "Source publique",
  verified: "Vérifié",
  declared: "Déclaré",
  inferred: "Déduit",
  pending: "À confirmer",
};

export interface ClaraContractorFlowHandle {
  /** Retourne true si le parcours a consommé la réponse libre. */
  handleText: (text: string) => boolean;
}

interface Props {
  say: (text: string) => Promise<void>;
  addUser: (text: string) => void;
  onBusy: (busy: boolean) => void;
}

const ClaraContractorFlow = forwardRef<ClaraContractorFlowHandle, Props>(function ClaraContractorFlow(
  { say, addUser, onBusy },
  ref,
) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("name");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [goals, setGoals] = useState<GoalKey[]>([]);
  const [freeGoal, setFreeGoal] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [retry, setRetry] = useState<null | (() => void)>(null);
  const startedRef = useRef(false);
  const stepRef = useRef<Step>("name");
  stepRef.current = step;

  const go = useCallback(async (next: Step, question?: string) => {
    if (question) await say(question);
    setStep(next);
  }, [say]);

  /* ----------------------------------------------------- 1. Nom / site */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void trackFunnelStep("home_contractor_click", { metadata: { surface: "home_clara_chat" } });
    const known = getClaraQualification();
    if (known.google_place_id && known.business_name) {
      void (async () => {
        await say(`Je reprends avec ${known.business_name}, déjà confirmée.`);
        await askGoals();
      })();
      return;
    }
    void go("name", "Quel est le nom de votre entreprise ou son site Web?");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------ 2. Recherche Google */
  const search = useCallback(async (query: string) => {
    setLastQuery(query);
    setLookupError(null);
    setStep("searching");
    onBusy(true);
    void trackFunnelStep("analysis_started", { metadata: { surface: "home_clara_chat", stage: "lookup" } });
    try {
      const clean = query.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
      const { data, error } = await supabase.functions.invoke("business-lookup", { body: { query: clean } });
      const results = ((data as { results?: Candidate[] } | null)?.results ?? []).slice(0, 3);
      const providerError = (data as { error?: string } | null)?.error;
      if (error || (providerError && results.length === 0)) {
        setLookupError("La recherche Google ne répond pas pour le moment.");
        setRetry(() => () => void search(query));
        await say("La recherche Google ne répond pas pour le moment. Vous pouvez réessayer ou continuer avec le nom que vous m’avez donné.");
        setStep("pick");
        setCandidates([]);
        return;
      }
      setCandidates(results);
      if (results.length === 0) {
        await say("Je ne trouve aucune fiche Google à ce nom. Précisez la ville ou le site Web, ou continuons avec le nom déclaré.");
      } else if (results.length === 1) {
        await say("J’ai trouvé cette fiche Google. C’est bien celle-ci?");
      } else {
        await say("J’ai trouvé plusieurs fiches semblables. Laquelle est la vôtre?");
      }
      setStep("pick");
    } finally {
      onBusy(false);
    }
  }, [onBusy, say]);

  /* ---------------------------------------------------- 3. Confirmation */
  const confirmCandidate = useCallback(async (c: Candidate) => {
    addUser(`Oui, c’est ${c.business_name}.`);
    const trade = c.primary_type_label || c.category_label || null;
    const prov: Partial<Record<string, ClaraProvenance>> = {
      business_name: "public", business_city: "public", website: "public", phone: "public",
      google_place_id: "public", primary_trade: "inferred",
    };
    saveClaraQualification({
      business_name: c.business_name,
      business_city: c.city || null,
      website: c.website || null,
      phone: c.phone || null,
      google_place_id: c.place_id,
      primary_trade: getClaraQualification().primary_trade ? null : trade,
    }, prov);
    void trackFunnelStep("company_recognized", { metadata: { surface: "home_clara_chat", source: "google" } });
    await askGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUser]);

  const continueDeclared = useCallback(async () => {
    addUser("Continuer avec le nom déclaré");
    saveClaraQualification({ business_name: lastQuery.slice(0, 120) }, "declared");
    await askGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUser, lastQuery]);

  /* ------------------------------------------------------- 4. Objectifs */
  const askGoals = useCallback(async () => {
    await go("goals", "Quels sont vos objectifs? Choisissez-en un ou plusieurs, ou écrivez-le.");
  }, [go]);

  const submitGoals = useCallback(async (selected: GoalKey[], free: string | null) => {
    const labels = [...GOALS.filter((g) => selected.includes(g.key)).map((g) => g.label), ...(free ? [free.slice(0, 80)] : [])];
    if (!labels.length) return;
    addUser(labels.join(" · "));
    saveClaraQualification({ goals: labels }, "declared");
    void trackFunnelStep("goals_completed", { metadata: { surface: "home_clara_chat", count: labels.length } });
    if (selected.length > 1) {
      await go("priority", "Lequel est le plus important pour vous maintenant?");
      return;
    }
    writeFlow({ priority: selected[0] ?? "other" });
    await runAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUser, go]);

  const choosePriority = useCallback(async (key: GoalKey) => {
    addUser(GOALS.find((g) => g.key === key)!.label);
    writeFlow({ priority: key });
    await runAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUser]);

  /* ------------------------------------------------ 5. Analyse réelle */
  const runAudit = useCallback(async () => {
    const known = getClaraQualification();
    setStep("auditing");
    onBusy(true);
    await say("J’analyse ce qu’UNPRO sait déjà de votre entreprise.");
    try {
      const { data, error } = await supabase.functions.invoke("ai-recommendation-audit", {
        body: {
          action: "audit",
          kind: "unknown",
          id: null,
          business_name: known.business_name,
          query: known.business_name,
          source: "home_clara_chat",
        },
      });
      const res = data as AuditResult | null;
      if (error || !res?.ok) {
        setRetry(() => () => void runAudit());
        await say("L’analyse n’a pas pu se terminer. Vous pouvez réessayer.");
        setStep("failed");
        return;
      }
      try { sessionStorage.setItem("unpro_audit_ia_result", JSON.stringify(res)); } catch { /* */ }
      setAudit(res);
      void trackFunnelStep("analysis_completed", { metadata: { surface: "home_clara_chat", partial: !res.baseline.matched.merged_sources.length } });
      setStep("audit_done");
      await nextQuestion();
    } finally {
      onBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBusy, say]);

  /* --------------------------------- 6. Questions strictement nécessaires */
  const nextQuestion = useCallback(async () => {
    const k = getClaraQualification();
    const f = readFlow();
    if (!k.primary_trade) return go("trade", "Quel est votre métier principal?");
    if (!k.customer_type) return go("customer", "Travaillez-vous surtout au résidentiel, au commercial, ou les deux?");
    if (!k.service_areas?.length) {
      return go("areas", k.business_city
        ? `Votre entreprise est à ${k.business_city}. Dans quelles villes acceptez-vous des mandats?`
        : "Dans quelles villes acceptez-vous des mandats?");
    }
    if (f.priority === "contracts" && f.contract_goal == null) return go("goal_detail", "Combien de contrats de plus visez-vous par mois?");
    if (f.priority === "matching" && !f.prefer) return go("goal_detail", "Quels mandats aimeriez-vous recevoir en priorité?");
    if (f.priority === "matching" && !f.avoid) return go("goal_detail2", "Et quels mandats préférez-vous éviter?");
    if (f.priority === "time" && !f.time_sink) return go("goal_detail", "Quelle tâche vous prend le plus de temps?");
    if (f.appointments == null) return go("appointments", "Combien de rendez-vous pourriez-vous accueillir le mois prochain?");
    if (f.avg_value == null) return go("avg_value", "Quelle est la valeur moyenne d’un contrat?");
    return buildProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const answer = useCallback(async (text: string, current: Step) => {
    const clean = text.trim();
    if (!clean) return;
    const num = Number((clean.match(/\d[\d\s]*/)?.[0] ?? "").replace(/\s/g, ""));
    switch (current) {
      case "trade": saveClaraQualification({ primary_trade: clean.slice(0, 120) }); break;
      case "customer": saveClaraQualification({ customer_type: clean.slice(0, 60) }); break;
      case "areas": {
        const list = clean.split(/[,;/]|\bet\b/i).map((v) => v.trim()).filter(Boolean).slice(0, 8);
        saveClaraQualification({ service_areas: list });
        break;
      }
      case "goal_detail": {
        const p = readFlow().priority;
        if (p === "contracts") writeFlow({ contract_goal: num > 0 ? num : 1 });
        else if (p === "matching") writeFlow({ prefer: clean.slice(0, 200) });
        else writeFlow({ time_sink: clean.slice(0, 200) });
        break;
      }
      case "goal_detail2": writeFlow({ avoid: clean.slice(0, 200) }); break;
      case "appointments": writeFlow({ appointments: Math.max(1, Math.min(60, num || 1)) }); break;
      case "avg_value": {
        const map: Record<string, number> = { "Moins de 2 000 $": 1500, "2 000 à 5 000 $": 3500, "5 000 à 15 000 $": 10000, "Plus de 15 000 $": 20000 };
        writeFlow({ avg_value: map[clean] ?? Math.max(200, num || 3500), avg_value_label: clean });
        break;
      }
      default: return;
    }
    await nextQuestion();
  }, [nextQuestion]);

  const pick = useCallback(async (label: string, current: Step) => {
    addUser(label);
    await answer(label, current);
  }, [addUser, answer]);

  /* ------------------------------------------------ 7. Proposition */
  const buildProposal = useCallback(async () => {
    const k = getClaraQualification();
    const f = readFlow();
    const city = k.service_areas?.[0] ?? k.business_city ?? "";
    setStep("quoting");
    onBusy(true);
    try {
      const q = await computePricingQuote({
        trade_primary: k.primary_trade ?? "",
        city,
        target_monthly_appointments: f.appointments ?? 1,
        monthly_capacity: f.appointments ?? 1,
        contract_goal_value: f.contract_goal,
        contract_goal_unit: f.contract_goal ? "month" : undefined,
        average_project_value: f.avg_value ?? 3500,
        close_rate_estimate: 0.4,
        seasonal_priority: "all",
        desired_growth_level: "growth",
        service_radius_km: 50,
        company_name: k.business_name ?? null,
        website_url: k.website ?? null,
        current_ai_visibility_score: audit?.baseline.matched.merged_sources.length ? audit.readiness_score ?? undefined : undefined,
      });
      setQuote(q);
      void trackFunnelStep("quote_computed", { subjectId: q.id, metadata: { surface: "home_clara_chat" } });
      void trackFunnelStep("plan_presented", { subjectId: q.id, metadata: { surface: "home_clara_chat" } });
      await say("Voici un résumé et l’entente de départ la plus adaptée à votre capacité du mois prochain.");
      setStep("proposal");
    } catch {
      setRetry(() => () => void buildProposal());
      await say("Je n’ai pas pu calculer votre proposition. Vous pouvez réessayer.");
      setStep("failed");
    } finally {
      onBusy(false);
    }
  }, [audit, onBusy, say]);

  /* --------------------------------------------- réponses libres (composer) */
  useImperativeHandle(ref, () => ({
    handleText: (text: string) => {
      const s = stepRef.current;
      if (s === "name" || s === "pick") { addUser(text); void search(text); return true; }
      if (s === "goals") { const g = goals; addUser(text); void (async () => { saveClaraQualification({ goals: [text.slice(0, 80)] }); writeFlow({ priority: g[0] ?? "other" }); void trackFunnelStep("goals_completed", { metadata: { surface: "home_clara_chat", free: true } }); await runAudit(); })(); return true; }
      if (["trade", "customer", "areas", "goal_detail", "goal_detail2", "appointments", "avg_value"].includes(s)) {
        addUser(text); void answer(text, s); return true;
      }
      return false;
    },
  }), [addUser, answer, goals, runAudit, search]);

  /* ------------------------------------------------------------ rendu */
  const known = getClaraQualification();
  const flow = readFlow();

  if (step === "pick") {
    return (
      <div className="home-clara-flow" aria-label="Fiches Google trouvées">
        {candidates.map((c) => (
          <article key={c.place_id} className="home-clara-card">
            <p className="home-clara-card-title">{c.business_name}</p>
            {c.primary_type_label || c.category_label ? <p className="home-clara-card-meta">{c.primary_type_label || c.category_label}</p> : null}
            <p className="home-clara-card-meta"><MapPin aria-hidden="true" /> {c.address}</p>
            {c.phone && <p className="home-clara-card-meta"><Phone aria-hidden="true" /> {c.phone}</p>}
            {c.website && <p className="home-clara-card-meta"><ExternalLink aria-hidden="true" /> {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</p>}
            {c.review_count ? <p className="home-clara-card-meta"><Star aria-hidden="true" /> {c.rating} · {c.review_count} avis Google</p> : null}
            <p className="home-clara-card-source">Source publique : Google</p>
            <button type="button" className="home-clara-card-primary" onClick={() => void confirmCandidate(c)}>Oui, c’est bien celle-ci</button>
          </article>
        ))}
        <div className="home-clara-quick" role="group" aria-label="Autres choix">
          {lookupError && retry && <button type="button" onClick={() => retry()}>Réessayer</button>}
          <button type="button" onClick={() => { addUser(candidates.length ? "Ce n’est pas celle-ci" : "Préciser"); void go("name", "Écrivez le nom avec la ville, ou votre site Web."); }}>
            {candidates.length ? "Aucune de celles-ci" : "Préciser"}
          </button>
          {lastQuery && <button type="button" onClick={() => void continueDeclared()}>Continuer avec « {lastQuery.slice(0, 30)} »</button>}
        </div>
      </div>
    );
  }

  if (step === "goals") {
    return (
      <div className="home-clara-flow">
        <div className="home-clara-quick" role="group" aria-label="Objectifs">
          {GOALS.map((g) => (
            <button key={g.key} type="button" aria-pressed={goals.includes(g.key)} data-selected={goals.includes(g.key) ? "true" : "false"}
              onClick={() => setGoals((prev) => prev.includes(g.key) ? prev.filter((k) => k !== g.key) : [...prev, g.key])}>
              {goals.includes(g.key) ? "✓ " : ""}{g.label}
            </button>
          ))}
        </div>
        <button type="button" className="home-clara-card-primary" disabled={!goals.length && !freeGoal} onClick={() => void submitGoals(goals, freeGoal)}>Continuer</button>
      </div>
    );
  }

  if (step === "priority") {
    return (
      <div className="home-clara-quick" role="group" aria-label="Objectif prioritaire">
        {goals.map((k) => <button key={k} type="button" onClick={() => void choosePriority(k)}>{GOALS.find((g) => g.key === k)!.label}</button>)}
      </div>
    );
  }

  const quick: Partial<Record<Step, string[]>> = {
    customer: ["Résidentiel", "Commercial", "Les deux"],
    appointments: ["2", "4", "8", "12", "20"],
    avg_value: ["Moins de 2 000 $", "2 000 à 5 000 $", "5 000 à 15 000 $", "Plus de 15 000 $"],
    goal_detail: flow.priority === "contracts" ? ["1", "3", "5", "10"]
      : flow.priority === "time" ? ["Soumissions sans suite", "Qualifier les demandes", "Relancer les clients", "Ma présence en ligne"] : [],
  };

  const auditCard = audit && ["audit_done", "trade", "customer", "areas", "goal_detail", "goal_detail2", "appointments", "avg_value", "quoting", "proposal"].includes(step) ? (
    <AuditCard audit={audit} />
  ) : null;

  return (
    <div className="home-clara-flow">
      {auditCard}
      {quick[step]?.length ? (
        <div className="home-clara-quick" role="group" aria-label="Réponses rapides">
          {quick[step]!.map((o) => <button key={o} type="button" onClick={() => void pick(o, step)}>{o}</button>)}
        </div>
      ) : null}
      {step === "failed" && retry && (
        <div className="home-clara-quick"><button type="button" onClick={() => retry()}>Réessayer</button></div>
      )}
      {step === "proposal" && quote && (
        <ProposalCard
          quote={quote}
          known={known}
          flow={flow}
          onActivate={() => navigate(`/entrepreneur/plan-personnalise/${quote.id}`)}
          onDetails={() => navigate("/entrepreneurs/audit-ia")}
        />
      )}
    </div>
  );
});

function AuditCard({ audit }: { audit: AuditResult }) {
  const partial = !audit.baseline.matched.merged_sources.length;
  const priorities = [...audit.gaps].sort((a, b) => (a.impact === "high" ? -1 : 0) - (b.impact === "high" ? -1 : 0)).slice(0, 3);
  const clear = audit.baseline.missions.filter((m) => m.status === "confirmed");
  const sources = Array.from(new Set(audit.baseline.facts.map((f) => f.source).filter(Boolean)));
  const date = new Date(audit.generated_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="home-clara-card" aria-label="Résultat de l’analyse">
      <p className="home-clara-card-title">{partial ? "Analyse partielle" : `Score de préparation : ${audit.readiness_score}/100`}</p>
      <p className="home-clara-card-meta">
        {partial
          ? "Votre entreprise n’est pas encore dans les registres UNPRO : aucun score n’est calculé."
          : `${audit.baseline.level}. Méthode : 7 critères UNPRO (identité, métier, territoire, contact, site, RBQ, avis).`}
      </p>
      {clear.length > 0 && (
        <p className="home-clara-card-meta"><CheckCircle2 aria-hidden="true" /> Clair : {clear.map((m) => m.label).join(", ")}</p>
      )}
      {priorities.length > 0 && (
        <ol className="home-clara-card-list">
          {priorities.map((g) => <li key={g.key}><strong>{g.label}</strong> — {g.why}</li>)}
        </ol>
      )}
      <p className="home-clara-card-source">
        Sources : {sources.length ? sources.join(", ") : "aucune source vérifiée pour l’instant"} · {date}
      </p>
      <a className="home-clara-card-link" href="/entrepreneurs/audit-ia">Voir les détails</a>
    </article>
  );
}

function ProposalCard({ quote, known, flow, onActivate, onDetails }: {
  quote: PricingQuote;
  known: ReturnType<typeof getClaraQualification>;
  flow: FlowMemory;
  onActivate: () => void;
  onDetails: () => void;
}) {
  const p = known.provenance ?? {};
  const row = (label: string, value: string | null | undefined, key: string) =>
    value ? <li key={key}><span>{label}</span> <strong>{value}</strong> <em>{PROVENANCE_LABEL[p[key] ?? "declared"]}</em></li> : null;
  const included = quote.guaranteed_appointments ?? quote.target_monthly_appointments;
  const PLAN: Record<string, string> = { presence: "Présence", depart: "Départ", local: "Départ", croissance_v2: "Croissance", croissance: "Croissance", pro_v2: "Pro", pro: "Pro", elite_v2: "Élite", signature_v2: "Signature" };
  return (
    <article className="home-clara-card" aria-label="Résumé et proposition">
      <p className="home-clara-card-title">Résumé</p>
      <ul className="home-clara-card-facts">
        {row("Entreprise", known.business_name, "business_name")}
        {row("Métier", known.primary_trade, "primary_trade")}
        {row("Clientèle", known.customer_type, "customer_type")}
        {row("Siège", known.business_city, "business_city")}
        {row("Territoires", known.service_areas?.join(", "), "service_areas")}
        {flow.appointments != null && <li><span>RDV le mois prochain</span> <strong>{flow.appointments}</strong> <em>Déclaré</em></li>}
        {flow.avg_value_label && <li><span>Valeur moyenne</span> <strong>{flow.avg_value_label}</strong> <em>Déclaré (tranche)</em></li>}
        <li><span>Taux de conclusion</span> <strong>40 %</strong> <em>Estimation UNPRO</em></li>
      </ul>
      <p className="home-clara-card-title">Entente de départ : {PLAN[quote.recommended_plan] ?? quote.recommended_plan}</p>
      <p className="home-clara-card-meta">{included} rendez-vous exclusifs par mois, jamais partagés.</p>
      <p className="home-clara-card-price">{formatCAD(quote.recommended_monthly_price)} / mois <small>+ TPS 5 % et TVQ 9,975 %</small></p>
      <p className="home-clara-card-meta">Conditions : le détail et le total taxes incluses s’affichent avant le paiement. Le paiement active l’entente, mais ne remplace pas la vérification RBQ exigée avant de recevoir des mandats.</p>
      <button type="button" className="home-clara-card-primary" onClick={onActivate}>Activer mon profil</button>
      <button type="button" className="home-clara-card-link" onClick={onDetails}>Voir les détails de l’analyse</button>
    </article>
  );
}

export default ClaraContractorFlow;
