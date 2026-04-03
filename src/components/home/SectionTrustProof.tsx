/**
 * SectionTrustProofSignals — Social proof stats, testimonials, FAQ.
 * Clean premium layout with trust signals. No duplicate "Décrivez votre projet" CTA.
 */
import { motion } from "framer-motion";
import {
  Star, ArrowRight, CheckCircle2, Shield, Heart, Brain, FileText, Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import avatarsGroup from "@/assets/avatars-group.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const TESTIMONIALS = [
  { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
  { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
  { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
];

const FAQ = [
  { q: "Pourquoi éviter les 3 soumissions ?", a: "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet." },
  { q: "Est-ce que le rendez-vous est garanti ?", a: "Oui. Chaque demande est transformée en rendez-vous confirmé avec un entrepreneur qualifié et vérifié." },
  { q: "Comment UNPRO choisit l'entrepreneur ?", a: "Le système analyse votre projet, votre localisation et la disponibilité des professionnels pour trouver le meilleur match." },
  { q: "Est-ce plus rapide que les soumissions ?", a: "Oui. Au lieu d'attendre plusieurs réponses, vous obtenez un rendez-vous garanti directement avec le bon entrepreneur." },
];

const TRUST_LINKS = [
  { to: "/comment-fonctionne-ia", label: "Comment ça marche", icon: Brain },
  { to: "/couverture", label: "Couverture locale", icon: Shield },
  { to: "/guides", label: "Guides maison", icon: FileText },
  { to: "/avis-verifies", label: "Avis vérifiés", icon: Star },
  { to: "/roadmap", label: "Roadmap", icon: Zap },
];

export default function SectionTrustProof() {
  const navigate = useNavigate();

  return (
    <>
      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="px-5 py-10">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
              <div className="text-center">
                <p className="font-display text-2xl sm:text-3xl font-bold text-primary">+10 000</p>
                <p className="text-xs font-medium text-muted-foreground">projets réussis</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                  <span className="font-display text-lg font-bold ml-1 text-foreground">4.9</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground">2,500+ avis</p>
              </div>
            </div>

            <div className="trust-row mt-4">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map((b) => (
                <div key={b.label} className="trust-item">
                  <b.icon />
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <h2 className="section-title">Ce que nos utilisateurs disent</h2>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <div className="glass-card rounded-2xl p-4 h-full space-y-2.5">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-3 w-3 fill-current text-warning" />)}
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-foreground/85">"{t.text}"</p>
                  <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                    <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-border/60">
                      <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="px-5 py-12">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-6">Questions fréquentes</h2>
            <div className="space-y-3">
              {FAQ.map((faq) => (
                <details key={faq.q} className="group glass-card rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors">
                    {faq.q}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">{faq.a}</div>
                </details>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST LINKS ═══ */}
      <section className="px-5 py-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground">Explorez la confiance UNPRO</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {TRUST_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-5 py-14">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary)), hsl(var(--accent)))",
            }}>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[120%] rounded-full blur-3xl bg-white/10" />
              </div>
              <div className="relative z-10 space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Un seul entrepreneur. Le bon.<br />Rendez-vous garanti.
                </h2>
                <button
                  onClick={() => navigate("/describe-project")}
                  className="h-12 rounded-full px-8 text-sm font-bold bg-white text-primary hover:bg-white/90 transition-all active:scale-[0.97]"
                >
                  Obtenir mon rendez-vous <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
