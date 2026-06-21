/**
 * UNPRO — Comment ça marche
 * Public explainer of the DNA Compatibility Engine — the visible moat.
 * Surfaces Alex as the AI Matchmaker and the 6 DNA layers feeding the Compatibility Score.
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Shield, Heart,
  User, Hammer, Briefcase, ShieldCheck, CalendarClock, TrendingUp, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
// BrandPronunciation removed from public surfaces — see Internal Content Guard.

const DNA_LAYERS = [
  { icon: User, title: "Homeowner DNA", desc: "Budget, style de communication, tolérance au risque, urgence, qualité attendue, philosophie d'entretien, mentalité luxe vs pratique." },
  { icon: Hammer, title: "Project DNA", desc: "Métier, sous-métier, type et âge de propriété, complexité, permis, budget, urgence, statut patrimonial, objectifs énergétiques." },
  { icon: Briefcase, title: "Contractor DNA", desc: "Types de projets et clients préférés, valeur moyenne, rayon, vitesse de réponse, spécialisations, capacité saisonnière, focus artisanal." },
  { icon: ShieldCheck, title: "Trust DNA", desc: "RBQ, NEQ, assurances, licences, historique de plaintes, affiliations, années d'opération, cohérence des avis, fiabilité, vérification." },
  { icon: CalendarClock, title: "Availability DNA", desc: "Disponibilité réelle croisée avec l'urgence et la fenêtre du projet, pas seulement un calendrier marketing." },
  { icon: TrendingUp, title: "Success DNA", desc: "Taux de complétion, taux de référence, clients récurrents, vitesse de réponse, présence aux rendez-vous, satisfaction, écart estimé/réel." },
];

const SIMILAR_PROJECTS = [
  { value: "31", label: "projets d'isolation de combles complétés dans votre fourchette de budget" },
  { value: "14", label: "projets sur des maisons construites avant 1980" },
  { value: "18", label: "projets complétés dans un rayon de 10 km de votre propriété" },
  { value: "22", label: "projets avec des priorités propriétaire similaires aux vôtres" },
];

const FAQ = [
  { q: "Pourquoi UNPRO ne demande pas 3 soumissions ?", a: "Comparer trois prix ne garantit pas la qualité — ni la compatibilité. UNPRO recommande directement l'entrepreneur le plus susceptible de réussir votre projet précis." },
  { q: "Comment est calculé le Score de Compatibilité ?", a: "Alex combine six couches d'ADN — propriétaire, projet, entrepreneur, confiance, disponibilité, réussite — et l'intelligence des projets similaires complétés. Le résultat est un score 0-100 avec niveau de confiance." },
  { q: "Qu'est-ce que la Similar Project Intelligence ?", a: "C'est notre différenciateur. Plutôt que de regarder uniquement les avis, UNPRO compare votre projet à des projets historiquement similaires (budget, type de propriété, géographie, priorités) pour prédire la réussite." },
  { q: "Qui est Alex ?", a: "Alex est le Matchmaker IA d'UNPRO. Alex aide les propriétaires à découvrir l'entrepreneur le plus susceptible de réussir sur leur projet précis." },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment fonctionne le jumelage UNPRO",
  "description": "UNPRO jumelle le propriétaire avec l'entrepreneur le plus compatible via 6 couches d'ADN et un Score de Compatibilité 0-100.",
  "step": [
    { "@type": "HowToStep", "position": 1, "name": "Comprendre le propriétaire", "text": "Alex capture le Homeowner DNA — préférences, budget, urgence, style." },
    { "@type": "HowToStep", "position": 2, "name": "Analyser le projet", "text": "Alex capture le Project DNA — métier, complexité, permis, propriété." },
    { "@type": "HowToStep", "position": 3, "name": "Croiser avec l'écosystème entrepreneur", "text": "Alex évalue le Contractor DNA, le Trust DNA, l'Availability DNA et le Success DNA." },
    { "@type": "HowToStep", "position": 4, "name": "Produire le Score de Compatibilité", "text": "Score 0-100, niveau de confiance, projets similaires, recommandation unique." },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": FAQ.map((f) => ({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": { "@type": "Answer", "text": f.a },
  })),
};

export default function CommentCaMarchePage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Comment fonctionne le matching UNPRO — Score de Compatibilité IA</title>
        <meta name="description" content="UNPRO jumelle propriétaires et entrepreneurs via 6 couches d'ADN et un Score de Compatibilité 0-100. Alex, le Matchmaker IA, identifie l'entrepreneur le plus susceptible de réussir votre projet." />
        <link rel="canonical" href="https://unpro.ca/comment-ca-marche" />
        <link rel="alternate" type="application/ld+json" href="/knowledge-graph.json" />
        <meta property="og:title" content="Comment fonctionne le matching UNPRO" />
        <meta property="og:url" content="https://unpro.ca/comment-ca-marche" />
        <meta property="og:description" content="6 couches d'ADN · Score de Compatibilité 0-100 · Une seule recommandation intelligente." />
        <script type="application/ld+json">{JSON.stringify(howToJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="landing-warm">
        <div className="max-w-4xl mx-auto px-5 py-16">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4"
                 style={{ background: "rgba(11,18,32,0.06)", color: "#0B1220" }}>
              <Sparkles className="h-3 w-3" /> Le moteur de compatibilité
            </div>
            <h1 className="font-display font-extrabold tracking-[-0.04em] text-[40px] sm:text-[56px] leading-[1.02] mb-5" style={{ color: "#0B1220" }}>
              Trouvez votre Pro.
            </h1>
            <p className="text-[17px] sm:text-[19px] leading-relaxed mb-3" style={{ color: "#1F2937" }}>
              Alex analyse votre projet, vos préférences, votre budget, votre urgence et votre compatibilité pour identifier l'entrepreneur <strong>le plus susceptible de réussir</strong>.
            </p>
            <p className="text-[15px] leading-relaxed mb-10" style={{ color: "#475467" }}>
              Pas trois soumissions. Pas dix appels. Une seule recommandation intelligente.
            </p>
          </motion.div>

          {/* Compatibility Score showcase */}
          <div className="rounded-[28px] p-6 sm:p-8 mb-14"
               style={{ background: "linear-gradient(135deg, #0B1220 0%, #1E3A5F 100%)", color: "white" }}>
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-70 mb-2">Score de Compatibilité</div>
            <div className="flex items-baseline gap-3 mb-3">
              <div className="font-extrabold tracking-[-0.04em] text-[72px] sm:text-[96px] leading-none">96<span className="text-[40px] opacity-70">%</span></div>
              <div className="text-sm opacity-80">de compatibilité avec votre projet</div>
            </div>
            <ul className="text-[14px] space-y-1.5 opacity-90">
              <li>· Historique de projets similaire</li>
              <li>· Alignement budgétaire</li>
              <li>· Alignement de communication</li>
              <li>· Disponibilité confirmée</li>
              <li>· Complexité de projet comparable</li>
            </ul>
          </div>

          {/* 6 DNAs */}
          <h2 className="font-display font-bold text-[26px] sm:text-[32px] tracking-[-0.03em] mb-2" style={{ color: "#0B1220" }}>
            Six couches d'ADN. Une seule recommandation.
          </h2>
          <p className="text-[15px] mb-8" style={{ color: "#475467" }}>
            Chaque couche est un signal structuré. Ensemble, elles forment un moteur impossible à copier.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {DNA_LAYERS.map((layer, i) => (
              <motion.div key={layer.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl p-5 border"
                style={{ background: "white", borderColor: "rgba(11,18,32,0.08)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(11,18,32,0.06)" }}>
                    <layer.icon className="h-5 w-5" style={{ color: "#0B1220" }} />
                  </div>
                  <h3 className="font-bold text-[16px]" style={{ color: "#0B1220" }}>{layer.title}</h3>
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: "#475467" }}>{layer.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Similar Project Intelligence */}
          <h2 className="font-display font-bold text-[26px] sm:text-[32px] tracking-[-0.03em] mb-2" style={{ color: "#0B1220" }}>
            Projets similaires aux vôtres
          </h2>
          <p className="text-[15px] mb-8" style={{ color: "#475467" }}>
            Le meilleur entrepreneur n'est pas celui qui a le plus d'avis. C'est celui qui a déjà réussi des projets comme le vôtre.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-16">
            {SIMILAR_PROJECTS.map((s) => (
              <div key={s.label} className="rounded-2xl p-5 border flex items-start gap-4"
                   style={{ background: "white", borderColor: "rgba(11,18,32,0.08)" }}>
                <div className="font-extrabold text-[36px] leading-none tracking-[-0.03em]" style={{ color: "#0B1220" }}>{s.value}</div>
                <p className="text-[14px] leading-relaxed" style={{ color: "#475467" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pronunciation block removed — internal-only content (see /admin/content-guard). */}

          {/* FAQ */}
          <h2 className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.03em] mb-5" style={{ color: "#0B1220" }}>
            Questions fréquentes
          </h2>
          <div className="space-y-3 mb-12">
            {FAQ.map((faq) => (
              <details key={faq.q} className="group rounded-2xl overflow-hidden border" style={{ background: "white", borderColor: "rgba(11,18,32,0.08)" }}>
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-semibold" style={{ color: "#0B1220" }}>
                  {faq.q}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-4 text-[14px] leading-relaxed" style={{ color: "#475467" }}>{faq.a}</div>
              </details>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link to="/alex"
              className="inline-flex items-center gap-2 h-14 rounded-full px-10 text-base font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(222 100% 50%), hsl(232 100% 30%))" }}>
              Parler à Alex <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center justify-center gap-5 mt-5 text-[13px]" style={{ color: "#475467" }}>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Gratuit</span>
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Sécurisé</span>
              <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> Sans engagement</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
