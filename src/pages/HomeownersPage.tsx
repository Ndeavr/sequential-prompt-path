import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home, Search, Upload, Heart, Brain, Shield, Star, Clock,
  ArrowRight, CheckCircle2, Sparkles, FileText, BarChart3,
  CalendarDays, MessageCircle, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-home.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const STEPS = [
  { step: "1", icon: FileText, title: "Décrivez", subtitle: "votre projet et votre maison" },
  { step: "2", icon: Search, title: "Comparez", subtitle: "3 soumissions par IA" },
  { step: "3", icon: CalendarDays, title: "Choisissez", subtitle: "et prenez rendez-vous" },
];

const FEATURES = [
  { icon: Upload, title: "Analyse de soumissions", desc: "Téléversez jusqu'à 3 soumissions et obtenez une analyse comparative détaillée par IA.", to: "/signup" },
  { icon: Heart, title: "Score Maison", desc: "Évaluez la santé globale de votre propriété : structure, systèmes, énergie, extérieur.", to: "/signup" },
  { icon: Brain, title: "Alex — Conseiller IA", desc: "Posez vos questions sur vos travaux, votre maison ou les entrepreneurs disponibles.", to: "/alex" },
  { icon: BarChart3, title: "Insights Propriété", desc: "Recevez des recommandations personnalisées selon l'état et l'historique de votre maison.", to: "/signup" },
  { icon: Search, title: "Trouver un entrepreneur", desc: "Accédez à des professionnels vérifiés, notés et disponibles dans votre région.", to: "/search" },
  { icon: CalendarDays, title: "Rendez-vous en ligne", desc: "Planifiez directement un rendez-vous avec l'entrepreneur qui vous convient.", to: "/search" },
];

const TRUST = [
  { icon: Shield, text: "Entrepreneurs vérifiés et assurés" },
  { icon: Star, text: "Avis certifiés et transparents" },
  { icon: Clock, text: "Réponse rapide sous 24h" },
  { icon: CheckCircle2, text: "Service gratuit et sans engagement" },
];

export default function HomeownersPage() {
  const { isAuthenticated } = useAuth();
  const signupOrDash = isAuthenticated ? "/dashboard" : "/signup";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%,0.5)] via-[hsl(222,47%,8%,0.3)] to-[hsl(222,47%,6%,0.85)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="absolute top-[5%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/15 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-36 md:pt-40 md:pb-48">
          <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-white/10 text-white/90 border-white/20 backdrop-blur-md">
                <Home className="h-3 w-3" /> Pour les propriétaires
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-[2rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-white">
              Gérez votre maison,{" "}
              <span className="bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                en toute confiance
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm text-white/65 leading-relaxed max-w-sm mx-auto">
              Analysez vos soumissions, évaluez votre propriété et trouvez les meilleurs entrepreneurs — le tout propulsé par l'IA.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_32px_-4px_hsl(222,100%,61%,0.5)]">
                <Link to={signupOrDash}>Commencer gratuitement <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md">
                <Link to="/search">Explorer les entrepreneurs</Link>
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
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Simple et rapide</p>
            <h2 className="text-xl font-bold text-foreground">Comment ça marche ?</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center relative">
                  <div className="absolute -top-2.5 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                    {s.step}
                  </div>
                  <div className="h-11 w-11 mx-auto rounded-xl bg-primary/8 flex items-center justify-center mb-2">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Tout-en-un</p>
            <h2 className="text-xl font-bold text-foreground">Vos outils propriétaire</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i}>
                <Link to={f.to}>
                  <div className="glass-card rounded-2xl p-5 hover:shadow-elevation transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Pourquoi UNPRO ?</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 gap-3">
            {TRUST.map((t, i) => (
              <motion.div key={t.text} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center space-y-2">
                  <t.icon className="h-5 w-5 text-success mx-auto" />
                  <p className="text-[11px] font-medium text-foreground leading-tight">{t.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Prêt à prendre le contrôle de votre maison ?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Créez votre compte gratuitement et commencez à gérer votre propriété intelligemment.
          </p>
          <Button asChild size="lg" className="rounded-2xl h-14 min-w-[260px] text-base bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_32px_-4px_hsl(222,100%,61%,0.4)]">
            <Link to={signupOrDash}>Créer mon compte <ChevronRight className="h-5 w-5 ml-1" /></Link>
          </Button>
          <div className="flex items-center justify-center gap-4">
            {[{ icon: CheckCircle2, label: "Gratuit" }, { icon: Shield, label: "Sécurisé" }, { icon: Heart, label: "Sans engagement" }].map(b => (
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
