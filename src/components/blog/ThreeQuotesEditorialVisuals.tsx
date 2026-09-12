import { BrainCircuit, Check, CircleDollarSign, FileSearch, Globe2, MessageSquareText, Scale, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";

export const THREE_QUOTES_ARTICLE_SLUG = "les-3-soumissions-cest-termine-ia-prend-le-relais";

const TIMELINE = [
  { year: "1980", title: "3 soumissions", detail: "Comparer trois prix", icon: FileSearch },
  { year: "2000", title: "Web", detail: "Chercher et comparer", icon: Globe2 },
  { year: "2020", title: "Avis", detail: "Apprendre des expériences", icon: MessageSquareText },
  { year: "2026", title: "IA", detail: "Analyser les signaux et la compatibilité", icon: BrainCircuit },
] as const;

const SIGNALS = [
  "Projet",
  "Expertise",
  "Territoire",
  "Budget",
  "Disponibilité",
  "Conformité",
  "Réputation",
  "Facteur humain",
] as const;

const OLD_MODEL = ["3 demandes", "3 prix", "Comparaison manuelle", "Offres parfois non comparables"];
const NEW_MODEL = ["Besoin structuré", "Incompatibilités écartées", "Signaux qualifiés", "Recommandation expliquée", "Décision humaine"];

export function ThreeQuotesTimeline() {
  return (
    <figure className="my-10 rounded-lg border border-border bg-card p-5 sm:p-7" aria-labelledby="three-quotes-timeline-title">
      <h2 id="three-quotes-timeline-title" className="text-xl font-semibold text-foreground">
        De la comparaison à la recommandation expliquée
      </h2>
      <ol className="relative mt-7 grid gap-5 md:grid-cols-4 md:gap-3" aria-label="Évolution des repères de décision de 1980 à 2026">
        {TIMELINE.map(({ year, title, detail, icon: Icon }, index) => (
          <li key={year} className="relative grid grid-cols-[2.75rem_1fr] gap-3 md:grid-cols-1 md:gap-4">
            {index < TIMELINE.length - 1 && (
              <span className="absolute left-[1.35rem] top-11 h-[calc(100%+0.5rem)] w-px bg-border md:left-[calc(50%+1.35rem)] md:top-[1.35rem] md:h-px md:w-[calc(100%-2.7rem)]" aria-hidden="true" />
            )}
            <span className="relative z-10 flex size-11 items-center justify-center rounded-full border border-primary/30 bg-background text-primary md:mx-auto" aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 md:text-center">
              <p className="text-sm font-bold text-primary">{year}</p>
              <p className="mt-1 font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
        Ces années servent de repères narratifs. Elles ne représentent pas des dates de bascule absolues dans les habitudes des propriétaires.
      </figcaption>
    </figure>
  );
}

export function CompatibilityConstellation() {
  return (
    <figure className="my-10 rounded-lg border border-border bg-card p-5 sm:p-7" aria-labelledby="compatibility-signals-title">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Une lecture multidimensionnelle</p>
        <h2 id="compatibility-signals-title" className="mt-1 text-xl font-semibold text-foreground">
          Les signaux reliés à la compatibilité
        </h2>
      </div>
      <div className="relative mt-7">
        <div className="mx-auto mb-5 flex min-h-24 max-w-56 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-5 text-center sm:absolute sm:inset-0 sm:z-10 sm:my-auto sm:h-28">
          <div>
            <Sparkles className="mx-auto size-5 text-primary" aria-hidden="true" />
            <p className="mt-2 font-bold text-foreground">Compatibilité</p>
            <p className="mt-1 text-sm text-muted-foreground">Selon les informations disponibles</p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:grid-rows-2 sm:gap-x-28 sm:gap-y-16" aria-label="Huit dimensions de compatibilité">
          {SIGNALS.map((signal) => (
            <li key={signal} className="flex min-h-20 items-center justify-center rounded-lg border border-border bg-background px-3 text-center text-sm font-semibold text-foreground">
              {signal}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Aucun signal ne suffit seul. Chaque élément doit conserver sa provenance&nbsp;: vérifié, déclaré, inféré ou en attente.
      </figcaption>
    </figure>
  );
}

function ComparisonColumn({ title, items, current }: { title: string; items: string[]; current?: boolean }) {
  return (
    <section className={`rounded-lg border p-5 ${current ? "border-primary/30 bg-primary/5" : "border-border bg-background"}`}>
      <div className="flex items-center gap-2">
        {current ? <UserRoundCheck className="size-5 text-primary" aria-hidden="true" /> : <Scale className="size-5 text-muted-foreground" aria-hidden="true" />}
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <Check className={`mt-0.5 size-4 shrink-0 ${current ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DecisionModelComparison() {
  return (
    <figure className="my-10 rounded-lg border border-border bg-card p-5 sm:p-7" aria-labelledby="decision-model-title">
      <div className="flex items-start gap-3">
        <CircleDollarSign className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 id="decision-model-title" className="text-xl font-semibold text-foreground">Deux façons d’organiser la décision</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Le prix reste important. Le nouveau modèle l’examine avec les autres signaux utiles.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ComparisonColumn title="Ancien réflexe" items={OLD_MODEL} />
        <ComparisonColumn title="Nouveau modèle" items={NEW_MODEL} current />
      </div>
      <figcaption className="mt-5 flex gap-2 text-sm leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        La recommandation soutient la décision. Le propriétaire conserve le dernier mot.
      </figcaption>
    </figure>
  );
}
