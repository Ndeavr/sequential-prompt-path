/**
 * UNPRO — Parcours post-1 $ : Alex pose UNE question à la fois.
 *
 * Nouveauté : après services/territoires, l'entrepreneur choisit comment bâtir
 * son plan — par OBJECTIF (combien de RDV je veux) ou par BUDGET (ce que je peux
 * investir). Les deux modes utilisent le même moteur canonique côté serveur
 * (activation-goals → compute-pricing-quote). Aucune garantie n'est inventée ici.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type StepKey =
  | "growth_objective"
  | "desired_project_types"
  | "ideal_project_value_cad"
  | "territories"
  | "pricing_mode"
  | "monthly_appointment_goal"
  | "monthly_budget_cad"
  | "exclusions"
  | "urgency"
  | "exclusivity_preference";

interface Question {
  key: StepKey;
  prompt: string;
  hint?: string;
  kind: "choice" | "multi" | "number" | "list" | "text";
  options?: { value: string | number; label: string; sub?: string }[];
  suffix?: string;
  optional?: boolean;
}

const QUESTIONS: Question[] = [
  {
    key: "growth_objective",
    prompt: "Qu'est-ce que vous voulez accomplir dans les 90 prochains jours ?",
    kind: "choice",
    options: [
      { value: "volume", label: "Remplir mon calendrier" },
      { value: "valeur", label: "Des projets plus payants" },
      { value: "visibilite", label: "Être vu dans ma région" },
      { value: "stabilite", label: "Stabiliser mes revenus" },
    ],
  },
  {
    key: "desired_project_types",
    prompt: "Quels types de projets voulez-vous recevoir ?",
    hint: "Choisissez tout ce qui s'applique.",
    kind: "multi",
    options: [
      { value: "toiture", label: "Toiture" },
      { value: "pavage", label: "Pavage / asphalte" },
      { value: "renovation", label: "Rénovation" },
      { value: "excavation", label: "Excavation" },
      { value: "cvac", label: "CVAC" },
      { value: "autre", label: "Autre" },
    ],
  },
  {
    key: "ideal_project_value_cad",
    prompt: "Quelle est la valeur moyenne d'un projet idéal ?",
    kind: "choice",
    options: [
      { value: 2500, label: "2 500 $" },
      { value: 7500, label: "7 500 $" },
      { value: 15000, label: "15 000 $" },
      { value: 35000, label: "35 000 $ et plus" },
    ],
  },
  {
    key: "territories",
    prompt: "Dans quelles villes voulez-vous travailler ?",
    hint: "Séparez par une virgule.",
    kind: "list",
  },
  {
    key: "pricing_mode",
    prompt: "Comment souhaitez-vous bâtir votre plan ?",
    kind: "choice",
    options: [
      { value: "goal", label: "Par objectif", sub: "Je dis combien de rendez-vous je veux, UNPRO calcule le budget." },
      { value: "budget", label: "Par budget", sub: "Je dis mon budget, UNPRO calcule ce qu'il peut garantir." },
    ],
  },
  {
    key: "monthly_appointment_goal",
    prompt: "Combien de rendez-vous qualifiés voulez-vous par mois ?",
    kind: "choice",
    options: [
      { value: 3, label: "3" },
      { value: 6, label: "6" },
      { value: 12, label: "12" },
      { value: 20, label: "20+" },
    ],
  },
  {
    key: "monthly_budget_cad",
    prompt: "Quel budget mensuel êtes-vous prêt à investir ?",
    hint: "UNPRO calcule ensuite ce qu'il peut réellement garantir pour ce montant.",
    kind: "number",
    suffix: "$ / mois",
    options: [
      { value: 350, label: "350 $" },
      { value: 750, label: "750 $" },
      { value: 1500, label: "1 500 $" },
      { value: 2500, label: "2 500 $ et plus" },
    ],
  },
  {
    key: "exclusions",
    prompt: "Y a-t-il des projets que vous ne voulez jamais recevoir ?",
    hint: "Optionnel.",
    kind: "list",
    optional: true,
  },
  {
    key: "urgency",
    prompt: "À quel rythme voulez-vous démarrer ?",
    kind: "choice",
    options: [
      { value: "immediat", label: "Tout de suite" },
      { value: "30j", label: "D'ici 30 jours" },
      { value: "saison", label: "Pour la prochaine saison" },
    ],
  },
  {
    key: "exclusivity_preference",
    prompt: "Voulez-vous être seul recommandé dans votre secteur ?",
    kind: "choice",
    options: [
      { value: "exclusif", label: "Oui, exclusivité" },
      { value: "partage", label: "Non, je partage le secteur" },
    ],
  },
];

const OUTCOME_COPY: Record<string, string> = {
  budget_resolved: "Voici ce que nous pouvons garantir pour ce budget.",
  goal_resolved: "Voici le budget requis pour atteindre votre objectif.",
  capacity_limited:
    "Votre budget dépasse ce que votre marché peut livrer en ce moment. Nous vous proposons uniquement la configuration soutenable.",
  contractor_capacity_limited:
    "Nous nous arrêtons à votre capacité déclarée : promettre plus serait irréaliste.",
  budget_below_floor:
    "Ce budget ne permet pas de garantir des rendez-vous. Commencez par la présence, ou augmentez le budget.",
  market_unavailable:
    "Votre secteur est complet pour l'instant. Nous vous plaçons sur la liste d'attente prioritaire.",
};

export default function PageActivationGoals() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [required, setRequired] = useState<StepKey[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [draft, setDraft] = useState<string>("");
  const [multi, setMulti] = useState<string[]>([]);

  const call = useCallback(
    async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("activation-goals", {
        body: { token, ...payload },
      });
      if (error) throw error;
      return data as any;
    },
    [token],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await call({ action: "start" });
        const saved = (data?.goals?.answers ?? {}) as Record<string, unknown>;
        setAnswers(saved);
        setRequired((data?.required_steps ?? data?.steps ?? []) as StepKey[]);
        const req = (data?.required_steps ?? data?.steps ?? []) as StepKey[];
        const firstUnanswered = req.findIndex((k) => saved[k] == null);
        setIndex(firstUnanswered === -1 ? req.length : firstUnanswered);
      } catch {
        toast.error("Impossible d'ouvrir votre parcours. Réessayez dans un instant.");
      } finally {
        setLoading(false);
      }
    })();
  }, [call]);

  const queue = useMemo(
    () => QUESTIONS.filter((q) => (required.length ? required.includes(q.key) : true)),
    [required],
  );
  const question = queue[index];

  const submit = useCallback(
    async (value: unknown) => {
      if (!question) return;
      setSaving(true);
      try {
        const data = await call({ action: "save_step", step_key: question.key, value });
        const nextAnswers = { ...answers, [question.key]: value };
        setAnswers(nextAnswers);
        if (data?.required_steps) setRequired(data.required_steps as StepKey[]);
        setDraft("");
        setMulti([]);

        if (data?.complete) {
          const rec = await call({ action: "recommend" });
          setResult(rec?.recommended ?? null);
        } else {
          setIndex((i) => i + 1);
        }
      } catch {
        toast.error("Réponse non enregistrée. Réessayez.");
      } finally {
        setSaving(false);
      }
    },
    [answers, call, question],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = queue.length || 1;
  const progress = Math.round((Math.min(index, total) / total) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Votre plan personnalisé | UNPRO</title>
        <meta name="description" content="Clara bâtit votre plan UNPRO à partir de votre objectif ou de votre budget." />
      </Helmet>

      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => (index > 0 && !result ? setIndex(index - 1) : navigate(-1))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${result ? 100 : progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {result ? "Votre plan" : `Question ${Math.min(index + 1, total)} sur ${total}`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommandation UNPRO</p>
                <h1 className="text-2xl font-bold text-foreground">{result.label}</h1>
                {result.mode_outcome && OUTCOME_COPY[result.mode_outcome] && (
                  <p className="text-sm text-muted-foreground">{OUTCOME_COPY[result.mode_outcome]}</p>
                )}
                {typeof result.personalized_price === "number" && (
                  <p className="text-3xl font-bold text-foreground">
                    {(result.personalized_price / 100).toLocaleString("fr-CA")} $
                    <span className="text-sm font-normal text-muted-foreground"> / mois</span>
                  </p>
                )}
                {typeof result.guaranteed_appointments === "number" && result.guaranteed_appointments > 0 && (
                  <p className="text-sm text-foreground">
                    {result.guaranteed_appointments} rendez-vous qualifiés garantis par mois.
                  </p>
                )}
                {result.reason && <p className="text-sm text-muted-foreground">{result.reason}</p>}
              </div>

              <Button
                size="lg"
                className="w-full h-12 rounded-xl"
                onClick={async () => {
                  try {
                    await call({ action: "accept", value: result.code });
                    navigate(`/entrepreneur/checkout?plan=${result.code}${result.quote_id ? `&quote=${result.quote_id}` : ""}`);
                  } catch {
                    toast.error("Activation impossible pour le moment.");
                  }
                }}
              >
                Activer ce plan
              </Button>
            </motion.div>
          ) : question ? (
            <motion.div key={question.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{question.prompt}</p>
                  {question.hint && <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>}
                </div>
              </div>

              {question.kind === "choice" && (
                <div className="space-y-2">
                  {question.options?.map((o) => (
                    <button
                      key={String(o.value)}
                      disabled={saving}
                      onClick={() => submit(o.value)}
                      className="w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-primary transition disabled:opacity-50"
                    >
                      <span className="text-sm font-medium text-foreground">{o.label}</span>
                      {o.sub && <span className="block text-xs text-muted-foreground mt-0.5">{o.sub}</span>}
                    </button>
                  ))}
                </div>
              )}

              {question.kind === "multi" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {question.options?.map((o) => {
                      const on = multi.includes(String(o.value));
                      return (
                        <button
                          key={String(o.value)}
                          onClick={() =>
                            setMulti((m) => (on ? m.filter((x) => x !== String(o.value)) : [...m, String(o.value)]))
                          }
                          className={`rounded-xl border px-3 py-3 text-sm transition ${
                            on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {on && <Check className="w-3.5 h-3.5 inline mr-1 text-primary" />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <Button className="w-full h-12 rounded-xl" disabled={saving || multi.length === 0} onClick={() => submit(multi)}>
                    Continuer
                  </Button>
                </div>
              )}

              {(question.kind === "number" || question.kind === "list" || question.kind === "text") && (
                <div className="space-y-3">
                  {question.options && (
                    <div className="grid grid-cols-2 gap-2">
                      {question.options.map((o) => (
                        <button
                          key={String(o.value)}
                          disabled={saving}
                          onClick={() => submit(o.value)}
                          className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground hover:border-primary transition disabled:opacity-50"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={draft}
                      inputMode={question.kind === "number" ? "numeric" : "text"}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={question.kind === "list" ? "Laval, Terrebonne" : question.suffix ?? ""}
                      className="h-12 rounded-xl"
                    />
                    <Button
                      className="h-12 rounded-xl px-5"
                      disabled={saving || (!draft.trim() && !question.optional)}
                      onClick={() =>
                        submit(
                          question.kind === "number"
                            ? Number(draft.replace(/[^\d.]/g, "")) || 0
                            : draft
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                        )
                      }
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                    </Button>
                  </div>
                  {question.optional && (
                    <button className="text-xs text-muted-foreground underline" onClick={() => submit([])}>
                      Passer cette question
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
