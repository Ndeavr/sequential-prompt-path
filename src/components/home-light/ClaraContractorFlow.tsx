import { peekClaraSessionToken } from "@/services/clara/claraSession";
import { captureClaraContractorAnswer } from "@/services/clara/claraQualificationSummary";
import ClaraQualificationPreview from "./ClaraQualificationPreview";
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
import { declaredVoiceNumber } from "@/services/clara/claraNextStep";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, ExternalLink, MapPin, Phone, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getClaraQualification,
  resumeClaraQualification,
  isAddressAnswer,
  CLARA_ADDRESS_CLARIFICATION,
  saveClaraQualification,
  type ClaraProvenance,
} from "@/services/clara/claraContractorQualification";
import { OFFER_350 } from "@/lib/copy/offer350";
import { Button } from "@/components/ui/button";
import { prepareClaraPricingDraft } from "@/services/clara/claraNextStep";
import { activationCloseAnswer, claraActivationLinks } from "@/services/clara/claraActivationClose";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
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
  primary_category?: string;
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
  | "preferences" | "preferences_review" | "trade" | "customer" | "areas" | "goal_detail" | "goal_detail2" | "appointments"
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
  captureVoice: (text: string) => void;
  resumeAfterVoice: () => void;
  continueToProposal: () => Promise<void>;
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
  const location = useLocation();
  const [opening, setOpening] = useState(false);
  const openingRef = useRef(false);
  const [step, setStep] = useState<Step>("name");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [goals, setGoals] = useState<GoalKey[]>([]);
  const [freeGoal, setFreeGoal] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const proposalReadyRef = useRef(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [retry, setRetry] = useState<null | (() => void)>(null);
  const startedRef = useRef(false);
  const pendingVoiceSummary = useRef<Promise<unknown> | null>(null);
  const currentQuestion = useRef("");
  const stepRef = useRef<Step>("name");
  stepRef.current = step;

  const go = useCallback(async (next: Step, question?: string) => {
    if (question) { currentQuestion.current = question; await say(question); }
    setStep(next);
  }, [say]);

  /* ----------------------------------------------------- 1. Nom / site */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void trackFunnelStep("home_contractor_click", { metadata: { surface: "home_clara_chat" } });
    void (async () => {
    try { await resumeClaraQualification(); } catch { setSummaryError("La reprise serveur est indisponible. Vos informations locales sont conservées."); }
    const known = getClaraQualification();
    if (known.business_name) {
      void (async () => {
        await say(`Je reprends avec ${known.business_name}. Vos informations précédentes sont conservées.`);
        if (known.goals?.length && readFlow().priority) {
          await runAudit();
        } else {
          await askGoals();
        }
      })();
      return;
    }
    void go("name", "Quel est le nom de votre entreprise ou son site Web?");
    })();
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
    const trade = c.primary_category || null;
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
    const goal = GOALS.find((g) => g.key === key);
    if (!goal) return;
    addUser(goal.label);
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
        await say("Les données sont insuffisantes pour présenter des constats fiables. Nous pouvons poursuivre sans inventer de score.");
        await nextQuestion();
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
    if (!k.primary_trade || k.provenance?.primary_trade !== "declared") {
      return go("trade", k.primary_trade
        ? `Google indique « ${k.primary_trade} ». Quel est votre métier principal?`
        : "Quel est votre métier principal?");
    }
    if (!k.service_areas?.length) {
      return go("areas", k.business_city
        ? `Votre entreprise est à ${k.business_city}. Dans quelles villes acceptez-vous des mandats?`
        : "Dans quelles villes acceptez-vous des mandats?");
    }
    return buildProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  const answer = useCallback(async (text: string, current: Step) => {
    const clean = text.trim();
    if (!clean) return;
    const num = Number((clean.match(/\d[\d\s]*/)?.[0] ?? "").replace(/\s/g, ""));
    if (["preferences", "trade", "customer", "areas", "goal_detail2"].includes(current) || (current === "goal_detail" && readFlow().priority === "matching")) {
      onBusy(true);
      setSummaryError(null);
      try {
        const question = current === "areas" ? "Quelles villes desservez-vous?" : current === "trade" ? "Quel est votre métier?" : current === "customer" ? "Quelle clientèle desservez-vous?" : "Décrivez votre contrat idéal et les mandats à éviter.";
        const result = await captureClaraContractorAnswer(clean, currentQuestion.current || question);
        if (result.clarification) { currentQuestion.current = result.clarification; await say(result.clarification); return; }
        const known = getClaraQualification();
        if (current === "preferences") {
          if (!known.preferred_work?.length && !known.preferred_project_sizes?.length && !known.excluded_areas?.length) {
            await say("Quel genre de travaux aimez-vous particulièrement réaliser?"); return;
          }
          saveClaraQualification({ preferences_captured: true, preferences_confirmed: false });
        }
        if (current === "goal_detail" && known.preferred_work?.length) writeFlow({ prefer: known.preferred_work.join(", ") });
        if (current === "goal_detail2") {
          const avoid = [...(known.excluded_work ?? []), ...(known.excluded_areas ?? [])].join(", ");
          if (!avoid && !/^(aucun|aucune|rien|pas de préférence)/i.test(clean)) { await say("Quels types de mandats préférez-vous éviter?"); return; }
          writeFlow({ avoid: avoid || "Aucune exclusion déclarée" });
        }
        await nextQuestion();
      } catch { await say("Je n’ai pas pu résumer votre réponse. Vos critères sont conservés; vous pouvez réessayer."); }
      finally { onBusy(false); }
      return;
    }
    switch (current) {
      case "goal_detail": {
        const p = readFlow().priority;
        if (p === "contracts") writeFlow({ contract_goal: num > 0 ? num : 1 });
        else if (p === "matching") writeFlow({ prefer: clean.slice(0, 200) });
        else writeFlow({ time_sink: clean.slice(0, 200) });
        break;
      }
      case "goal_detail2": writeFlow({ avoid: clean.slice(0, 200) }); break;
      case "appointments": {
        if (!/^\d+$/.test(clean) || num > 60) {
          await say("Indiquez un nombre de rendez-vous entre 0 et 60.");
          return;
        }
        writeFlow({ appointments: num });
        if (num === 0) {
          await say("Je conserve votre capacité à 0. Aucun forfait de rendez-vous ne sera proposé tant que vous n’avez pas de disponibilité. Combien de rendez-vous pourrez-vous accueillir lorsque vous serez disponible?");
          return;
        }
        break;
      }
      case "avg_value": {
        const map: Record<string, number> = { "Moins de 2 000 $": 1500, "2 000 à 5 000 $": 3500, "5 000 à 15 000 $": 10000, "Plus de 15 000 $": 20000 };
        writeFlow({ avg_value: map[clean] ?? Math.max(200, num || 3500), avg_value_label: clean });
        break;
      }
      default: return;
    }
    await nextQuestion();
  }, [nextQuestion, onBusy, say]);

  const pick = useCallback(async (label: string, current: Step) => {
    addUser(label);
    await answer(label, current);
  }, [addUser, answer]);

  /* ------------------------------------------------ 7. Proposition */
  const buildProposal = useCallback(async () => {
    proposalReadyRef.current = true;
    setStep("proposal");
    void trackFunnelStep("plan_presented", { offer: "entry_activation_350", metadata: { surface: "home_clara_chat" } });
    await say(`${OFFER_350.alexBeforeCalculation} Prêt à activer votre profil pour 350 $ + taxes?`);
  }, [say]);

  const openActivation = async (more = false) => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setSummaryError(null);
    try {
      prepareClaraPricingDraft();
      const links = claraActivationLinks(location.search);
      void logFunnelEvent({ event_type: "activation_cta_clicked", metadata: { surface: "home_clara_chat", option: more ? "appointments" : "base", ref: new URLSearchParams(location.search).get("ref") } });
      navigate(more ? links.more : links.activate, { state: { fromClara: true, claraIntent: "contractor_onboarding" } });
    } catch {
      setSummaryError("Vos informations sont conservées. Réessayez pour ouvrir votre activation.");
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  };

  /* --------------------------------------------- réponses libres (composer) */
  useImperativeHandle(ref, () => ({
    continueToProposal: async () => {
      await pendingVoiceSummary.current;
      if (proposalReadyRef.current) return;
      if (!["name", "pick", "goals", "priority", "proposal"].includes(stepRef.current)) await nextQuestion();
    },
    captureVoice: (text: string) => {
      const close = activationCloseAnswer(text);
      if (close) { setStep("proposal"); proposalReadyRef.current = true; return; }
      const current = stepRef.current;
      if (["appointments", "avg_value"].includes(current) || (current === "goal_detail" && readFlow().priority === "contracts")) {
        const token = peekClaraSessionToken();
        pendingVoiceSummary.current = Promise.resolve(pendingVoiceSummary.current).then(async () => {
          if (peekClaraSessionToken() !== token) return;
          const value = declaredVoiceNumber(text);
          if (value == null || (current !== "avg_value" && !Number.isInteger(value)) || (current === "appointments" && value > 60) || (current !== "appointments" && value <= 0)) {
            setSummaryError("Ce nombre n’est pas assez précis. Indiquez une seule valeur pour continuer.");
            return;
          }
          setSummaryError(null);
          if (current === "appointments") writeFlow({ appointments: value });
          else if (current === "avg_value") writeFlow({ avg_value: value, avg_value_label: text });
          else writeFlow({ contract_goal: value });
          await nextQuestion();
        });
        return;
      }
      if (!["goals", "preferences", "trade", "customer", "areas", "goal_detail", "goal_detail2"].includes(stepRef.current)) return;
      const token = peekClaraSessionToken();
      const question = currentQuestion.current;
      const task = Promise.resolve(pendingVoiceSummary.current).then(() => {
        if (peekClaraSessionToken() !== token) throw new Error("Conversation changed");
        return captureClaraContractorAnswer(text, question);
      }).then(result => {
        if (result.clarification) currentQuestion.current = result.clarification;
        const k = getClaraQualification();
        if (k.preferred_work?.length || k.preferred_project_sizes?.length) saveClaraQualification({ preferences_captured: true, preferences_confirmed: false });
      }).catch(() => setSummaryError("Cette réponse vocale n’a pas pu être résumée. Vos critères précédents sont conservés."));
      pendingVoiceSummary.current = task;
    },
    resumeAfterVoice: () => { if (!["name", "pick", "goals", "priority", "proposal"].includes(stepRef.current)) void Promise.resolve(pendingVoiceSummary.current).then(() => nextQuestion()); },
    handleText: (text: string) => {
      const s = stepRef.current;
      const close = activationCloseAnswer(text);
      if (close) {
        addUser(text);
        setStep("proposal");
        proposalReadyRef.current = true;
        void trackFunnelStep("plan_presented", { offer: "entry_activation_350", metadata: { surface: "home_clara_chat" } });
        void say(close);
        return true;
      }
      if (isAddressAnswer(text)) { addUser(text); void say(CLARA_ADDRESS_CLARIFICATION); return true; }
      if (s === "name" || s === "pick") { addUser(text); void search(text); return true; }
      if (s === "goals") {
        const g = goals; addUser(text); onBusy(true);
        void (async () => {
          try {
            const result = await captureClaraContractorAnswer(text, "Qu’aimeriez-vous améliorer pour votre entreprise?");
            if (result.clarification) { await say(result.clarification); return; }
            const known = getClaraQualification();
            if (!known.goals?.length) { await say("Qu’aimeriez-vous améliorer pour votre entreprise?"); return; }
            if (known.preferred_work?.length || known.preferred_project_sizes?.length) saveClaraQualification({ preferences_captured: true, preferences_confirmed: false });
            writeFlow({ priority: g[0] ?? "other" });
            void trackFunnelStep("goals_completed", { metadata: { surface: "home_clara_chat", free: true } });
            await runAudit();
          } catch { await say("Je n’ai pas pu résumer votre réponse. Vous pouvez réessayer."); }
          finally { onBusy(false); }
        })(); return true;
      }
      if (["preferences", "trade", "customer", "areas", "goal_detail", "goal_detail2", "appointments", "avg_value"].includes(s)) {
        addUser(text); void answer(text, s); return true;
      }
      return false;
    },
  }), [addUser, answer, goals, runAudit, search, say, nextQuestion, onBusy]);

  /* ------------------------------------------------------------ rendu */
  const known = getClaraQualification();
  const flow = readFlow();

  if (step === "pick") {
    return (
      <div className="home-clara-flow" aria-label="Fiches Google trouvées">
        {candidates.map((c) => (
          <article key={c.place_id} className="home-clara-card">
            <p className="home-clara-card-title">{c.business_name}</p>
            {c.primary_category ? <p className="home-clara-card-meta">{c.primary_category}</p> : null}
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
        {goals.map((k) => <button key={k} type="button" onClick={() => void choosePriority(k)}>{GOALS.find((g) => g.key === k)?.label}</button>)}
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
    <AuditCard audit={audit} known={known} />
  ) : null;

  return (
    <div className="home-clara-flow">
      {summaryError && <p role="alert" className="home-clara-card-meta">{summaryError}</p>}
      <ClaraQualificationPreview onConfirm={step === "preferences_review" ? () => void nextQuestion() : undefined} />
      {auditCard}
      {quick[step]?.length ? (
        <div className="home-clara-quick" role="group" aria-label="Réponses rapides">
          {quick[step]?.map((o) => <button key={o} type="button" onClick={() => void pick(o, step)}>{o}</button>)}
        </div>
      ) : null}
      {step === "failed" && retry && (
        <div className="home-clara-quick"><button type="button" onClick={() => retry()}>Réessayer</button></div>
      )}
      {step === "proposal" && (
        <ProposalCard
          known={known}
          opening={opening}
          onActivate={() => void openActivation()}
          onMore={() => void openActivation(true)}
        />
      )}
    </div>
  );
});

function AuditCard({ audit, known }: { audit: AuditResult; known: ReturnType<typeof getClaraQualification> }) {
  const isPublic = known.provenance?.business_name === "public";
  const partial = !audit.baseline.matched.merged_sources.length || audit.readiness_score == null;
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
      {isPublic && (
        <p className="home-clara-card-meta">
          Trouvé publiquement (Google) : {[known.business_name, known.business_city, known.phone && "téléphone", known.website && "site Web"].filter(Boolean).join(", ")}
        </p>
      )}
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
      <a className="home-clara-card-link" href="/entrepreneurs/audit-ia">Découvrir mon score IA</a>
    </article>
  );
}

function ProposalCard({ known, opening, onActivate, onMore }: {
  known: ReturnType<typeof getClaraQualification>;
  opening: boolean;
  onActivate: () => void;
  onMore: () => void;
}) {
  const p = known.provenance ?? {};
  const row = (label: string, value: string | null | undefined, key: string) =>
    value ? <li key={key}><span>{label}</span> <strong>{value}</strong> <em>{PROVENANCE_LABEL[p[key] ?? "declared"]}</em></li> : null;
  return (
    <article className="home-clara-card" aria-label="Résumé et proposition">
      <p className="home-clara-card-title">Résumé</p>
      <ul className="home-clara-card-facts">
        {row("Entreprise", known.business_name, "business_name")}
        {row("Métier", known.primary_trade, "primary_trade")}
        {row("Clientèle", known.customer_type, "customer_type")}
        {row("Siège", known.business_city, "business_city")}
        {row("Territoires", known.service_areas?.join(", "), "service_areas")}
      </ul>
      <p className="home-clara-card-title">{OFFER_350.card.title}</p>
      <p className="home-clara-card-meta">Vos services, vos spécialités et votre territoire, présentés clairement sur UNPRO pendant 12 mois. Pas un achat de clics ni de leads partagés.</p>
      <p className="home-clara-card-price">{OFFER_350.price_label} <small>+ taxes · une seule fois</small></p>
      <p className="home-clara-card-meta">Aucun rendez-vous inclus. Aucune apparition garantie dans ChatGPT. Le paiement ne remplace pas la vérification des licences requises.</p>
      <Button type="button" size="lg" className="home-clara-card-primary h-auto min-h-11 w-full whitespace-normal py-3" disabled={opening} onClick={onActivate}>{opening ? "Préparation de votre activation…" : OFFER_350.ctaActivate}</Button>
      <Button type="button" variant="link" className="h-auto min-h-11 w-full whitespace-normal" disabled={opening} onClick={onMore}>Je veux aussi des rendez-vous exclusifs</Button>
    </article>
  );
}

export default ClaraContractorFlow;
