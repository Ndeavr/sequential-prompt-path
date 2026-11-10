/**
 * Étape facultative « Mandats recherchés » — séparée du projet déjà soumis.
 * Réutilise le profil de matching canonique (edge `matching-profile`,
 * table `contractor_matching_profiles`, propriétaire vérifié côté serveur).
 * « Enregistré » s'affiche seulement si le serveur confirme l'écriture.
 * Aucune promesse de mandats disponibles ni d'appels.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invokeMatchingProfile } from "@/lib/matching/invokeMatchingProfile";
import { getMatchingSessionKey } from "@/lib/matching/sessionKey";
import { MATCHING_QUESTIONS } from "@/lib/matching/matchingQuestions";
import { mandateDefaults, mandateHasAnswers, type MandateDraft } from "@/lib/portfolio/portfolioFlow";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const AVAILABILITY = MATCHING_QUESTIONS.find((q) => q.key === "availability")?.options ?? [];
const SIZES = MATCHING_QUESTIONS.find((q) => q.key === "project_size")?.options ?? [];

interface Props { fr: boolean; serviceName: string; city: string; specialty: string | null; contractorId: string | null; onDone: (saved: boolean) => void }

function ChipList({ values, onRemove, label }: { values: string[]; onRemove: (v: string) => void; label: string }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2" aria-label={label}>
      {values.map((v) => (
        <li key={v}>
          <button type="button" onClick={() => onRemove(v)} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary/15 px-3 text-sm text-foreground" aria-label={`${v} — retirer`}>
            {v}<X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddChip({ placeholder, onAdd, addLabel }: { placeholder: string; onAdd: (v: string) => void; addLabel: string }) {
  const [v, setV] = useState("");
  const add = () => { const s = v.trim(); if (s.length >= 2 && s.length <= 80) { onAdd(s); setV(""); } };
  return (
    <div className="mt-2 flex gap-2">
      <Input value={v} maxLength={80} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} className="min-h-11" aria-label={placeholder} />
      <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={add} aria-label={addLabel}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

export default function PortfolioMandates({ fr, serviceName, city, specialty, contractorId, onDone }: Props) {
  const L = (f: string, e: string) => (fr ? f : e);
  const [m, setM] = useState<MandateDraft>(() => mandateDefaults({ serviceName, specialty, city }));
  const [state, setState] = useState<"loading" | "idle" | "saving" | "error">("loading");

  // Reprend les préférences déjà enregistrées (jamais écrasées par la présélection).
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await invokeMatchingProfile({ action: "get", session_key: getMatchingSessionKey() });
        const answers = (data?.ok && data?.profile?.answers) || null;
        if (alive && answers) setM(mandateDefaults({ serviceName, specialty, city, existing: answers }));
      } catch { /* présélection locale conservée */ }
      if (alive) setState("idle");
    })();
    return () => { alive = false; };
  }, [serviceName, specialty, city]);

  const toggle = (k: "services_wanted" | "territories", v: string, on: boolean) =>
    setM((cur) => ({ ...cur, [k]: on ? [...cur[k].filter((x) => x.toLowerCase() !== v.toLowerCase()), v] : cur[k].filter((x) => x !== v) }));

  const save = async () => {
    if (!mandateHasAnswers(m)) { onDone(false); return; }
    setState("saving");
    const answers: Record<string, unknown> = {};
    if (m.services_wanted.length) answers.services_wanted = m.services_wanted;
    if (m.territories.length) answers.territories = m.territories;
    if (m.availability) answers.availability = m.availability;
    if (m.project_size) answers.project_size = m.project_size;
    try {
      const { data, error } = await invokeMatchingProfile({
        action: "save", session_key: getMatchingSessionKey(), answers,
        trade: serviceName || undefined, city: city || undefined, utm: { entry: "free_portfolio" },
      });
      if (error || !data?.ok) throw new Error(String(data?.error ?? error?.message ?? "save_failed"));
      void logFunnelEvent({
        event_type: "mandate_preferences_saved", step: "free_portfolio", contractor_id: contractorId,
        metadata: { fields: Object.keys(answers) },
        dedupe_key: `mandate_preferences_saved:portfolio:${contractorId ?? "none"}`,
      });
      setState("idle");
      onDone(true);
    } catch {
      setState("error");
    }
  };

  const busy = state === "saving";
  return (
    <section className="space-y-5" aria-labelledby="mandates-title">
      <div>
        <h2 id="mandates-title" className="text-xl font-semibold text-foreground">{L("Quels mandats recherchez-vous?", "What jobs are you looking for?")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{L("Facultatif. Votre projet est déjà envoyé. Ces préférences complètent votre profil; elles ne garantissent aucun mandat.", "Optional. Your project is already sent. These preferences complete your profile; they guarantee no jobs.")}</p>
      </div>

      {state === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{L("Chargement de votre profil…", "Loading your profile…")}</p>
      ) : (
        <>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">{L("Types de projets voulus", "Project types wanted")}</legend>
            <ChipList values={m.services_wanted} onRemove={(v) => toggle("services_wanted", v, false)} label={L("Types choisis", "Selected types")} />
            <AddChip placeholder={L("Ajouter un type de projet", "Add a project type")} addLabel={L("Ajouter", "Add")} onAdd={(v) => toggle("services_wanted", v, true)} />
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">{L("Territoires desservis", "Areas served")}</legend>
            <ChipList values={m.territories} onRemove={(v) => toggle("territories", v, false)} label={L("Territoires choisis", "Selected areas")} />
            <AddChip placeholder={L("Ajouter une ville ou une région", "Add a city or region")} addLabel={L("Ajouter", "Add")} onAdd={(v) => toggle("territories", v, true)} />
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">{L("Prochaine disponibilité réelle", "Next real availability")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABILITY.map((o) => {
                const on = m.availability === o.value;
                return (
                  <button key={o.value} type="button" aria-pressed={on} onClick={() => setM((c) => ({ ...c, availability: on ? null : o.value }))}
                    className={`inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}>
                    {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{fr ? o.label : o.label_en}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">{L("Valeur minimale d’un projet", "Minimum project value")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIZES.map((o) => {
                const on = m.project_size === o.value;
                return (
                  <button key={o.value} type="button" aria-pressed={on} onClick={() => setM((c) => ({ ...c, project_size: on ? null : o.value }))}
                    className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}>
                    {fr ? o.label : o.label_en}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">
            {L("Capacité, horaires et travaux refusés : ", "Capacity, hours and refused jobs: ")}
            <Link to="/entrepreneurs/profil" className="underline">{L("profil complet", "full profile")}</Link>.
          </p>

          {state === "error" && <p role="alert" className="rounded-2xl border border-destructive/40 p-3 text-sm text-destructive">{L("Vos préférences n’ont pas été enregistrées. Réessayez ou passez pour l’instant.", "Your preferences were not saved. Retry or skip for now.")}</p>}

          <div className="flex flex-col gap-2">
            <Button type="button" className="min-h-12" disabled={busy || !mandateHasAnswers(m)} onClick={() => void save()}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{L("Enregistrement…", "Saving…")}</> : L("Enregistrer mes préférences", "Save my preferences")}
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={() => onDone(false)}>{L("Plus tard", "Later")}</Button>
          </div>
        </>
      )}
    </section>
  );
}
