import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Home as HomeIcon, Shield, TrendingUp, Users,
  Sparkles, ArrowRight, Star, Clock,
  MessageCircle, CalendarDays, Heart, Brain, FolderOpen, Lightbulb, HardHat,
  Building2, Handshake, FileText, Trophy, CheckCircle2, ChevronRight,
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

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const dash = role === "contractor" ? "/pro" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col">
        {/* BG image + overlays */}
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(222,47%,6%,0.45)] via-[hsl(222,47%,8%,0.25)] to-[hsl(222,47%,6%,0.85)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Glow orbs */}
        <div className="absolute top-[5%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-15%] w-[35vw] h-[35vw] rounded-full bg-accent/10 blur-[80px] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-8 pt-20">
          <motion.div className="max-w-lg mx-auto w-full space-y-5" initial="hidden" animate="visible">
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="text-[2rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-white"
            >
              Trouvez l'Entrepreneur{" "}
              <span className="bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                Idéal
              </span>{" "}
              pour vos Travaux
            </motion.h1>

            <motion.p variants={fadeUp} custom={1} className="text-sm text-white/65 leading-relaxed max-w-sm">
              Comparez, évaluez et choisissez en toute confiance.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={fadeUp} custom={2}>
              <div className="relative">
                <div className="flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-xl px-4 py-3.5 shadow-xl shadow-black/10">
                  <HomeIcon className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-foreground">Quel type de travaux ?</p>
                    <p className="text-[11px] text-muted-foreground">Ex: Rénovation, cuisine, toiture...</p>
                  </div>
                  <Link
                    to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}
                    className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-glow hover:scale-105 transition-transform"
                  >
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Popular tags */}
            <motion.div variants={fadeUp} custom={3} className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Populaire</span>
              {["🏗 Rénovation", "🏠 Construction", "📐 Agrandissement"].map((tag) => (
                <Link
                  key={tag}
                  to="/search"
                  className="rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/20 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ COMMENT ÇA MARCHE ══════════════════════ */}
      <section className="relative px-5 py-10 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-foreground mb-6"
          >
            Comment ça marche ?
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { step: "1", icon: FileText, title: "Décrivez", subtitle: "votre projet" },
              { step: "2", icon: Search, title: "Comparez", subtitle: "les soumissions" },
              { step: "3", icon: Trophy, title: "Choisissez", subtitle: "le meilleur pro" },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center shadow-sm relative">
                  <div className="absolute -top-2.5 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {item.step}
                  </div>
                  <div className="h-11 w-11 mx-auto rounded-xl bg-primary/8 flex items-center justify-center mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 flex items-center justify-between"
          >
            <div>
              <p className="text-2xl font-extrabold text-foreground">+10 000</p>
              <p className="text-xs text-muted-foreground">projets réussis</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current text-amber-400" />
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">4.9/5</p>
                <p className="text-[10px] text-muted-foreground">basé sur 2,500 avis</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ CTA PRINCIPAL ══════════════════════ */}
      <section className="px-5 pb-6">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_32px_-4px_hsl(222,100%,61%,0.45)] hover:shadow-[0_8px_40px_-4px_hsl(222,100%,61%,0.6)] transition-shadow"
            >
              <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                Décrivez votre projet
                <ChevronRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {[
                { icon: CheckCircle2, label: "Gratuit & Rapide" },
                { icon: Shield, label: "Sécurisé" },
                { icon: Heart, label: "Sans engagement" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-1">
                  <b.icon className="h-3 w-3 text-success" />
                  <span className="text-[10px] font-medium text-muted-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ AUDIENCE GATEWAY ══════════════════════ */}
      <section className="relative px-5 py-10">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">Choisissez votre parcours</p>
            <h2 className="text-lg font-bold text-foreground">À qui s'adresse UNPRO ?</h2>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {[
              {
                icon: HomeIcon, title: "Propriétaires", desc: "Gérez votre propriété et trouvez des professionnels de confiance.",
                cta: "Gérer ma propriété", to: isAuthenticated ? dash : "/signup",
                iconBg: "bg-primary", gradient: "bg-primary/20",
              },
              {
                icon: HardHat, title: "Professionnels", desc: "Développez votre entreprise avec des projets qualifiés.",
                cta: "Inscrire mon entreprise", to: "/signup",
                iconBg: "bg-secondary", gradient: "bg-secondary/20",
              },
              {
                icon: Handshake, title: "Partenaires & Institutions", desc: "Assurances, banques, municipalités — intégrez l'écosystème.",
                cta: "Explorer les partenariats", to: "/search",
                iconBg: "bg-gradient-to-br from-accent to-primary", gradient: "bg-accent/20",
              },
            ].map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} custom={i}>
                <Link to={card.to} className="block">
                  <div className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-elevation transition-all group relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-28 h-28 rounded-full ${card.gradient} blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none`} />
                    <div className="relative flex items-center gap-4">
                      <div className={`h-12 w-12 shrink-0 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                        <card.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-[15px]">{card.title}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{card.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ FEATURE CARDS ══════════════════════ */}
      <section className="relative px-5 py-8">
        <div className="max-w-lg mx-auto space-y-3">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {/* Analyser soumissions */}
            <motion.div variants={fadeUp} custom={0}>
              <Link to={isAuthenticated ? "/dashboard/quotes/upload" : "/signup"}>
                <div className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-elevation transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-[15px]">Analyser 3 Soumissions</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Analyse détaillée par IA en quelques secondes.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="mt-4 w-full rounded-xl h-10 text-sm border-border/60 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    Analyser mes Soumissions
                  </Button>
                </div>
              </Link>
            </motion.div>

            {/* Score Maison */}
            <motion.div variants={fadeUp} custom={1}>
              <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                <div className="glass-card rounded-2xl p-5 shadow-sm hover:shadow-elevation transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-success/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-[15px]">Quel est mon Score Maison?</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Évaluez la santé de votre maison instantanément.</p>
                    </div>
                  </div>
                  <Button size="sm" className="mt-4 w-full rounded-xl h-10 text-sm bg-success hover:bg-success/90 text-success-foreground">
                    Voir Mon Score <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </Link>
            </motion.div>

            {/* Alex IA */}
            <motion.div variants={fadeUp} custom={2}>
              <div className="glass-card rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-[15px]">Alex <span className="text-muted-foreground font-normal text-sm">— Conseiller IA</span></p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Posez vos questions sur vos travaux.</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="mt-4 w-full rounded-xl h-10 text-sm border-border/60 gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Parler avec Alex
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ ENTREPRENEUR RECOMMANDÉ ══════════════════════ */}
      <section className="relative py-10 overflow-hidden">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto w-full px-5">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-bold text-foreground mb-5"
          >
            Entrepreneur Recommandé
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <div className="glass-card rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center">
                  <HardHat className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-bold text-foreground uppercase text-sm tracking-wide">TOITURE EXPERT</h3>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-3 w-3 fill-current text-amber-400" />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">(34 Avis)</span>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-center">
                  <div className="bg-primary text-primary-foreground font-extrabold text-base px-2.5 py-1 rounded-lg leading-tight">
                    88<span className="text-[10px] font-normal opacity-70">/100</span>
                  </div>
                  <span className="text-[9px] font-semibold text-success mt-0.5">Très fiable</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {[
                  { icon: Clock, text: "15+ années d'expérience" },
                  { icon: Shield, text: "Certifié & Assuré" },
                  { icon: Star, text: "Excellents Avis" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm text-foreground">
                    <item.icon className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="text-xs font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button asChild size="sm" className="flex-1 rounded-xl gap-1.5 h-10 text-sm">
                  <Link to="/search"><CalendarDays className="h-3.5 w-3.5" /> Rendez-vous</Link>
                </Button>
                <Button asChild size="sm" className="flex-1 rounded-xl gap-1.5 h-10 text-sm bg-success hover:bg-success/90 text-success-foreground">
                  <Link to="/search"><MessageCircle className="h-3.5 w-3.5" /> Message</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ APPROUVÉ PAR DES MILLIERS ══════════════════════ */}
      <section className="px-5 py-8">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-5 text-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(0,0%,100%,0.08),transparent_60%)] pointer-events-none" />
              <div className="relative z-10">
                <p className="text-sm font-bold text-primary-foreground mb-3">Approuvé par des milliers de clients</p>
                <div className="flex justify-center -space-x-2 mb-2">
                  {[1,2,3,4,5,6].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="h-10 w-10 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center text-[11px] font-bold text-primary-foreground backdrop-blur-sm">
                    +2k
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════ ENTREPRENEUR CTA ══════════════════════ */}
      <section className="py-10 px-5">
        <div className="max-w-lg mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-2"
          >
            <h2 className="text-lg font-bold text-foreground">Vous êtes entrepreneur?</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Rejoignez UNPRO pour recevoir des demandes qualifiées.
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
              { icon: Building2, label: "Territoires" },
              { icon: Shield, label: "Badge vérifié" },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} custom={0}>
                <div className="glass-card rounded-xl p-4 text-center shadow-sm">
                  <item.icon className="h-5 w-5 text-primary mx-auto" />
                  <p className="text-[11px] font-semibold text-foreground mt-2">{item.label}</p>
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
            { icon: HomeIcon, label: "Accueil", to: "/", active: true },
            { icon: FolderOpen, label: "Projets", to: isAuthenticated ? "/dashboard" : "/login", active: false },
            { icon: HardHat, label: "Entrepreneurs", to: "/search", active: false },
            { icon: Lightbulb, label: "Conseils", to: "/search", active: false },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 transition-colors ${item.active ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
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
