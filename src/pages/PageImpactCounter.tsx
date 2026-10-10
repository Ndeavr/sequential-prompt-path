/**
 * /impact — Impact UNPRO : chiffres serveur (get_public_impact_snapshot),
 * méthode de calcul et manifeste. Aucun chiffre simulé.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useImpactSnapshot, fmtHours, fmtDateQc } from "@/hooks/useImpactSnapshot";

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
  const { data, error, loading } = useImpactSnapshot();

  return (
    <MainLayout>
      <Helmet>
        <title>Impact UNPRO — Moins de démarches, plus de bons matchs</title>
        <meta name="description" content="Heures épargnées par les propriétaires et entrepreneurs grâce à UNPRO : chiffres réels, méthode de calcul transparente et manifeste." />
        <link rel="canonical" href="https://unpro.ca/impact" />
        <meta property="og:title" content="Impact UNPRO" />
        <meta property="og:type" content="article" />
      </Helmet>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Impact UNPRO</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Le bon match. Moins de temps perdu.
        </h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-3" aria-live="polite">
          <Stat label="Heures épargnées (estimation)" value={data ? fmtHours(data.hours_saved) : loading ? "…" : "Indisponible"} />
          <Stat label="Propriétaires / entrepreneurs" value={data ? `${fmtHours(data.homeowner_hours)} / ${fmtHours(data.contractor_hours)}` : "…"} />
          <Stat label="$ épargnés" value={data?.dollars_status === "measured" && data.dollars_saved != null ? `${data.dollars_saved.toLocaleString("fr-CA")} $` : "Mesure en cours"} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {data
            ? `Depuis le ${fmtDateQc(data.period_start)} · ${data.eligible_matches} rendez-vous confirmés · calculé le ${fmtDateQc(data.computed_at)} · formule ${data.formula_version} · actualisé chaque minute${error ? " · dernière valeur connue" : ""}`
            : error ? "Données momentanément indisponibles." : "Chargement…"}
        </p>

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
            <li><strong>Ce qui est compté :</strong> les rendez-vous exclusifs réellement confirmés dans UNPRO (confirmés, planifiés, acceptés, complétés). Chaque rendez-vous ne compte qu'une fois. Les tests sont exclus. Un rendez-vous annulé ou corrigé sort automatiquement du total.</li>
            <li><strong>Formule {data?.formula_version ?? ""} :</strong> heures = rendez-vous admissibles × ({data?.homeowner_hours_per_match ?? "…"} h propriétaire + {data?.contractor_hours_per_match ?? "…"} h entrepreneur).</li>
            <li><strong>Hypothèse :</strong> {data?.assumptions ?? "…"}</li>
            <li><strong>Mesuré ou estimé :</strong> le nombre de rendez-vous est mesuré. Les heures sont une estimation fondée sur ces rendez-vous et sur l'hypothèse ci-dessus.</li>
            <li><strong>Dollars :</strong> aucun taux horaire n'est appliqué au temps. Nous n'additionnons pas la valeur du temps et les dépenses évitées. Tant qu'aucune dépense évitée n'est vérifiée, nous affichons « Mesure en cours » plutôt qu'un chiffre.</li>
            <li><strong>Période et couverture :</strong> depuis le premier rendez-vous admissible, pour tout le Québec. Le total est le même pour tous les visiteurs et est recalculé par le serveur.</li>
          </ul>
          <p className="text-sm text-muted-foreground">Les exemples de cette page servent seulement d'illustration. Ils ne sont pas inclus dans le compteur.</p>
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
