/**
 * UNPRO — Questionnaire entrepreneur via lien sécurisé (sans compte).
 * Route : /profil-entrepreneur/:token
 * Le jeton est résolu côté serveur ; aucune donnée d'une autre fiche n'est accessible.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  COMPAT_STEPS,
  PREQUAL_LEVEL_LABEL,
  STANCE_LABEL,
  TERRITORY_TIER_LABEL,
  TOTAL_COMPAT_STEPS,
  TRI_LABEL,
  VOLUME_OPTIONS,
  citySlug,
  formatMoney,
  type PrequalLevel,
  type Stance,
  type TerritoryTier,
  type TriAnswer,
} from "@/config/compatibilityExcavation";
import { getCompatPack, packVisibleProjectQuestions } from "@/config/compatibilityPacks";
import { EMPTY_ANSWERS, type CompatibilityAnswers } from "@/hooks/useContractorCompatibility";

const STANCES: Stance[] = ["priority", "accepted", "not_wanted"];
const TRIS: TriAnswer[] = ["yes", "depends", "no"];
const TIERS: TerritoryTier[] = ["priority", "normal", "large_only", "blocked"];
const LEVELS: PrequalLevel[] = ["optional", "important", "required"];

interface Fact {
  field_key: string;
  field_label: string | null;
  field_value: unknown;
  provenance: string;
  source_url: string | null;
  confirmed_at: string | null;
}

interface ResolvedInvite {
  already_submitted: boolean;
  trade_pack?: string;
  contractor: {
    id: string;
    business_name: string;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    specialty: string | null;
    rbq_number: string | null;
  };
  facts: Fact[];
  service_areas: string[];
  profile: { answers?: unknown; current_step?: number; status?: string } | null;
}

const PROVENANCE_LABEL: Record<string, string> = {
  public_source: "Source publique",
  confirmed_by_company: "Confirmé par l'entreprise",
  verified_unpro: "Vérifié par UNPRO",
};

function moneyToCents(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n * 100 : null;
}

function factText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return [String(value)];
}

function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type Phase = "welcome" | "confirm" | "questionnaire" | "summary";

export default function PageContractorProfileInvite() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResolvedInvite | null>(null);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<CompatibilityAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [patch, setPatch] = useState<Record<string, string>>({});
  const [newCity, setNewCity] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const call = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const { data: res, error: err } = await supabase.functions.invoke("contractor-profile-token", {
        body: { token, action, ...payload },
      });
      if (err) throw err;
      if ((res as any)?.error) throw new Error((res as any).error);
      return res as any;
    },
    [token],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await call("resolve");
        if (!active) return;
        setData(res);
        const stored = res.profile?.answers as Partial<CompatibilityAnswers> | undefined;
        setAnswers({
          ...EMPTY_ANSWERS,
          ...(stored ?? {}),
          services: stored?.services ?? {},
          projects: stored?.projects ?? {},
          money: stored?.money ?? {},
          territories:
            stored?.territories?.length
              ? stored.territories
              : (res.service_areas ?? []).map((c: string) => ({
                  city_name: c,
                  city_slug: citySlug(c),
                  tier: "normal" as TerritoryTier,
                  min_project_cents: null,
                })),
          capacity: stored?.capacity ?? {},
          prequal: stored?.prequal ?? {},
          critical_notes: stored?.critical_notes?.length ? stored.critical_notes : ["", "", ""],
        });
        setStep(Math.min(Math.max(res.profile?.current_step ?? 1, 1), TOTAL_COMPAT_STEPS));
      } catch (e: any) {
        if (active) setError(e?.message === "Failed to send a request to the Edge Function" ? "Lien invalide." : e?.message || "Lien invalide.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [call]);

  const persist = useCallback(
    async (next: CompatibilityAnswers, nextStep: number, finalize = false) => {
      setSaving(true);
      try {
        const res = await call(finalize ? "finalize" : "save", {
          answers: next,
          current_step: nextStep,
        });
        setSavedAt(new Date());
        return res;
      } catch {
        toast.error("Sauvegarde impossible pour l'instant. Vos réponses restent à l'écran.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [call],
  );

  const update = useCallback(
    (patchFn: ((a: CompatibilityAnswers) => CompatibilityAnswers) | Partial<CompatibilityAnswers>) => {
      setAnswers((prev) => {
        const next = typeof patchFn === "function" ? patchFn(prev) : { ...prev, ...patchFn };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist(next, step), 1200);
        return next;
      });
    },
    [persist, step],
  );

  const goToStep = useCallback(
    async (n: number) => {
      const clamped = Math.min(Math.max(n, 1), TOTAL_COMPAT_STEPS);
      setStep(clamped);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (timer.current) clearTimeout(timer.current);
      await persist(answers, clamped);
    },
    [answers, persist],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const pack = useMemo(() => getCompatPack(data?.trade_pack), [data?.trade_pack]);

  const projectQuestions = useMemo(
    () =>
      packVisibleProjectQuestions(
        pack,
        Object.fromEntries(Object.entries(answers.services).map(([k, v]) => [k, v.stance])),
      ),
    [pack, answers.services],
  );

  const groupedProjects = useMemo(() => {
    const map = new Map<string, typeof projectQuestions>();
    projectQuestions.forEach((q) => {
      if (!map.has(q.dimension)) map.set(q.dimension, []);
      map.get(q.dimension)!.push(q);
    });
    return Array.from(map.entries());
  }, [projectQuestions]);

  const dimensionTitles: Record<string, string> = {
    project_type: "Types de projets",
    foundation: "Types de fondations",
    crack: "Fissures",
    water: "Eau et intérieur",
    drainage: "Drainage",
    access: "Accès et contraintes",
    attic: "Entretoit et accès",
    size: "Taille des mandats",
    contamination: "Contamination",
    ventilation: "Ventilation",
    envelope: "Enveloppe et diagnostics",
    roof_special: "Toits particuliers",
    availability: "Délais et disponibilité",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <Helmet><title>Lien indisponible | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
        <h1 className="text-xl font-semibold text-foreground">Lien indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "Ce lien n'est plus valide."}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Écrivez-nous pour obtenir un nouveau lien.
        </p>
      </div>
    );
  }

  const company = data.contractor.business_name;
  const shortName = company.split("/")[0].trim();

  // ── Écran d'accueil ───────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <div className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-10">
        <Helmet><title>Complétez votre profil {shortName} | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
        <Badge variant="secondary" className="mb-4">UNPRO</Badge>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          Complétez votre profil {shortName}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Aidez UNPRO à mieux comprendre les projets que vous recherchez afin de vous proposer des
          propriétaires qui correspondent réellement à vos services.
        </p>

        {data.already_submitted && (
          <Card className="mt-5 border-primary/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-foreground">Profil déjà complété</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vous pouvez mettre à jour vos projets recherchés, votre capacité ou vos priorités.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-5">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Nous avons prérempli votre profil à partir d'informations publiques. Vérifiez-les et
              corrigez ce qui doit l'être.
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li>{company}</li>
              {data.contractor.phone && <li>{data.contractor.phone}</li>}
              {data.contractor.website && <li className="break-all">{data.contractor.website}</li>}
              {data.contractor.rbq_number && <li>RBQ {data.contractor.rbq_number} — affichée publiquement</li>}
            </ul>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-lg">
            <Button className="h-12 w-full text-[15px]" onClick={() => setPhase("confirm")}>
              {data.already_submitted ? "Mettre à jour mes projets recherchés" : "Commencer — environ 5 minutes"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 1 : confirmation de la fiche ────────────────────────────
  if (phase === "confirm") {
    const blocks: { key: string; label: string; values: string[]; editable?: boolean }[] = [
      { key: "business_name", label: "Nom de l'entreprise", values: [company], editable: true },
      { key: "phone", label: "Téléphone", values: factText(data.contractor.phone), editable: true },
      { key: "website", label: "Site web", values: factText(data.contractor.website), editable: true },
      {
        key: "services_public",
        label: "Services trouvés publiquement",
        values: factText(data.facts.find((f) => f.field_key === "services_public")?.field_value),
      },
      {
        key: "territories_public",
        label: "Territoires trouvés publiquement",
        values: data.service_areas.length
          ? data.service_areas
          : factText(data.facts.find((f) => f.field_key === "territories_public")?.field_value),
      },
      {
        key: "rbq",
        label: "Licence RBQ affichée",
        values: factText(data.contractor.rbq_number),
      },
    ];

    const submitConfirm = async () => {
      setSaving(true);
      try {
        await call("confirm_facts", {
          facts: Object.keys(confirmed)
            .filter((k) => confirmed[k])
            .map((k) => ({ field_key: k, provenance: "confirmed_by_company" })),
          contractor_patch: patch,
        });
        setData((d) =>
          d
            ? {
                ...d,
                contractor: {
                  ...d.contractor,
                  business_name: patch.business_name || d.contractor.business_name,
                  phone: patch.phone || d.contractor.phone,
                  website: patch.website || d.contractor.website,
                },
              }
            : d,
        );
        setPhase("questionnaire");
        window.scrollTo({ top: 0 });
      } catch {
        toast.error("Impossible d'enregistrer vos confirmations pour l'instant.");
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
        <Helmet><title>Confirmez vos informations | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Confirmez vos informations
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ces données proviennent de sources publiques. Rien n'est présenté comme vérifié par UNPRO
          tant que vous ne l'avez pas confirmé.
        </p>

        <div className="mt-5 space-y-3">
          {blocks.map((b) => (
            <Card key={b.key} className={cn(confirmed[b.key] && "border-primary/40")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {b.label}
                    </p>
                    {editing[b.key] && b.editable ? (
                      <Input
                        className="mt-2"
                        defaultValue={b.values[0] ?? ""}
                        onChange={(e) => setPatch((p) => ({ ...p, [b.key]: e.target.value }))}
                      />
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(patch[b.key] ? [patch[b.key]] : b.values).length ? (
                          (patch[b.key] ? [patch[b.key]] : b.values).map((v) => (
                            <span key={v} className="break-words text-sm text-foreground">
                              {v}
                              {b.values.length > 1 ? " ·" : ""}&nbsp;
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Non trouvé</span>
                        )}
                      </div>
                    )}
                  </div>
                  {confirmed[b.key] && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={confirmed[b.key] ? "default" : "outline"}
                    onClick={() => {
                      setConfirmed((c) => ({ ...c, [b.key]: true }));
                      setEditing((e) => ({ ...e, [b.key]: false }));
                    }}
                  >
                    Exact
                  </Button>
                  {b.editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing((e) => ({ ...e, [b.key]: !e[b.key] }))}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
                    </Button>
                  )}
                </div>
                {b.key === "services_public" && (
                  <p className="text-xs text-muted-foreground">
                    Drain français, injection de fissures, imperméabilisation, membranes et puisards
                    ne sont pas présumés : vous les confirmerez à l'étape suivante.
                  </p>
                )}
                {b.key === "rbq" && (
                  <p className="text-xs text-muted-foreground">
                    Statut actuel : source publique. UNPRO ne la présente pas comme vérifiée.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setPhase("welcome")} aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button className="h-12 flex-1 text-[15px]" disabled={saving} onClick={submitConfirm}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Continuer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Résumé final ──────────────────────────────────────────────────
  if (phase === "summary") {
    const label = (slug: string) => pack.services.find((s) => s.slug === slug)?.label ?? slug;
    const qLabel = (k: string) =>
      projectQuestions.find((q) => `${q.dimension}:${q.key}` === k)?.label ?? k;
    const priority = Object.entries(answers.services).filter(([, v]) => v.stance === "priority");
    const refused = Object.entries(answers.services).filter(([, v]) => v.stance === "not_wanted");

    return (
      <div className="mx-auto min-h-screen max-w-lg px-5 pb-10 pt-8">
        <Helmet><title>Profil confirmé | UNPRO</title><meta name="robots" content="noindex" /></Helmet>
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Profil de compatibilité complété</span>
        </div>
        <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-foreground">
          Merci. Voici comment UNPRO comprend {shortName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nous utiliserons ces informations pour mieux déterminer quels projets correspondent à {shortName}.
        </p>

        <div className="mt-5 space-y-3">
          <Card><CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services prioritaires</p>
            <p className="mt-1.5 text-sm text-foreground">
              {priority.length ? priority.map(([s]) => label(s)).join(" · ") : "Aucun service marqué prioritaire"}
            </p>
            {refused.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Projets refusés :</span>{" "}
                {refused.map(([s]) => label(s)).join(" · ")}
              </p>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Montant minimum et projet idéal</p>
            <p className="mt-1.5 text-sm text-foreground">
              Minimum {formatMoney(answers.money.floor_project_cents)} · Idéal{" "}
              {formatMoney(answers.money.ideal_min_cents)} à {formatMoney(answers.money.ideal_max_cents)}
            </p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Territoires prioritaires</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {answers.territories.length
                ? answers.territories.map((t) => (
                    <Badge key={t.city_slug} variant="secondary">
                      {t.city_name} · {TERRITORY_TIER_LABEL[t.tier]}
                    </Badge>
                  ))
                : <span className="text-sm text-muted-foreground">Aucun territoire précisé</span>}
            </div>
          </CardContent></Card>

          <Card><CardContent className="space-y-2 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projets recherchés</p>
            <p className="text-sm text-foreground">
              {Object.entries(answers.projects).filter(([, v]) => v.answer === "yes").map(([k]) => qLabel(k)).join(" · ") || "—"}
            </p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capacité actuelle</p>
            <p className="mt-1.5 text-sm text-foreground">
              {answers.capacity.projects_per_month ? `${answers.capacity.projects_per_month} projets/mois` : "Non précisée"}
              {answers.capacity.lead_time_weeks ? ` · démarrage en ${answers.capacity.lead_time_weeks} semaine(s)` : ""}
              {answers.capacity.paused ? " · agenda en pause" : ""}
            </p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avant un rendez-vous</p>
            <p className="mt-1.5 text-sm text-foreground">
              {Object.entries(answers.prequal)
                .filter(([, l]) => l !== "optional")
                .map(([c, l]) => `${pack.prequal.find((p) => p.criterion === c)?.label ?? c} (${PREQUAL_LEVEL_LABEL[l]})`)
                .join(" · ") || "Aucune exigence particulière"}
            </p>
          </CardContent></Card>
        </div>

        <Button
          variant="outline"
          className="mt-6 h-12 w-full"
          onClick={() => { setPhase("questionnaire"); void goToStep(1); }}
        >
          Mettre à jour mes projets recherchés
        </Button>
      </div>
    );
  }

  // ── Questionnaire ─────────────────────────────────────────────────
  const current = COMPAT_STEPS[step - 1];
  const progress = Math.round(((step - 1) / TOTAL_COMPAT_STEPS) * 100);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 pb-32 pt-5">
      <Helmet><title>Questionnaire {shortName} | UNPRO</title><meta name="robots" content="noindex" /></Helmet>

      <div className="sticky top-0 z-30 -mx-5 bg-background/90 px-5 pb-3 pt-2 backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Étape {step} sur {TOTAL_COMPAT_STEPS}</span>
          <span className="flex items-center gap-1">
            {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</>
              : savedAt ? <><Check className="h-3 w-3 text-primary" /> Enregistré</> : null}
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
      </div>

      <div className="mt-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{current.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.subtitle}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-5 space-y-3"
        >
          {step === 1 && pack.services.map((svc) => (
            <Card key={svc.slug}>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium text-foreground">{svc.label}</p>
                <ChoiceRow
                  options={STANCES.map((s) => ({ value: s, label: STANCE_LABEL[s] }))}
                  value={answers.services[svc.slug]?.stance}
                  onChange={(v) =>
                    update((a) => ({
                      ...a,
                      services: { ...a.services, [svc.slug]: { ...a.services[svc.slug], stance: v as Stance } },
                    }))
                  }
                />
              </CardContent>
            </Card>
          ))}

          {step === 2 && (
            groupedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choisissez d'abord au moins un service à l'étape précédente.
              </p>
            ) : groupedProjects.map(([dim, questions]) => (
              <div key={dim} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {dimensionTitles[dim] ?? dim}
                </p>
                {questions.map((q) => {
                  const k = `${q.dimension}:${q.key}`;
                  const val = answers.projects[k];
                  return (
                    <Card key={k}>
                      <CardContent className="space-y-3 p-4">
                        <p className="text-sm font-medium text-foreground">{q.label}</p>
                        <ChoiceRow
                          options={TRIS.map((t) => ({ value: t, label: TRI_LABEL[t] }))}
                          value={val?.answer}
                          onChange={(v) =>
                            update((a) => ({
                              ...a,
                              projects: { ...a.projects, [k]: { ...a.projects[k], answer: v as TriAnswer } },
                            }))
                          }
                        />
                        {val?.answer === "depends" && (
                          <Textarea
                            placeholder="Dans quelles conditions ?"
                            value={val.condition_note ?? ""}
                            onChange={(e) =>
                              update((a) => ({
                                ...a,
                                projects: { ...a.projects, [k]: { answer: "depends", condition_note: e.target.value } },
                              }))
                            }
                            rows={2}
                            className="text-sm"
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))
          )}

          {step === 3 && (
            <>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">À partir de quel montant un projet devient-il intéressant pour vous ?</Label>
                <Input
                  inputMode="numeric"
                  placeholder="5 000"
                  defaultValue={answers.money.floor_project_cents ? answers.money.floor_project_cents / 100 : ""}
                  onChange={(e) => update((a) => ({ ...a, money: { ...a.money, floor_project_cents: moneyToCents(e.target.value) } }))}
                />
              </CardContent></Card>
              <Card><CardContent className="space-y-3 p-4">
                <Label className="text-sm">Quel montant représente votre projet idéal ?</Label>
                <div className="flex gap-3">
                  <Input inputMode="numeric" placeholder="Min $"
                    defaultValue={answers.money.ideal_min_cents ? answers.money.ideal_min_cents / 100 : ""}
                    onChange={(e) => update((a) => ({ ...a, money: { ...a.money, ideal_min_cents: moneyToCents(e.target.value) } }))} />
                  <Input inputMode="numeric" placeholder="Max $"
                    defaultValue={answers.money.ideal_max_cents ? answers.money.ideal_max_cents / 100 : ""}
                    onChange={(e) => update((a) => ({ ...a, money: { ...a.money, ideal_max_cents: moneyToCents(e.target.value) } }))} />
                </div>
              </CardContent></Card>
              <Card><CardContent className="space-y-3 p-4">
                <Label className="text-sm">Vous préférez</Label>
                <ChoiceRow
                  options={VOLUME_OPTIONS as unknown as { value: string; label: string }[]}
                  value={answers.money.volume_preference}
                  onChange={(v) => update((a) => ({ ...a, money: { ...a.money, volume_preference: v } }))}
                />
              </CardContent></Card>
              <Card><CardContent className="space-y-3 p-4">
                <Label className="text-sm">Les 3 types de projets que vous aimeriez recevoir davantage</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    placeholder={`Type de projet ${i + 1}`}
                    defaultValue={answers.critical_notes[i] ?? ""}
                    onChange={(e) =>
                      update((a) => {
                        const notes = [...a.critical_notes];
                        notes[i] = e.target.value;
                        return { ...a, critical_notes: notes };
                      })
                    }
                  />
                ))}
              </CardContent></Card>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-xs text-muted-foreground">
                Villes trouvées à partir de vos informations publiques. Ajustez, ajoutez ou retirez.
              </p>
              {answers.territories.map((t, i) => (
                <Card key={t.city_slug}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{t.city_name}</p>
                      <button
                        type="button"
                        aria-label={`Retirer ${t.city_name}`}
                        onClick={() => update((a) => ({ ...a, territories: a.territories.filter((_, j) => j !== i) }))}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <ChoiceRow
                      options={TIERS.map((tier) => ({ value: tier, label: TERRITORY_TIER_LABEL[tier] }))}
                      value={t.tier}
                      onChange={(v) =>
                        update((a) => ({
                          ...a,
                          territories: a.territories.map((x, j) => (j === i ? { ...x, tier: v as TerritoryTier } : x)),
                        }))
                      }
                    />
                    {t.tier === "large_only" && (
                      <Input
                        inputMode="numeric"
                        placeholder="Montant minimum pour cette zone ($)"
                        defaultValue={t.min_project_cents ? t.min_project_cents / 100 : ""}
                        onChange={(e) =>
                          update((a) => ({
                            ...a,
                            territories: a.territories.map((x, j) =>
                              j === i ? { ...x, min_project_cents: moneyToCents(e.target.value) } : x,
                            ),
                          }))
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Ajouter une ville" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const name = newCity.trim();
                    if (!name) return;
                    const slug = citySlug(name);
                    if (answers.territories.some((t) => t.city_slug === slug)) { setNewCity(""); return; }
                    update((a) => ({
                      ...a,
                      territories: [...a.territories, { city_name: name, city_slug: slug, tier: "normal", min_project_cents: null }],
                    }));
                    setNewCity("");
                  }}
                  aria-label="Ajouter la ville"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">Combien de nouveaux projets pouvez-vous prendre par semaine ?</Label>
                <Input inputMode="numeric" placeholder="2"
                  defaultValue={answers.capacity.projects_per_month ?? ""}
                  onChange={(e) => update((a) => ({ ...a, capacity: { ...a.capacity, projects_per_month: Number(e.target.value) || null } }))} />
              </CardContent></Card>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">Délai avant une visite et un démarrage (semaines)</Label>
                <Input inputMode="numeric" placeholder="3"
                  defaultValue={answers.capacity.lead_time_weeks ?? ""}
                  onChange={(e) => update((a) => ({ ...a, capacity: { ...a.capacity, lead_time_weeks: Number(e.target.value) || null } }))} />
              </CardContent></Card>
              {([
                ["responds_24_48", "Je peux répondre aux urgences en 24-48 h"],
                ["accepts_emergency", "J'accepte les urgences"],
                ["weekend", "Je travaille la fin de semaine"],
                ["winter", "Je travaille l'hiver"],
                ["paused", "Mon agenda est plein — mettre mes rendez-vous en pause"],
              ] as const).map(([key, label]) => (
                <Card key={key}><CardContent className="flex items-center justify-between gap-4 p-4">
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                  <Switch
                    id={key}
                    checked={!!answers.capacity[key]}
                    onCheckedChange={(v) => update((a) => ({ ...a, capacity: { ...a.capacity, [key]: v } }))}
                  />
                </CardContent></Card>
              ))}
            </>
          )}

          {step === 6 && (
            <>
              <p className="text-sm text-muted-foreground">
                Que voulez-vous absolument savoir avant qu'UNPRO vous propose un rendez-vous ?
              </p>
              {pack.prequal.map((p) => (
                <Card key={p.criterion}><CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <ChoiceRow
                    options={LEVELS.map((l) => ({ value: l, label: PREQUAL_LEVEL_LABEL[l] }))}
                    value={answers.prequal[p.criterion]}
                    onChange={(v) => update((a) => ({ ...a, prequal: { ...a.prequal, [p.criterion]: v as PrequalLevel } }))}
                  />
                </CardContent></Card>
              ))}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step > 1 ? void goToStep(step - 1) : setPhase("confirm"))}
            aria-label="Étape précédente"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {step < TOTAL_COMPAT_STEPS ? (
            <Button className="h-12 flex-1 text-[15px]" onClick={() => void goToStep(step + 1)}>
              Continuer <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-12 flex-1 text-[15px]"
              disabled={saving}
              onClick={async () => {
                const res = await persist(answers, TOTAL_COMPAT_STEPS, true);
                if (res) {
                  setPhase("summary");
                  window.scrollTo({ top: 0 });
                }
              }}
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Confirmer mon profil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
