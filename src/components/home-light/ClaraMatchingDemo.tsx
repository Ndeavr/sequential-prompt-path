import { useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, ScanSearch, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/ui/LanguageToggle";

type ProjectId = "attic" | "plumbing" | "property";
type RegionId = "laval" | "montreal" | "terrebonne";
type PriorityId = "speciality" | "schedule" | "communication";

const projects: Array<{
  id: ProjectId;
  fr: string;
  en: string;
  requirementFr: string;
  requirementEn: string;
}> = [
  {
    id: "attic",
    fr: "Isolation d’entretoit",
    en: "Attic insulation",
    requirementFr: "Spécialité en isolation d’entretoits",
    requirementEn: "Attic insulation specialization",
  },
  {
    id: "plumbing",
    fr: "Travaux de plomberie",
    en: "Plumbing work",
    requirementFr: "Services de plomberie adaptés au projet",
    requirementEn: "Plumbing services suited to the project",
  },
  {
    id: "property",
    fr: "Service immobilier",
    en: "Real estate service",
    requirementFr: "Expertise immobilière adaptée au besoin",
    requirementEn: "Real estate expertise suited to the request",
  },
];

const regions: Array<{ id: RegionId; fr: string; en: string }> = [
  { id: "laval", fr: "Laval", en: "Laval" },
  { id: "montreal", fr: "Montréal", en: "Montréal" },
  { id: "terrebonne", fr: "Terrebonne", en: "Terrebonne" },
];

const priorities: Array<{ id: PriorityId; fr: string; en: string; detailFr: string; detailEn: string }> = [
  {
    id: "speciality",
    fr: "Spécialité",
    en: "Expertise",
    detailFr: "Qualifications et expérience pertinentes à vérifier",
    detailEn: "Relevant qualifications and experience to verify",
  },
  {
    id: "schedule",
    fr: "Disponibilité",
    en: "Availability",
    detailFr: "Capacité et créneaux à confirmer",
    detailEn: "Capacity and appointment slots to confirm",
  },
  {
    id: "communication",
    fr: "Communication",
    en: "Communication",
    detailFr: "Langue et façon de travailler compatibles",
    detailEn: "Compatible language and working style",
  },
];

type Option = { id: string; fr: string; en: string };

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  french,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  french: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.11em] text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={
              "min-h-11 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 " +
              (value === option.id
                ? "border-sky-300 bg-sky-400/20 text-white"
                : "border-white/20 bg-white/5 text-slate-300 hover:border-white/45 hover:text-white")
            }
          >
            {french ? option.fr : option.en}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function ClaraMatchingDemo({ onStartProject }: { onStartProject: () => void }) {
  const { lang } = useLanguage();
  const french = lang === "fr";
  const [projectId, setProjectId] = useState<ProjectId>("attic");
  const [regionId, setRegionId] = useState<RegionId>("laval");
  const [priorityId, setPriorityId] = useState<PriorityId>("speciality");

  const project = projects.find((item) => item.id === projectId)!;
  const region = regions.find((item) => item.id === regionId)!;
  const priority = priorities.find((item) => item.id === priorityId)!;

  const copy = french
    ? {
        eyebrow: "CLARA EN ACTION · APERÇU",
        title: "Pas un annuaire. Une vraie compréhension du besoin.",
        subtitle: "Changez un critère pour voir ce qui compte dans une recommandation.",
        project: "Votre projet",
        region: "Votre secteur",
        priority: "Votre priorité",
        result: "Ce que Clara examinerait",
        specialty: "Service recherché",
        coverage: "Territoire à confirmer",
        criteria: "Critère de compatibilité",
        qualifier: "Avant toute proposition réelle, UNPRO doit confirmer l’admissibilité, les qualifications requises et les disponibilités du professionnel.",
        action: "Décrire mon vrai projet à Clara",
        disclaimer: "Démonstration fictive : aucun entrepreneur, rendez-vous ou résultat réel n’est présenté.",
      }
    : {
        eyebrow: "CLARA IN ACTION · PREVIEW",
        title: "Not a directory. A clearer understanding of your needs.",
        subtitle: "Change a criterion to see what matters in a recommendation.",
        project: "Your project",
        region: "Your area",
        priority: "Your priority",
        result: "What Clara would assess",
        specialty: "Service needed",
        coverage: "Coverage to confirm",
        criteria: "Compatibility criterion",
        qualifier: "Before any real recommendation, UNPRO must confirm eligibility, required qualifications, and the professional’s availability.",
        action: "Describe my real project to Clara",
        disclaimer: "Illustrative demo: no actual contractor, appointment, or result is being presented.",
      };

  return (
    <section aria-labelledby="clara-demo-heading" className="bg-background px-4 py-8 sm:px-8 md:py-12" lang={lang}>
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-sky-300/20 bg-[#07182d] text-white shadow-2xl shadow-sky-950/10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_87%_12%,rgba(57,138,247,0.25),transparent_48%)]" />
        <div className="relative grid gap-8 px-5 py-7 sm:px-8 md:grid-cols-[1fr_0.9fr] md:gap-10 md:px-11 md:py-11">
          <div className="space-y-6">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                <Sparkles aria-hidden="true" className="h-4 w-4" /> {copy.eyebrow}
              </p>
              <h2 id="clara-demo-heading" className="mt-3 max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                {copy.title}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">{copy.subtitle}</p>
            </div>
            <ChoiceGroup
              label={copy.project}
              options={projects}
              value={projectId}
              onChange={(id) => setProjectId(id as ProjectId)}
              french={french}
            />
            <ChoiceGroup
              label={copy.region}
              options={regions}
              value={regionId}
              onChange={(id) => setRegionId(id as RegionId)}
              french={french}
            />
            <ChoiceGroup
              label={copy.priority}
              options={priorities}
              value={priorityId}
              onChange={(id) => setPriorityId(id as PriorityId)}
              french={french}
            />
          </div>

          <div aria-live="polite" aria-atomic="true" className="flex min-w-0 flex-col rounded-3xl border border-sky-200/20 bg-white/[0.06] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
              <ScanSearch aria-hidden="true" className="h-5 w-5" /> {copy.result}
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs text-slate-400">{copy.specialty}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-300" />
                  {french ? project.requirementFr : project.requirementEn}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs text-slate-400">{copy.coverage}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white">
                  <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-300" />
                  {french ? region.fr : region.en}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs text-slate-400">{copy.criteria}</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {french ? priority.detailFr : priority.detailEn}
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-slate-300">{copy.qualifier}</p>
            <button
              type="button"
              onClick={onStartProject}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#398bf5] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2879e4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {copy.action} <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">{copy.disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
