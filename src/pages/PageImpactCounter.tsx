/**
 * /impact — Explicit illustrative journey assumptions, not industry totals.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useImpactSnapshot, fmtHours } from "@/hooks/useImpactSnapshot";
import { impactScenario } from "@/lib/impactScenario";

const SECTIONS = [
  { id: "approche", label: "Notre approche" },
  { id: "proprietaires", label: "Propriétaires" },
  { id: "entrepreneurs", label: "Entrepreneurs" },
  { id: "calcul", label: "Comment nous calculons" },
  { id: "manifeste", label: "Manifeste" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 border-t border-border py-12">
      <h2 id={`${id}-t`} className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

export default function PageImpactCounter() {
  const { data } = useImpactSnapshot();
  const scenario = impactScenario(data);

  return (
    <MainLayout>
      <Helmet>
        <title>Impact UNPRO — Moins de démarches, plus de bons matchs</title>
        <meta name="description" content="Impact potentiel de l’IA : scénario résidentiel illustratif, hypothèses explicites et limites. Aucun total sectoriel ni résultat UNPRO revendiqué." />
        <link rel="canonical" href="https://unpro.ca/impact" />
        <meta property="og:title" content="Impact UNPRO" />
        <meta property="og:type" content="article" />
      </Helmet>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Impact UNPRO</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Le bon match. Moins de temps perdu.
        </h1>

        <p className="mt-6 text-base text-muted-foreground">Impact potentiel estimé de l'IA depuis le 1er janvier 2026</p>
        <p className="mt-2 text-base text-muted-foreground">Estimations fondées sur des hypothèses explicites, non sur les résultats UNPRO.</p>
        <h2 className="mt-8 text-xl font-semibold text-foreground">Scénario type : un projet, un jumelage exclusif.</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Temps potentiel par parcours" value={scenario ? fmtHours(scenario.total) : "À consolider"} />
          <Stat label="Propriétaire / entrepreneur" value={scenario ? `${fmtHours(scenario.homeowner)} / ${fmtHours(scenario.contractor)}` : "À consolider"} />
          <Stat label="Économies en dollars" value="À consolider" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Illustration par parcours, pas un total sectoriel cumulé ni un gain garanti.</p>

        <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {s.label}
            </a>
          ))}
        </nav>

        <Section id="approche" title="Moins de démarches. Plus de bons matchs.">
          <p>UNPRO utilise l'IA pour rapprocher le bon propriétaire du bon entrepreneur. Nous tenons compte du projet, du budget, du territoire et des disponibilités. Nous tenons aussi compte des facteurs humains : les attentes, la façon de communiquer, les préférences et la façon de travailler.</p>
          <p>La conformité (RBQ, licences, vérifications) est la base de la confiance : un entrepreneur non conforme n'est jamais recommandé. La compatibilité fait partie de la recommandation elle-même.</p>
          <p><strong>Ce qui fonctionne aujourd'hui :</strong> Clara comprend le besoin, l'IA analyse le profil des entreprises, les rendez-vous sont exclusifs et chaque recommandation est expliquée. <strong>Notre ambition :</strong> une compatibilité humaine plus fine, enrichie au fil des rendez-vous réels.</p>
        </Section>

        <Section id="proprietaires" title="Pour les propriétaires">
          <p>Moins d'appels à répétition et moins de fois à réexpliquer votre projet. Vous évitez les comparaisons mal adaptées et les rendez-vous inutiles. L'objectif : trouver l'entrepreneur qui convient à votre situation, pas simplement le plus proche.</p>
          <Link to="/" className="inline-block rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Parler à Clara</Link>
        </Section>

        <Section id="entrepreneurs" title="Pour les entrepreneurs">
          <p>Moins de déplacements et de soumissions hors cible. Moins d'échanges répétitifs et moins de temps passé sur des demandes incompatibles. Vous recevez des rendez-vous exclusifs et qualifiés, mieux adaptés à votre métier, votre territoire, votre capacité et vos objectifs.</p>
          <p className="text-sm text-muted-foreground">UNPRO ne garantit pas de contrat gagné, ni un montant d'économies.</p>
          <Link to="/entrepreneur/devis-personnalise" className="inline-block rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Je suis entrepreneur</Link>
        </Section>

        <Section id="calcul" title="Comment nous calculons">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Base de calcul :</strong> un parcours résidentiel hypothétique où un jumelage exclusif évite des démarches supplémentaires. Les volumes de rendez-vous UNPRO ne sont pas utilisés dans ces cadrans.</li>
            <li><strong>Formule par parcours :</strong> {scenario ? `${fmtHours(scenario.homeowner)} pour le propriétaire + ${fmtHours(scenario.contractor)} pour l'entrepreneur = ${fmtHours(scenario.total)} au total.` : "Hypothèses en consolidation; aucun chiffre affiché sans base explicite."}</li>
            <li><strong>Hypothèse existante :</strong> {scenario?.assumptions ?? "Données en consolidation."}</li>
            <li><strong>Source et limites :</strong> hypothèses de méthode UNPRO, pas une étude de temps observés ni une mesure externe validée. Les économies réelles varient selon le projet et peuvent être nulles. Ce scénario ne représente ni une moyenne sectorielle, ni des résultats obtenus par UNPRO.</li>
            <li><strong>Dollars :</strong> aucun taux horaire ni coût publicitaire hypothétique n'est appliqué. Sans base monétaire vérifiée pour ce parcours, aucun montant n'est annoncé.</li>
            <li><strong>Période et couverture :</strong> la période annoncée est un repère pour l'impact sectoriel envisagé; aucun total depuis cette date n'est validé. Le scénario n'est pas multiplié par le temps écoulé, une population ou un nombre de rendez-vous.</li>
            <li><strong>Actualisation :</strong> seules les hypothèses courantes de la méthode existante sont reprises. Les valeurs restent identiques tant que ces hypothèses ne changent pas; l'animation d'entrée n'ajoute aucun gain.</li>
          </ul>
          <p className="text-sm text-muted-foreground">Aucun total mondial ou québécois de l'impact de l'IA n'est revendiqué.</p>
        </Section>

        <Section id="manifeste" title="Notre manifeste">
          <p className="text-xl font-semibold text-foreground">Le temps d'un propriétaire compte. Celui d'un entrepreneur aussi.</p>
          <p>Chercher de l'aide ne devrait pas devenir un deuxième travail. Préparer une soumission ne devrait pas être une course à l'aveugle.</p>
          <p>Nous croyons qu'un bon projet commence par une bonne compréhension des personnes. L'IA doit servir à mieux les rapprocher.</p>
          <p>Notre ambition : moins de démarches inutiles, moins d'énergie gaspillée, plus de confiance et des rencontres qui ont du sens.</p>
          <p className="text-lg font-semibold text-foreground">UNPRO. Le bon entrepreneur pour la bonne personne.</p>
        </Section>
      </article>
    </MainLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
