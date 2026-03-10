import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, Home as HomeIcon, Shield, TrendingUp, Users, MapPin, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01, transition: { duration: 0.25, ease: "easeOut" as const } },
};

const Home = () => {
  const { isAuthenticated, role } = useAuth();

  const getDashboardLink = () => {
    if (role === "contractor") return "/pro";
    if (role === "admin") return "/admin";
    return "/dashboard";
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-20 md:pt-28 md:pb-32 text-center overflow-hidden hero-gradient noise-overlay">
        {/* Decorative circles */}
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-secondary/[0.03] blur-3xl pointer-events-none" />

        <motion.div
          className="relative space-y-8 max-w-2xl z-10"
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full glass-surface px-4 py-2 text-sm font-medium text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> Intelligence immobilière
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-[2.75rem] md:text-[3.5rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
            <span className="text-gradient">UNPRO</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Intelligence immobilière propulsée par l'IA pour propriétaires et entrepreneurs.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px] h-13 text-base rounded-2xl shadow-glow">
                <Link to={getDashboardLink()}>Mon tableau de bord <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="w-full sm:w-auto min-w-[200px] h-13 text-base rounded-2xl shadow-glow">
                  <Link to="/signup">Créer un compte <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px] h-13 text-base rounded-2xl glass-surface">
                  <Link to="/login">Se connecter</Link>
                </Button>
              </>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={4}>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary gap-1">
              <Link to="/search">Trouver un entrepreneur <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Action cards */}
      <section className="max-w-4xl mx-auto w-full px-4 -mt-8 md:-mt-12 relative z-20 pb-16 space-y-8">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-section text-foreground text-center pt-16"
        >
          Passez à l'action
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { icon: Upload, title: "Analyser une soumission", desc: "IA analyse vos devis gratuitement", to: isAuthenticated ? "/dashboard/quotes/upload" : "/signup", gradient: "from-primary/10 to-accent/10" },
            { icon: Search, title: "Trouver un entrepreneur", desc: "Entrepreneurs vérifiés près de chez vous", to: "/search", gradient: "from-secondary/10 to-primary/10" },
            { icon: HomeIcon, title: "Score maison", desc: "Évaluez l'état de votre propriété", to: isAuthenticated ? "/dashboard/home-score" : "/signup", gradient: "from-success/10 to-accent/10" },
          ].map((a) => (
            <motion.div key={a.title} variants={fadeUp} custom={0}>
              <motion.div initial="rest" whileHover="hover" variants={cardHover}>
                <Card className="h-full glass-card border-0 shadow-elevation hover:shadow-float transition-shadow duration-300 group">
                  <CardContent className="p-6 space-y-4">
                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <a.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground text-base">{a.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                    </div>
                    <Button asChild size="sm" variant="soft" className="w-full rounded-xl">
                      <Link to={a.to}>Commencer <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Contractor acquisition */}
      <section className="relative py-20 px-4 overflow-hidden section-gradient noise-overlay">
        <div className="relative max-w-4xl mx-auto space-y-10 z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3"
          >
            <h2 className="text-section text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
              Rejoignez UNPRO pour recevoir des demandes qualifiées.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-5 md:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: TrendingUp, label: "Score AIPP", desc: "Mesurez votre performance", gradient: "from-primary/10 to-primary/5" },
              { icon: Users, label: "Leads qualifiés", desc: "Demandes vérifiées", gradient: "from-secondary/10 to-secondary/5" },
              { icon: MapPin, label: "Territoires exclusifs", desc: "Accès par zone", gradient: "from-accent/10 to-accent/5" },
              { icon: Shield, label: "Profil vérifié", desc: "Badge de confiance", gradient: "from-success/10 to-success/5" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} custom={0} className="text-center space-y-3">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mx-auto shadow-soft`}>
                  <item.icon className="h-6 w-6 text-foreground/70" />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-meta text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Button asChild size="lg" variant="secondary" className="rounded-2xl h-13 min-w-[220px] text-base shadow-soft">
              <Link to="/signup">Activer mon profil <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
