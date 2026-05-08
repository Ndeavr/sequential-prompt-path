/**
 * UNPRO — StaticContentPage
 * Reusable shell for legal/marketing static pages. One file, content map by slug.
 * Themed with `.landing-warm` per memory rules for public pages.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

type StaticSlug =
  | "a-propos"
  | "contact"
  | "conditions"
  | "confidentialite"
  | "cookies"
  | "accessibilite"
  | "nos-standards"
  | "pourquoi-pas-3-soumissions"
  | "verification"
  | "ambassadeurs"
  | "aide";

interface StaticContent {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}

const CONTENT: Record<StaticSlug, StaticContent> = {
  "a-propos": {
    title: "À propos d'UNPRO",
    intro: "UNPRO est la plateforme d'intelligence artificielle qui connecte les propriétaires québécois aux meilleurs entrepreneurs locaux, sans formulaire interminable ni course aux soumissions.",
    sections: [
      { heading: "Notre mission", body: "Remplacer le modèle des « 3 soumissions » par une recommandation décisive : un seul professionnel, le bon, à prix juste, disponible rapidement." },
      { heading: "Notre approche", body: "Alex, notre concierge IA, comprend votre besoin en quelques secondes, estime le coût, et vous met en contact avec un entrepreneur vérifié." },
      { heading: "Au Québec, fait au Québec", body: "Plateforme conçue à Montréal, optimisée pour le climat, le marché et la réglementation québécoise (Loi 16, RBQ, NEQ)." },
    ],
  },
  "contact": {
    title: "Nous contacter",
    intro: "Notre équipe répond rapidement. Pour toute question, suggestion ou demande de partenariat.",
    sections: [
      { heading: "Courriel", body: "support@unpro.ca" },
      { heading: "Pour les entrepreneurs", body: "pros@unpro.ca" },
      { heading: "Presse et médias", body: "presse@unpro.ca" },
    ],
  },
  "conditions": {
    title: "Conditions d'utilisation",
    intro: "Dernière mise à jour : mai 2026. Ces conditions régissent votre utilisation de la plateforme UNPRO.",
    sections: [
      { heading: "Acceptation", body: "En utilisant UNPRO, vous acceptez ces conditions dans leur intégralité." },
      { heading: "Service", body: "UNPRO est un intermédiaire technologique entre propriétaires et entrepreneurs. Les contrats et garanties relèvent de l'entrepreneur sélectionné." },
      { heading: "Responsabilité", body: "UNPRO ne garantit pas les travaux exécutés par les entrepreneurs partenaires, mais sélectionne ces derniers selon des critères de qualité stricts (RBQ, AIPP, avis vérifiés)." },
    ],
  },
  "confidentialite": {
    title: "Politique de confidentialité",
    intro: "Vos données vous appartiennent. Voici comment nous les traitons en toute transparence.",
    sections: [
      { heading: "Données collectées", body: "Nom, courriel, téléphone, adresse de propriété et préférences nécessaires au matching avec un entrepreneur." },
      { heading: "Utilisation", body: "Uniquement pour fournir le service, améliorer le matching IA et vous contacter au sujet de votre projet." },
      { heading: "Partage", body: "Aucune donnée vendue à des tiers. Partage limité à l'entrepreneur sélectionné lors d'une réservation." },
      { heading: "Vos droits", body: "Accès, modification et suppression sur demande à privacy@unpro.ca." },
    ],
  },
  "cookies": {
    title: "Politique des témoins (cookies)",
    intro: "Nous utilisons des témoins essentiels pour la connexion et l'analyse anonyme de la performance.",
    sections: [
      { heading: "Témoins essentiels", body: "Nécessaires au fonctionnement (authentification, panier, préférences)." },
      { heading: "Témoins analytiques", body: "Mesure anonyme du trafic via Plausible/PostHog. Aucune publicité tierce." },
      { heading: "Gestion", body: "Vous pouvez les désactiver via les paramètres de votre navigateur." },
    ],
  },
  "accessibilite": {
    title: "Accessibilité",
    intro: "UNPRO s'engage à offrir une expérience accessible à toutes et à tous, conforme aux directives WCAG 2.1 niveau AA.",
    sections: [
      { heading: "Engagements", body: "Contraste élevé, navigation clavier, libellés ARIA, support des lecteurs d'écran." },
      { heading: "Voix Alex", body: "Notre concierge IA Alex permet une utilisation entièrement vocale, idéale pour les utilisateurs avec déficience visuelle ou motrice." },
      { heading: "Signaler un problème", body: "Écrivez à accessibilite@unpro.ca pour tout obstacle rencontré." },
    ],
  },
  "nos-standards": {
    title: "Nos standards de qualité",
    intro: "Chaque entrepreneur UNPRO est vérifié selon une grille de 37 signaux objectifs. Aucune exception.",
    sections: [
      { heading: "Vérification RBQ et NEQ", body: "Numéro de licence valide, statut juridique actif, assurance responsabilité confirmée." },
      { heading: "Score AIPP", body: "Performance digitale, qualité du site, présence Google, avis vérifiés, signaux de confiance." },
      { heading: "Engagement contractuel", body: "Délai de réponse maximal de 4h, ponctualité, devis transparent, garantie écrite." },
    ],
  },
  "pourquoi-pas-3-soumissions": {
    title: "Pourquoi UNPRO refuse les « 3 soumissions »",
    intro: "Le modèle traditionnel vous fait perdre du temps, oppose les entrepreneurs sur le prix, et finit souvent par un mauvais choix.",
    sections: [
      { heading: "Le vrai problème", body: "Comparer 3 prix sans contexte ne dit rien sur la qualité, la disponibilité ou la fiabilité." },
      { heading: "Notre solution", body: "Alex analyse votre besoin précisément, croise avec les 200+ paramètres de chaque entrepreneur, et recommande UN seul match — le bon." },
      { heading: "Résultat", body: "Décision en moins de 30 secondes, rendez-vous fixé, zéro ping-pong de courriels." },
    ],
  },
  "verification": {
    title: "Vérification des entrepreneurs",
    intro: "Comment UNPRO valide chaque professionnel avant de le recommander.",
    sections: [
      { heading: "Étape 1 — Identité légale", body: "Vérification NEQ, RBQ, registre des entreprises du Québec." },
      { heading: "Étape 2 — Performance digitale", body: "Score AIPP calculé sur 37 signaux (web, Google, confiance, IA, conversion)." },
      { heading: "Étape 3 — Avis vérifiés", body: "Croisement Google, Facebook, et avis post-projet UNPRO." },
      { heading: "Étape 4 — Engagement actif", body: "Réactivité mesurée en continu. Un entrepreneur inactif est suspendu." },
    ],
  },
  "ambassadeurs": {
    title: "Programme Ambassadeurs",
    intro: "Recommandez UNPRO à votre réseau et touchez une commission sur chaque entrepreneur activé.",
    sections: [
      { heading: "Comment ça marche", body: "Partagez votre lien personnel. Chaque entrepreneur qui s'inscrit via votre lien vous rapporte une commission récurrente." },
      { heading: "Pour qui", body: "Représentants commerciaux, courtiers immobiliers, gestionnaires de copropriété, créateurs de contenu." },
      { heading: "Postuler", body: "Écrivez à ambassadeurs@unpro.ca avec votre profil et votre réseau cible." },
    ],
  },
  "aide": {
    title: "Centre d'aide",
    intro: "Réponses rapides aux questions courantes. Pour tout le reste, Alex est disponible 24/7.",
    sections: [
      { heading: "Comment trouver un entrepreneur ?", body: "Décrivez votre besoin à Alex (texte ou voix). Il vous propose un match en moins de 30 secondes." },
      { heading: "Combien ça coûte ?", body: "Gratuit pour les propriétaires. Les entrepreneurs paient un abonnement mensuel." },
      { heading: "Comment annuler un rendez-vous ?", body: "Depuis votre tableau de bord ou en parlant à Alex." },
      { heading: "Garanties", body: "Chaque travail est couvert par la garantie de l'entrepreneur (minimum 1 an pour les abonnés UNPRO)." },
    ],
  },
};

export default function StaticContentPage({ slug }: { slug: StaticSlug }) {
  const content = CONTENT[slug];

  useEffect(() => {
    if (content) {
      document.title = `${content.title} — UNPRO`;
    }
  }, [content]);

  if (!content) return null;

  return (
    <main className="landing-warm min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        <header className="space-y-4 mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            {content.title}
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed">{content.intro}</p>
        </header>

        <div className="space-y-8">
          {content.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold text-foreground mb-2">{s.heading}</h2>
              <p className="text-foreground/75 leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-14 p-6 rounded-2xl bg-foreground/5 border border-foreground/10 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Une question précise ?</p>
            <p className="text-sm text-foreground/60">Alex peut vous répondre en quelques secondes.</p>
          </div>
          <Link
            to="/parler-a-alex"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> Parler à Alex
          </Link>
        </div>
      </div>
    </main>
  );
}
