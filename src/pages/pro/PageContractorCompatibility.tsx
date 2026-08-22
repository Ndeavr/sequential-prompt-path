/**
 * UNPRO — Profil de compatibilité (Excavation / Fondations / Drainage)
 * Parcours conversationnel, conditionnel, mobile-first, rattaché à une fiche entrepreneur existante.
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Plus, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPAT_PREQUAL,
  COMPAT_SERVICES,
  COMPAT_STEPS,
  PREQUAL_LEVEL_LABEL,
  STANCE_LABEL,
  TERRITORY_TIER_LABEL,
  TOTAL_COMPAT_STEPS,
  TRI_LABEL,
  VOLUME_OPTIONS,
  citySlug,
  formatMoney,
  visibleProjectQuestions,
  type PrequalLevel,
  type Stance,
  type TerritoryTier,
  type TriAnswer,
} from "@/config/compatibilityExcavation";
import { useContractorCompatibility } from "@/hooks/useContractorCompatibility";

const STANCES: Stance[] = ["priority", "accepted", "not_wanted"];
const TRIS: TriAnswer[] = ["yes", "depends", "no"];
const TIERS: TerritoryTier[] = ["priority", "normal", "large_only", "blocked"];
const LEVELS: PrequalLevel[] = ["optional", "important", "required"];

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

function moneyToCents(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n * 100 : null;
}

export default function PageContractorCompatibility() {
  const { id: adminContractorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    contractorId,
    answers,
    update,
    step,
    goToStep,
    finalize,
    saving,
    savedAt,
    isLoading,
    existingAreas,
  } = useContractorCompatibility({ contractorId: adminContractorId });

  const [done, setDone] = useState(false);
  const [newCity, setNewCity] = useState("");

  const projectQuestions = useMemo(
    () => visibleProjectQuestions(Object.fromEntries(Object.entries(answers.services).map(([k, v]) => [k, v.stance]))),
    [answers.services],
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
  };

  const progress = Math.round(((step - 1) / TOTAL_COMPAT_STEPS) * 100);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contractorId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-foreground">Aucune fiche entrepreneur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce questionnaire enrichit une fiche entrepreneur existante. Complétez d'abord votre profil UNPRO.
        </p>
        <Button className="mt-6" onClick={() => navigate("/pro/profil")}>Ouvrir mon profil</Button>
      </div>
    );
  }

  // ── Écran de résumé ────────────────────────────────────────────────
  if (done) {
    const priority = Object.entries(answers.services).filter(([, v]) => v.stance === "priority");
    const refused = Object.entries(answers.services).filter(([, v]) => v.stance === "not_wanted");
    const label = (slug: string) => COMPAT_SERVICES.find((s) => s.slug === slug)?.label ?? slug;
    const qLabel = (k: string) =>
      projectQuestions.find((q) => `${q.dimension}:${q.key}` === k)?.label ?? k;

    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Helmet><title>Votre profil de compatibilité | UNPRO</title></Helmet>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Voici comment UNPRO comprend votre entreprise
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ces informations orientent vos recommandations. Elles restent privées.
        </p>

        <div className="mt-6 space-y-4">
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Services prioritaires</p>
            <p className="mt-1.5 text-sm text-foreground">
              {priority.length ? priority.map(([s]) => label(s)).join(" · ") : "Aucun service marqué prioritaire"}
            </p>
            {refused.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Refusé :</span> {refused.map(([s]) => label(s)).join(" · ")}
              </p>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projet idéal</p>
            <p className="mt-1.5 text-sm text-foreground">
              Plancher {formatMoney(answers.money.floor_project_cents)} · Idéal{" "}
              {formatMoney(answers.money.ideal_min_cents)} à {formatMoney(answers.money.ideal_max_cents)}
            </p>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Territoires</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {answers.territories.length ? answers.territories.map((t) => (
                <Badge key={t.city_slug} variant="secondary">
                  {t.city_name} · {TERRITORY_TIER_LABEL[t.tier]}
                </Badge>
              )) : <span className="text-sm text-muted-foreground">Aucun territoire précisé</span>}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-success">Accepte</p>
              <p className="mt-1 text-sm text-foreground">
                {Object.entries(answers.projects).filter(([, v]) => v.answer === "yes").map(([k]) => qLabel(k)).join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-warning">À évaluer</p>
              <p className="mt-1 text-sm text-foreground">
                {Object.entries(answers.projects).filter(([, v]) => v.answer === "depends").map(([k]) => qLabel(k)).join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-destructive">Refuse</p>
              <p className="mt-1 text-sm text-foreground">
                {Object.entries(answers.projects).filter(([, v]) => v.answer === "no").map(([k]) => qLabel(k)).join(" · ") || "—"}
              </p>
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avant un rendez-vous</p>
            <p className="mt-1.5 text-sm text-foreground">
              {Object.entries(answers.prequal).filter(([, l]) => l !== "optional")
                .map(([c, l]) => `${COMPAT_PREQUAL.find((p) => p.criterion === c)?.label ?? c} (${PREQUAL_LEVEL_LABEL[l]})`)
                .join(" · ") || "Aucune exigence particulière"}
            </p>
          </CardContent></Card>
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setDone(false); void goToStep(1); }}>
            Modifier
          </Button>
          <Button className="flex-1" onClick={() => navigate(adminContractorId ? `/admin/contractors/${adminContractorId}` : "/pro")}>
            C'est exact
          </Button>
        </div>
      </div>
    );
  }

  const current = COMPAT_STEPS[step - 1];

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-6">
      <Helmet>
        <title>Profil de compatibilité entrepreneur | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Progression */}
      <div className="sticky top-0 z-30 -mx-4 bg-background/90 px-4 pb-3 pt-2 backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Étape {step} sur {TOTAL_COMPAT_STEPS}</span>
          <span className="flex items-center gap-1">
            {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…</>
              : savedAt ? <><Check className="h-3 w-3 text-success" /> Enregistré</> : null}
          </span>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
      </div>

      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{current.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.subtitle}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mt-6 space-y-4"
        >
          {/* ÉTAPE 1 — Services */}
          {step === 1 && COMPAT_SERVICES.map((svc) => (
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

          {/* ÉTAPE 2 — Projets */}
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
                            className="text-sm"
                            rows={2}
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))
          )}

          {/* ÉTAPE 3 — Argent */}
          {step === 3 && (
            <>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">En bas de quel montant un projet ne vaut pas votre déplacement ?</Label>
                <Input
                  inputMode="numeric"
                  placeholder="2 500"
                  defaultValue={answers.money.floor_project_cents ? answers.money.floor_project_cents / 100 : ""}
                  onChange={(e) => update((a) => ({ ...a, money: { ...a.money, floor_project_cents: moneyToCents(e.target.value) } }))}
                />
              </CardContent></Card>
              <Card><CardContent className="space-y-3 p-4">
                <Label className="text-sm">Votre contrat idéal se situe entre</Label>
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
            </>
          )}

          {/* ÉTAPE 4 — Territoire */}
          {step === 4 && (
            <>
              {existingAreas.length > 0 && answers.territories.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update((a) => ({
                      ...a,
                      territories: existingAreas.map((ar) => ({
                        city_name: ar.city_name,
                        city_slug: citySlug(ar.city_name),
                        tier: "normal" as TerritoryTier,
                        min_project_cents: null,
                      })),
                    }))
                  }
                >
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                  Reprendre mes {existingAreas.length} zones déjà au profil
                </Button>
              )}

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
                <Input
                  placeholder="Ajouter une ville"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
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
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ÉTAPE 5 — Capacité */}
          {step === 5 && (
            <>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">Combien de projets pouvez-vous réellement livrer par mois ?</Label>
                <Input inputMode="numeric" placeholder="8"
                  defaultValue={answers.capacity.projects_per_month ?? ""}
                  onChange={(e) => update((a) => ({ ...a, capacity: { ...a.capacity, projects_per_month: Number(e.target.value) || null } }))} />
              </CardContent></Card>
              <Card><CardContent className="space-y-2 p-4">
                <Label className="text-sm">Délai avant de commencer un nouveau projet (semaines)</Label>
                <Input inputMode="numeric" placeholder="3"
                  defaultValue={answers.capacity.lead_time_weeks ?? ""}
                  onChange={(e) => update((a) => ({ ...a, capacity: { ...a.capacity, lead_time_weeks: Number(e.target.value) || null } }))} />
              </CardContent></Card>
              {([
                ["accepts_emergency", "J'accepte les urgences"],
                ["responds_24_48", "Je peux répondre en 24-48 h"],
                ["weekend", "Je travaille la fin de semaine"],
                ["winter", "Je travaille l'hiver"],
                ["paused", "Mon agenda est plein — mettre mes rendez-vous en pause"],
              ] as const).map(([key, label]) => (
                <Card key={key}><CardContent className="flex items-center justify-between p-4">
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

          {/* ÉTAPE 6 — Préqualification */}
          {step === 6 && (
            <>
              {COMPAT_PREQUAL.map((p) => (
                <Card key={p.criterion}><CardContent className="space-y-3 p-4">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <ChoiceRow
                    options={LEVELS.map((l) => ({ value: l, label: PREQUAL_LEVEL_LABEL[l] }))}
                    value={answers.prequal[p.criterion]}
                    onChange={(v) => update((a) => ({ ...a, prequal: { ...a.prequal, [p.criterion]: v as PrequalLevel } }))}
                  />
                </CardContent></Card>
              ))}

              <Card><CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium text-foreground">
                  Les 3 questions que vous posez toujours avant d'accepter un projet
                </p>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    placeholder={`Question ${i + 1}`}
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

              <Card><CardContent className="flex items-center justify-between p-4">
                <div className="pr-4">
                  <Label htmlFor="learning" className="text-sm">Améliorer mes recommandations avec le temps</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    UNPRO propose des ajustements à partir de vos vrais résultats. Rien n'est modifié sans votre accord.
                  </p>
                </div>
                <Switch
                  id="learning"
                  checked={answers.learning_opt_in}
                  onCheckedChange={(v) => update({ learning_opt_in: v })}
                />
              </CardContent></Card>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {step > 1 && (
            <Button variant="ghost" size="icon" onClick={() => void goToStep(step - 1)} aria-label="Étape précédente">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={async () => {
              await goToStep(step);
              toast.success("Sauvegardé. Vous pouvez reprendre plus tard.");
            }}
          >
            <Save className="mr-1.5 h-4 w-4" /> Plus tard
          </Button>
          {step < TOTAL_COMPAT_STEPS ? (
            <Button className="flex-1" onClick={() => void goToStep(step + 1)}>
              Continuer <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={saving}
              onClick={async () => {
                const res = await finalize();
                if (res) setDone(true);
              }}
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Voir mon profil
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
