import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Search, Home as HomeIcon, Shield, TrendingUp, Users,
  MapPin, Sparkles, ArrowRight, ChevronRight, Star, Clock,
} from "lucide-react";
import { motion } from "framer-motion";

/* ─── Animation presets ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ─── Wave SVG ─── */
const WaveDivider = ({ flip = false }: { flip?: boolean }) => (
  <div className={flip ? "wave-divider-top" : "wave-divider"}>
    <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
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
    <div className="flex min-h-screen flex-col">
      {/* ────── HERO ────── */}
      <section className="relative flex flex-col items-center justify-center px-5 pt-20 pb-28 md:pt-32 md:pb-40 text-center overflow-hidden hero-gradient noise-overlay">
        {/* Soft decorative glows */}
        <div className="absolute top-[-25%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-accent/[0.04] blur-3xl pointer-events-none" />

        <motion.div className="relative z-10 space-y-7 max-w-xl" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-card/80 text-primary border-border shadow-sm">
              <Sparkles className="h-3 w-3" /> Intelligence immobilière
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-[2.25rem] md:text-[3.25rem] leading-[1.08] font-extrabold tracking-[-0.03em]">
            Trouvez le bon entrepreneur
            <br />
            <span className="text-gradient">du premier coup</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-base md:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Analysez vos soumissions, comparez les entrepreneurs et prenez des décisions éclairées grâce à l'IA.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            {isAuthenticated ? (
              <Button asChild size="lg" className="w-full sm:w-auto min-w-[220px] h-14 text-base rounded-2xl shadow-glow">
                <Link to={dash}>Mon tableau de bord <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="w-full sm:w-auto min-w-[220px] h-14 text-base rounded-2xl shadow-glow">
                  <Link to="/signup">Analyser 3 soumissions <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto min-w-[220px] h-14 text-base rounded-2xl glass-surface border-border/60">
                  <Link to="/login">Se connecter</Link>
                </Button>
              </>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={4}>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary gap-1 text-sm">
              <Link to="/search">Trouver un entrepreneur <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>

        <WaveDivider />
      </section>

      {/* ────── ALEX CARD ────── */}
      <section className="max-w-xl mx-auto w-full px-5 -mt-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass-card border-0 shadow-lg overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Alex — Conseiller IA</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Décrivez votre projet, Alex vous guide vers le bon entrepreneur.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ────── ACTION CARDS ────── */}
      <section className="max-w-xl mx-auto w-full px-5 py-12 space-y-6">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-lg font-bold text-foreground"
        >
          Passez à l'action
        </motion.h2>

        <motion.div className="space-y-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {[
            { icon: Upload, title: "Analyser une soumission", desc: "L'IA vérifie vos devis et identifie les anomalies", to: isAuthenticated ? "/dashboard/quotes/upload" : "/signup" },
            { icon: Search, title: "Trouver un entrepreneur", desc: "Entrepreneurs vérifiés, notés et certifiés", to: "/search" },
            { icon: HomeIcon, title: "Voir mon score maison", desc: "Évaluez l'état de votre propriété en quelques clics", to: isAuthenticated ? "/dashboard/home-score" : "/signup" },
          ].map((a) => (
            <motion.div key={a.title} variants={fadeUp} custom={0}>
              <Link to={a.to}>
                <Card className="glass-card border-0 shadow-sm hover:shadow-md transition-shadow duration-300 group">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                      <a.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{a.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ────── FEATURED CONTRACTOR (mock) ────── */}
      <section className="relative py-14 overflow-hidden">
        <WaveDivider flip />
        <div className="section-gradient noise-overlay absolute inset-0" />
        <div className="relative z-10 max-w-xl mx-auto w-full px-5 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-foreground"
          >
            Entrepreneur recommandé
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Card className="glass-card border-0 shadow-md">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-gradient">R</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">Rénovation Apex</h3>
                      <Badge variant="secondary" className="gap-1 text-[10px] bg-success/10 text-success border-0 rounded-full">
                        <Shield className="h-2.5 w-2.5" /> Vérifié
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-current text-accent" /> 4.8</span>
                      <span>42 avis</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 12+ ans</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">AIPP</div>
                    <div className="text-lg font-bold text-primary">87</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["Certifié & Assuré", "Excellent Avis", "12+ ans d'expérience"].map((t) => (
                    <span key={t} className="trust-badge bg-muted/60 text-muted-foreground">{t}</span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button asChild size="sm" className="flex-1 rounded-xl gap-1 h-10">
                    <Link to="/search">Rendez-vous <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl h-10 glass-surface border-border/60">
                    <Link to="/search">Voir profil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <WaveDivider />
      </section>

      {/* ────── CONTRACTOR ACQUISITION ────── */}
      <section className="py-16 px-5">
        <div className="max-w-xl mx-auto space-y-8">
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
                <Card className="glass-card border-0 shadow-sm text-center">
                  <CardContent className="p-4 space-y-2">
                    <item.icon className="h-5 w-5 text-primary mx-auto" />
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  </CardContent>
                </Card>
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
    </div>
  );
};

export default Home;
