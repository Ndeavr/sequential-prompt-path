import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Home as HomeIcon, Shield, TrendingUp, Users,
  MapPin, Sparkles, ArrowRight, Star, Clock,
  MessageCircle, CalendarDays, Heart, Brain, FolderOpen, Lightbulb, HardHat,
} from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-home.jpg";

/* ─── Animation presets ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Wave SVG ─── */
const WaveDivider = ({ className = "" }: { className?: string }) => (
  <div className={`absolute left-0 right-0 overflow-hidden leading-[0] z-10 ${className}`}>
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="block w-full h-10 md:h-12">
      <path
        d="M0 24C240 0 480 48 720 24C960 0 1200 48 1440 24V48H0Z"
        fill="hsl(var(--background))"
      />
    </svg>
  </div>
);

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Hero image background */}
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
          {/* Gradient overlays for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,8%,0.55)] via-[hsl(222,47%,8%,0.35)] to-[hsl(222,47%,8%,0.75)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,100%,12%,0.6)] via-transparent to-transparent" />
        </div>

        {/* Decorative glow orbs */}
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[-15%] w-[40vw] h-[40vw] rounded-full bg-accent/15 blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-24 pb-40 md:pt-36 md:pb-52">
          <motion.div className="space-y-6 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-white/10 text-white/90 border-white/20 backdrop-blur-md">
                <Sparkles className="h-3 w-3" /> Intelligence immobilière
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-[2.5rem] md:text-[3.5rem] leading-[1.06] font-extrabold tracking-[-0.03em] text-white">
              Trouvez le bon{" "}
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">entrepreneur</span>
              <br />
              du premier coup
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-white/70 max-w-md mx-auto leading-relaxed">
              Analysez vos soumissions, comparez les entrepreneurs et prenez des décisions éclairées grâce à l'IA.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center gap-3 pt-2">
              {isAuthenticated ? (
                <Button asChild size="lg" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_32px_-4px_hsl(222,100%,61%,0.5)]">
                  <Link to={dash}>Mon tableau de bord <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_0_32px_-4px_hsl(222,100%,61%,0.5)]">
                    <Link to="/signup"><Search className="h-4 w-4 mr-2" /> Analyser 3 soumissions</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md">
                    <Link to="/login">Se connecter</Link>
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>

        <WaveDivider className="bottom-0" />
      </section>

      {/* ══════════════════════ FLOATING CARDS ══════════════════════ */}
      <section className="relative z-20 -mt-20 px-5 pb-8">
        <div className="max-w-lg mx-auto space-y-3">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {/* Card 1 — Analyser 3 soumissions */}
            <motion.div variants={fadeUp} custom={0}>
              <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                <div className="glass-card rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-base">Analyser 3 Soumissions</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Obtenez une analyse détaillée de 3 soumissions.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full rounded-xl h-10 text-sm border-border/60 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    Analyser mes Soumissions
                  </Button>
                </div>
              </Link>
            </motion.div>

            {/* Card 2 — Score Maison */}
            <motion.div variants={fadeUp} custom={1}>
              <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                <div className="glass-card rounded-3xl p-5 shadow-lg hover:shadow-xl transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-success/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-base">Quel est mon Score Maison?</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Évaluez la santé de votre maison instantanément.</p>
                    </div>
                  </div>
                  <Button size="sm" className="mt-4 w-full rounded-xl h-10 text-sm bg-success hover:bg-success/90 text-success-foreground">
                    Voir Mon Score <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </Link>
            </motion.div>

            {/* Card 3 — Alex IA */}
            <motion.div variants={fadeUp} custom={2}>
              <div className="glass-card rounded-3xl p-5 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-base">ALEX <span className="text-muted-foreground font-normal text-sm">— Conseiller IA</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Posez vos questions.</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="mt-4 w-full rounded-xl h-10 text-sm border-border/60 gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Posez-moi une Question
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ ENTREPRENEUR RECOMMANDÉ ══════════════════════ */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <WaveDivider className="top-0 rotate-180" />

        <div className="relative z-10 max-w-lg mx-auto w-full px-5 pt-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-foreground mb-5"
          >
            Entrepreneurs Recommandés
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <div className="glass-card rounded-3xl p-5 shadow-lg space-y-4">
              {/* Header row */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 overflow-hidden flex items-center justify-center">
                  <HardHat className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-bold text-foreground uppercase text-sm tracking-wide">TOITURE EXPERT</h3>
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-400" />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">(34 Avis)</span>
                  </div>
                </div>
                {/* AIPP Score badge */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className="bg-primary text-primary-foreground font-extrabold text-lg px-3 py-1 rounded-xl leading-tight">
                    88<span className="text-xs font-normal opacity-70">/100</span>
                  </div>
                  <span className="text-[10px] font-semibold text-success mt-0.5">Très fiable</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="space-y-2">
                {[
                  { icon: Clock, text: "15+ années d'expérience" },
                  { icon: Shield, text: "Certifié & Assuré" },
                  { icon: Star, text: "Excellent Avis" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5 text-sm text-foreground">
                    <item.icon className="h-4 w-4 text-success shrink-0" />
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button asChild size="sm" className="flex-1 rounded-xl gap-1.5 h-11 text-sm">
                  <Link to="/search"><CalendarDays className="h-3.5 w-3.5" /> Rendez-vous</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 rounded-xl gap-1.5 h-11 text-sm bg-success hover:bg-success/90 text-success-foreground">
                  <Link to="/search"><MessageCircle className="h-3.5 w-3.5" /> Message</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <WaveDivider className="bottom-0" />
      </section>

      {/* ══════════════════════ ENTREPRENEUR CTA ══════════════════════ */}
      <section className="py-14 px-5">
        <div className="max-w-lg mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-2"
          >
            <h2 className="text-lg font-bold text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Rejoignez UNPRO pour recevoir des demandes qualifiées de propriétaires.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: TrendingUp, label: "Score AIPP" },
              { icon: Users, label: "Leads qualifiés" },
              { icon: MapPin, label: "Territoires" },
              { icon: Shield, label: "Badge vérifié" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} custom={0}>
                <div className="glass-card rounded-2xl p-4 text-center shadow-sm">
                  <item.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="text-xs font-semibold text-foreground mt-2">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="flex justify-center">
            <Button asChild size="lg" variant="secondary" className="rounded-2xl h-12 min-w-[200px] text-sm shadow-sm">
              <Link to="/signup">Activer mon profil <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ MOBILE BOTTOM NAV ══════════════════════ */}
      <nav className="sticky bottom-0 z-30 glass-surface border-t border-border/40 md:hidden">
        <div className="flex items-center justify-around h-14 px-2">
          {[
            { icon: HomeIcon, label: "Accueil", to: "/" },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login" },
            { icon: HardHat, label: "Entrepreneurs", to: "/search" },
            { icon: Lightbulb, label: "Conseils", to: "/search" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Home;
