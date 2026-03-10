import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, Home as HomeIcon, Shield, TrendingUp, Users, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
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
      <section className="relative flex flex-col items-center justify-center px-4 py-20 md:py-32 text-center overflow-hidden">
        <div className="absolute inset-0 bg-blob-primary" />
        <div className="absolute inset-0 bg-blob-secondary" />
        <motion.div
          className="relative space-y-6 max-w-2xl z-10"
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Intelligence immobilière
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-hero-sm md:text-hero text-gradient">
            UNPRO
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-body-lg text-muted-foreground max-w-lg mx-auto">
            Intelligence immobilière propulsée par l'IA pour propriétaires et entrepreneurs.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Button asChild size="lg"><Link to={getDashboardLink()}>Mon tableau de bord</Link></Button>
            ) : (
              <>
                <Button asChild size="lg"><Link to="/signup">Créer un compte</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/login">Se connecter</Link></Button>
              </>
            )}
            <Button asChild size="lg" variant="soft"><Link to="/search">Trouver un entrepreneur</Link></Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Homeowner actions */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16 space-y-6">
        <h2 className="text-section text-foreground text-center">Passez à l'action</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Upload, title: "Analyser une soumission", desc: "IA analyse vos devis gratuitement", to: isAuthenticated ? "/dashboard/quotes/upload" : "/signup" },
            { icon: Search, title: "Trouver un entrepreneur", desc: "Entrepreneurs vérifiés près de chez vous", to: "/search" },
            { icon: HomeIcon, title: "Score maison", desc: "Évaluez l'état de votre propriété", to: isAuthenticated ? "/dashboard/home-score" : "/signup" },
          ].map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="h-full hover:shadow-elevated transition-all duration-300 group">
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <a.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">{a.title}</p>
                  <p className="text-meta text-muted-foreground">{a.desc}</p>
                  <Button asChild size="sm" variant="soft" className="w-full">
                    <Link to={a.to}>Commencer</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contractor acquisition */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
        <div className="relative max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-section text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-muted-foreground text-body-lg max-w-md mx-auto">Rejoignez UNPRO pour recevoir des demandes qualifiées.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, label: "Score AIPP", desc: "Mesurez votre performance" },
              { icon: Users, label: "Leads qualifiés", desc: "Demandes vérifiées" },
              { icon: MapPin, label: "Territoires exclusifs", desc: "Accès par zone" },
              { icon: Shield, label: "Profil vérifié", desc: "Badge de confiance" },
            ].map((item) => (
              <div key={item.label} className="text-center space-y-2">
                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto">
                  <item.icon className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-meta text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button asChild size="lg" variant="secondary"><Link to="/signup">Activer mon profil</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
