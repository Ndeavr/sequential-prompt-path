import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HardHat, TrendingUp, Users, MapPin, Shield, Star,
  ArrowRight, CheckCircle2, Sparkles, BarChart3,
  FileText, Eye, Award, ChevronRight, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const BENEFITS = [
  { icon: Users, title: "Leads qualifiés", desc: "Recevez des demandes vérifiées de propriétaires prêts à démarrer leurs travaux." },
  { icon: TrendingUp, title: "Score AIPP", desc: "Votre profil IA mesure votre performance et vous positionne face à la concurrence." },
  { icon: MapPin, title: "Territoires exclusifs", desc: "Réservez votre zone géographique et limitez la concurrence directe." },
  { icon: Shield, title: "Badge vérifié", desc: "Licences, assurances et avis validés pour bâtir la confiance client." },
  { icon: Eye, title: "Visibilité SEO", desc: "Apparaissez dans les résultats de recherche locaux et les pages IA." },
  { icon: BarChart3, title: "Tableau de bord pro", desc: "Gérez vos leads, rendez-vous, documents et facturation en un seul endroit." },
];

const PLANS = [
  { name: "Essentiel", price: "Gratuit", features: ["Profil de base", "1 territoire", "5 leads/mois"] },
  { name: "Premium", price: "99$/mois", features: ["Profil complet", "3 territoires", "Leads illimités", "Badge vérifié"], highlight: true },
  { name: "Élite", price: "249$/mois", features: ["Tout Premium", "Territoires exclusifs", "Position prioritaire", "Support dédié"] },
];

const STEPS = [
  { step: "1", icon: FileText, title: "Créez votre profil", subtitle: "Informations, spécialités, licences" },
  { step: "2", icon: Award, title: "Obtenez votre score AIPP", subtitle: "Profil évalué automatiquement" },
  { step: "3", icon: Zap, title: "Recevez des leads", subtitle: "Demandes qualifiées de propriétaires" },
];

export default function ProfessionalsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-15%] w-[35vw] h-[35vw] rounded-full bg-primary/10 blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-20 md:pt-40 md:pb-28">
          <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-secondary/10 text-secondary border-secondary/20">
                <HardHat className="h-3 w-3" /> Pour les professionnels
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-[2rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
              Développez votre{" "}
              <span className="text-gradient">entreprise</span>{" "}
              avec UNPRO
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Recevez des demandes qualifiées, construisez votre réputation et dominez votre territoire grâce à l'IA.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]">
                <Link to="/signup">Inscrire mon entreprise <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="px-5 py-12 relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">3 étapes simples</p>
            <h2 className="text-xl font-bold text-foreground">Commencez en quelques minutes</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center relative">
                  <div className="absolute -top-2.5 -right-1 h-6 w-6 rounded-full bg-secondary text-secondary-foreground text-[11px] font-bold flex items-center justify-center">
                    {s.step}
                  </div>
                  <div className="h-11 w-11 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-2">
                    <s.icon className="h-5 w-5 text-secondary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Avantages ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">Avantages</p>
            <h2 className="text-xl font-bold text-foreground">Tout ce qu'il faut pour croître</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <b.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-secondary tracking-widest uppercase mb-1">Tarification</p>
            <h2 className="text-xl font-bold text-foreground">Choisissez votre plan</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {PLANS.map((p, i) => (
              <motion.div key={p.name} variants={fadeUp} custom={i}>
                <div className={`rounded-2xl p-5 ${p.highlight ? "bg-gradient-to-br from-secondary/10 to-primary/5 border-2 border-secondary/30 shadow-elevation" : "glass-card"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{p.name}</h3>
                      {p.highlight && <Badge className="mt-1 bg-secondary/15 text-secondary border-secondary/20 text-[10px]">Populaire</Badge>}
                    </div>
                    <p className="text-lg font-extrabold text-foreground">{p.price}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <Sparkles className="h-8 w-8 text-secondary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Prêt à recevoir des clients qualifiés ?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Inscrivez votre entreprise en 5 minutes et commencez à recevoir des demandes.
          </p>
          <Button asChild size="lg" className="rounded-2xl h-14 min-w-[260px] text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]">
            <Link to="/signup">Activer mon profil <ChevronRight className="h-5 w-5 ml-1" /></Link>
          </Button>
          <div className="flex items-center justify-center gap-4">
            {[{ icon: CheckCircle2, label: "Essai gratuit" }, { icon: Shield, label: "Sans engagement" }].map(b => (
              <div key={b.label} className="flex items-center gap-1">
                <b.icon className="h-3 w-3 text-success" />
                <span className="text-[10px] font-medium text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
