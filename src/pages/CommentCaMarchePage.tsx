/**
 * UNPRO — Comment ça marche
 * Internal linking target + AI Overview bait page
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { FileText, Brain, Trophy, ArrowRight, CheckCircle2, Shield, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { step: 1, icon: FileText, title: "Décrivez votre projet", desc: "En 30 secondes, dites-nous ce dont vous avez besoin. Alex, notre IA, vous guide.", color: "text-primary" },
  { step: 2, icon: Brain, title: "Jumelage intelligent", desc: "Notre système analyse votre projet, votre localisation et la disponibilité des entrepreneurs vérifiés.", color: "text-accent" },
  { step: 3, icon: Trophy, title: "Rendez-vous garanti", desc: "Vous recevez un rendez-vous confirmé avec le bon entrepreneur. Pas de spam, pas de comparatif inutile.", color: "text-warning" },
];

const FAQ = [
  { q: "Pourquoi éviter les 3 soumissions ?", a: "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet." },
  { q: "Est-ce que le rendez-vous est garanti ?", a: "Oui. Chaque demande est transformée en rendez-vous confirmé avec un entrepreneur qualifié." },
  { q: "Comment UNPRO choisit l'entrepreneur ?", a: "Le système intelligent analyse votre projet, votre localisation et la disponibilité des professionnels pour trouver le meilleur match." },
  { q: "Est-ce plus rapide que les soumissions ?", a: "Oui. Au lieu d'attendre plusieurs réponses, vous obtenez un rendez-vous garanti directement." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment fonctionne UNPRO",
  "description": "UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur.",
  "step": STEPS.map((s) => ({
    "@type": "HowToStep",
    "position": s.step,
    "name": s.title,
    "text": s.desc,
  })),
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
        <title>Comment ça marche — Rendez-vous garanti | UNPRO</title>
        <meta name="description" content="Décrivez votre projet, UNPRO trouve le bon entrepreneur vérifié et vous offre un rendez-vous garanti. Aucun spam." />
        <link rel="canonical" href="https://unpro.ca/comment-ca-marche" />
        <meta property="og:title" content="Comment ça marche — UNPRO" />
        <meta property="og:description" content="UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto px-5 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-title sm:text-hero-sm font-bold text-foreground mb-4">
            Comment ça marche
          </h1>
          <p className="text-body text-muted-foreground mb-12">
            UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur.
          </p>
        </motion.div>

        <div className="space-y-8 mb-16">
          {STEPS.map((item, i) => (
            <motion.div key={item.step} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className="premium-card rounded-2xl p-6 flex items-start gap-5"
            >
              <div className="h-12 w-12 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-primary bg-primary/10 rounded-full px-2 py-0.5">Étape {item.step}</span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{item.title}</h2>
                <p className="text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="font-display text-section font-bold text-foreground mb-6">Questions fréquentes</h2>
        <div className="space-y-3 mb-12">
          {FAQ.map((faq) => (
            <details key={faq.q} className="group premium-card rounded-2xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-body font-semibold text-foreground hover:bg-muted/30 transition-colors">
                {faq.q}
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 pb-4 text-meta leading-relaxed text-muted-foreground">{faq.a}</div>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/describe-project"
            className="inline-flex items-center gap-2 h-14 rounded-full px-10 text-base font-bold cta-gradient"
          >
            Obtenir mon rendez-vous <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="trust-row mt-5 justify-center">
            {[
              { icon: CheckCircle2, label: "Gratuit" },
              { icon: Shield, label: "Sécurisé" },
              { icon: Heart, label: "Sans engagement" },
            ].map(b => (
              <div key={b.label} className="trust-item">
                <b.icon className="!text-success" />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Internal links */}
        <div className="mt-16 pt-8 border-t border-border/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Liens utiles</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { to: "/search", label: "Trouver un entrepreneur fiable" },
              { to: "/emergency", label: "Service urgent maison" },
              { to: "/verifier-entrepreneur", label: "Vérifier un entrepreneur" },
            ].map(link => (
              <Link key={link.to} to={link.to} className="text-sm text-primary hover:underline font-medium">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
