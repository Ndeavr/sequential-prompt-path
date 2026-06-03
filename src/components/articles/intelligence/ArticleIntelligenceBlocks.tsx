/**
 * Article Intelligence Blocks — homeowner intelligence report ossature.
 * Used by SeoArticlePage to layer "AI answer + local context + insights + next actions"
 * on top of the existing generated content. Pure presentation, no business logic.
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, MapPin, Eye, AlertTriangle, XCircle, Brain,
  ListChecks, ArrowRight, MessageSquareQuote,
} from "lucide-react";

interface BlockProps {
  children?: ReactNode;
  items?: string[];
  className?: string;
}

function Card({ icon: Icon, title, accent = "primary", children }: {
  icon: typeof Sparkles;
  title: string;
  accent?: "primary" | "amber" | "rose" | "emerald" | "sky";
  children: ReactNode;
}) {
  const accentMap: Record<string, string> = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400",
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    sky: "border-sky-500/25 bg-sky-500/5 text-sky-600 dark:text-sky-400",
  };
  return (
    <section className={`rounded-2xl border ${accentMap[accent]} p-5 not-prose`}>
      <header className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </header>
      <div className="text-foreground/85 text-[15px] leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

/* ── 1. AI ANSWER BLOCK ── */
export function AiAnswerBlock({ answer }: { answer: string }) {
  if (!answer) return null;
  return (
    <Card icon={Sparkles} title="Réponse rapide IA" accent="primary">
      <p>{answer}</p>
    </Card>
  );
}

/* ── 2. LOCAL CONTEXT ── */
export function LocalContextBlock({ city, era, items }: { city?: string; era?: string; items?: string[] }) {
  const points = items && items.length
    ? items
    : [
        city ? `Climat et conditions typiques du secteur ${city}.` : "Climat québécois marqué par les cycles de gel et de dégel.",
        era ? `Caractéristiques fréquentes des bâtiments ${era}.` : "Bâtiments souvent isolés selon les normes de leur époque de construction.",
        "Conditions saisonnières amplifiant ou révélant le problème.",
      ];
  return (
    <Card icon={MapPin} title={`Contexte local${city ? ` — ${city}` : ""}`} accent="sky">
      <ul className="list-disc pl-5 space-y-1.5">
        {points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </Card>
  );
}

/* ── 3. HOMEOWNER OBSERVATIONS ── */
export function HomeownerObservationsBlock({ items }: BlockProps) {
  const obs = items && items.length ? items : [
    "Les maisons des années 1970 présentent souvent ce problème.",
    "Les soffites bloqués aggravent fréquemment la situation.",
    "Le problème revient après chaque épisode de redoux.",
  ];
  return (
    <Card icon={Eye} title="Observations terrain" accent="sky">
      <ul className="space-y-2">
        {obs.map((o, i) => (
          <li key={i} className="flex gap-2">
            <MessageSquareQuote className="w-4 h-4 mt-1 shrink-0 opacity-60" />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── 4. COST / RISK ── */
export function CostRiskBlock({ range, urgency, escalation }: {
  range?: string; urgency?: string; escalation?: string;
}) {
  return (
    <Card icon={AlertTriangle} title="Coûts et risques" accent="amber">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground/55 font-semibold">Fourchette</p>
          <p className="text-[14px] mt-1">{range || "Variable selon l'ampleur — un diagnostic permet de chiffrer précisément."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground/55 font-semibold">Urgence</p>
          <p className="text-[14px] mt-1">{urgency || "À évaluer avant la prochaine saison critique."}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-foreground/55 font-semibold">Si ignoré</p>
          <p className="text-[14px] mt-1">{escalation || "Le problème s'aggrave généralement avec les cycles climatiques."}</p>
        </div>
      </div>
    </Card>
  );
}

/* ── 5. COMMON MISTAKES ── */
export function CommonMistakesBlock({ items }: BlockProps) {
  const mistakes = items && items.length ? items : [
    "Traiter seulement les symptômes sans corriger la cause.",
    "Isoler davantage sans corriger la ventilation.",
    "Reporter l'inspection après une première manifestation.",
  ];
  return (
    <Card icon={XCircle} title="Erreurs fréquentes" accent="rose">
      <ul className="list-disc pl-5 space-y-1.5">
        {mistakes.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </Card>
  );
}

/* ── 6. AI INSIGHTS ── */
export function AiInsightsBlock({ items }: BlockProps) {
  const insights = items && items.length ? items : [
    "Les problèmes de condensation sont plus fréquents dans les maisons à isolation compressée.",
    "Les bâtiments exposés aux vents dominants subissent davantage de cycles d'humidité.",
    "Une corrélation est observée entre l'âge des soffites et la fréquence des infiltrations.",
  ];
  return (
    <Card icon={Brain} title="Observations IA propriétaires" accent="primary">
      <ul className="space-y-2">
        {insights.map((o, i) => (
          <li key={i} className="flex gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-1 shrink-0 opacity-70" />
            <span>{o}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── 7. NEXT ACTIONS (homeowner-first, NEVER "contact 3 contractors") ── */
const DEFAULT_ACTIONS = [
  { label: "Importer une photo pour un diagnostic IA", href: "/diagnostic-photo" },
  { label: "Analyser une soumission existante", href: "/soumission/analyse" },
  { label: "Évaluer la ventilation et l'isolation", href: "/probleme/humidite-grenier" },
  { label: "Réserver une inspection", href: "/trouver-entrepreneur" },
];

export function NextActionsBlock({ actions = DEFAULT_ACTIONS }: {
  actions?: { label: string; href: string }[];
}) {
  return (
    <Card icon={ListChecks} title="Prochaines actions" accent="emerald">
      <ul className="space-y-2">
        {actions.map((a, i) => (
          <li key={i}>
            <Link
              to={a.href}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground hover:text-primary transition"
            >
              <ArrowRight className="w-4 h-4" /> {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── Composed: Intelligence Report Header (top of article) ── */
export function ArticleIntelligenceReportHeader({
  answer, city, era,
}: { answer?: string; city?: string; era?: string }) {
  return (
    <div className="space-y-4">
      {answer && <AiAnswerBlock answer={answer} />}
      <LocalContextBlock city={city} era={era} />
    </div>
  );
}

/* ── Composed: Intelligence Report Footer (bottom of article) ── */
export function ArticleIntelligenceReportFooter() {
  return (
    <div className="space-y-4">
      <HomeownerObservationsBlock />
      <CostRiskBlock />
      <CommonMistakesBlock />
      <AiInsightsBlock />
      <NextActionsBlock />
    </div>
  );
}
