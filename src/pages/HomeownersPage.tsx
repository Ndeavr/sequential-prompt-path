import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Shield, Lock, Eye, FileText,
  Home, Search, Sparkles, TrendingUp, Award,
  Wrench, DollarSign, Users, CheckCircle2,
} from "lucide-react";
import { useRef } from "react";

/* ═══ Animation helpers ═══ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

function InViewSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══ Animated Score Gauge ═══ */
function ScoreGauge({ score, size = 160, delay = 0.5 }: { score: number; size?: number; delay?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? "hsl(152 69% 51%)" : score >= 50 ? "hsl(222 100% 65%)" : "hsl(38 92% 50%)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.25" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay }}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" opacity="0.12"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay }}
          style={{ filter: "blur(6px)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display text-5xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.6, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs font-medium text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ═══ Section data ═══ */
const HOW_STEPS = [
  {
    icon: Search,
    number: "01",
    title: "Entrez votre adresse",
    description: "Adresse de votre propriété",
    details: ["Identification automatique", "Données publiques intégrées"],
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Analyse intelligente",
    description: "Notre IA analyse votre propriété",
    details: ["Inspection", "Documents", "Données maison"],
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Score Maison",
    description: "Découvrez votre résultat",
    details: ["Plan d'entretien", "Subventions", "Recommandations"],
  },
];

const PASSPORT_FEATURES = [
  { icon: TrendingUp, label: "Score Maison", value: "82 / 100" },
  { icon: FileText, label: "Historique travaux", value: "12 entrées" },
  { icon: DollarSign, label: "Subventions disponibles", value: "3 200 $" },
  { icon: Users, label: "Entrepreneurs recommandés", value: "5 pros" },
];

const PRIVACY_POINTS = [
  { icon: Lock, text: "Vos données restent privées et chiffrées" },
  { icon: Eye, text: "Accès autorisé par vous seulement" },
  { icon: Shield, text: "Aucune donnée partagée sans consentement" },
];

/* ═══ Main Page ═══ */
export default function HomeownersPage() {
  const { isAuthenticated } = useAuth();
  const [address, setAddress] = useState("");
  const [neighborCount, setNeighborCount] = useState(0);

  // Only show neighbor count after user has typed a real address (min 10 chars)
  useEffect(() => {
    if (address.length >= 10) {
      const target = 3 + Math.floor(Math.random() * 5);
      const timer = setTimeout(() => setNeighborCount(target), 800);
      return () => clearTimeout(timer);
    } else {
      setNeighborCount(0);
    }
  }, [address]);

  return (
    <MainLayout>
      <div className="bg-background min-h-screen">

        {/* ═══════════════════════════════════════
            SECTION 1 — HERO
        ═══════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Ambient aura */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[120px]" style={{ background: "hsl(222 100% 61% / 0.07)" }} />
            <div className="absolute bottom-[-80px] right-[-100px] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "hsl(252 100% 65% / 0.05)" }} />
            <div className="absolute top-1/2 left-[-60px] w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: "hsl(195 100% 50% / 0.04)" }} />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-5 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="md:grid md:grid-cols-[1fr_340px] md:gap-12 md:items-center">
              {/* Left — text + form */}
              <motion.div initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ background: "hsl(222 100% 61% / 0.06)", borderColor: "hsl(222 100% 61% / 0.12)" }}>
                  <Home className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Score Maison</span>
                </motion.div>

                <motion.h1 variants={fadeUp} custom={1} className="font-display text-[36px] sm:text-[48px] md:text-[56px] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
                  Quel est le score de{" "}
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    votre maison
                  </span>{" "}
                  ?
                </motion.h1>

                <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  Découvrez la valeur cachée de votre propriété. Gratuit, instantané, confidentiel.
                </motion.p>

                {/* Address input */}
                <motion.div variants={fadeUp} custom={3} className="max-w-md space-y-3">
                  <div className="flex gap-2">
                    <GooglePlacesInput
                      value={address}
                      onChange={setAddress}
                      placeholder="123 rue des Érables, Laval"
                      className="flex-1"
                    />
                    <Button
                      asChild
                      size="lg"
                      className="h-13 rounded-2xl px-6 font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all shrink-0"
                    >
                      <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                        <span className="hidden sm:inline">Voir mon score</span>
                        <ArrowRight className="h-4 w-4 sm:ml-1.5" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Gratuit</span>
                    <span>•</span>
                    <span>2 minutes</span>
                  </div>

                  {neighborCount > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 }}
                      className="text-xs font-semibold text-primary"
                    >
                      🏘️ {neighborCount} maisons de votre rue utilisent déjà UNPRO
                    </motion.p>
                  )}
                </motion.div>
              </motion.div>

              {/* Right — Score preview card */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hidden md:block"
              >
                <div className="rounded-3xl border border-border/30 p-6 shadow-xl" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Score Maison</p>
                  <div className="flex justify-center my-4">
                    <ScoreGauge score={82} size={140} delay={1} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">Quartier Mascouche</p>
                    <p className="text-xs text-muted-foreground">Score moyen du quartier : <span className="font-bold text-foreground">78</span></p>
                  </div>
                  {/* Mini breakdown */}
                  <div className="mt-4 space-y-1.5">
                    {[
                      { label: "Structure", val: 88 },
                      { label: "Énergie", val: 72 },
                      { label: "Systèmes", val: 79 },
                    ].map((b) => (
                      <div key={b.label} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-muted-foreground text-right">{b.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${b.val}%` }}
                            transition={{ delay: 1.8 + 0.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <span className="w-6 font-bold text-foreground">{b.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Wave separator */}
          <div className="pointer-events-none absolute -bottom-px left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 50C240 20 480 70 720 40C960 10 1200 60 1440 35V80H0V50Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 2 — COMMENT ÇA FONCTIONNE
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-24">
          <InViewSection className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Comment ça fonctionne
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Trois étapes simples pour connaître la santé de votre maison.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {HOW_STEPS.map((step, i) => (
                <motion.div
                  key={step.number}
                  variants={fadeUp}
                  custom={i + 1}
                  className="relative rounded-2xl border border-border/30 bg-card/80 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-primary/40 tracking-widest">{step.number}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                  <div className="space-y-1">
                    {step.details.map((d) => (
                      <div key={d} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 3 — PASSEPORT MAISON
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-24" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 20% 96%) 100%)" }}>
          <InViewSection className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-secondary/15 bg-secondary/6 mb-4">
                <FileText className="h-3 w-3 text-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Passeport Maison</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Tout sur votre maison, en un seul endroit
              </h2>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={1}
              className="max-w-lg mx-auto rounded-3xl border border-border/30 bg-card/90 p-6 md:p-8 shadow-xl backdrop-blur-xl"
            >
              <div className="grid grid-cols-2 gap-4">
                {PASSPORT_FEATURES.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-2xl border border-border/20 bg-muted/20 p-4 hover:bg-muted/40 transition-colors cursor-default"
                  >
                    <f.icon className="h-5 w-5 text-primary mb-2" />
                    <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                    <p className="text-sm font-bold text-foreground">{f.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 4 — EXEMPLE CONCRET
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-24">
          <InViewSection className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Impact réel sur votre score
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Chaque amélioration augmente la valeur de votre maison.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { title: "Isolation grenier", impact: "+5 pts", subsidy: "1 200 $", color: "hsl(var(--success))" },
                { title: "Fenêtres écoénergétiques", impact: "+7 pts", subsidy: "2 800 $", color: "hsl(var(--primary))" },
                { title: "Thermopompe", impact: "+4 pts", subsidy: "1 500 $", color: "hsl(var(--accent))" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  custom={i + 1}
                  className="rounded-2xl border border-border/30 bg-card/80 p-5 hover:shadow-lg transition-shadow text-center"
                >
                  <Wrench className="h-5 w-5 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-foreground mb-2">{item.title}</h3>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-bold mb-2">
                    <TrendingUp className="h-3 w-3" />
                    Score {item.impact}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subvention possible
                  </p>
                  <p className="text-lg font-bold text-foreground">{item.subsidy}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-primary hover:text-primary font-semibold"
                    asChild
                  >
                    <Link to="/search">Voir les entrepreneurs <ArrowRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 5 — CERTIFICAT MAISON
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-24" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 20% 96%) 100%)" }}>
          <InViewSection className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} custom={0}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-foreground/10 bg-foreground/5 mb-6">
                <Award className="h-3 w-3 text-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">Certification</span>
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={1}
              className="rounded-3xl border-2 border-foreground/10 bg-card p-8 md:p-12 max-w-sm mx-auto shadow-xl"
            >
              <div className="h-16 w-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-foreground" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">Maison certifiée</p>
              <p className="font-display text-2xl font-bold text-foreground mb-1">UNPRO</p>
              <div className="h-px w-12 bg-border mx-auto my-4" />
              <p className="text-xs text-muted-foreground mb-1">Score Maison</p>
              <p className="font-display text-4xl font-bold text-foreground">86</p>
            </motion.div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 6 — PLAQUE MAISON
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-20">
          <InViewSection className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} custom={0} className="space-y-4">
              <div className="inline-flex items-center justify-center rounded-2xl border-2 border-border/40 bg-card/80 px-10 py-6 shadow-lg mx-auto">
                <div className="text-center">
                  <p className="font-display text-5xl font-bold text-foreground tracking-tight">1247</p>
                  <div className="h-px w-8 bg-primary mx-auto my-2" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">UNPRO Certifié</p>
                </div>
              </div>
              <p className="text-lg text-foreground font-semibold max-w-sm mx-auto">
                Certaines maisons choisissent d'afficher leur{" "}
                <span className="text-primary">Passeport Maison</span> UNPRO.
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Un gage de transparence et de confiance pour les acheteurs potentiels.
              </p>
            </motion.div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 7 — CONFIDENTIALITÉ
        ═══════════════════════════════════════ */}
        <section className="px-5 py-16 md:py-20" style={{ background: "hsl(220 20% 97%)" }}>
          <InViewSection className="max-w-2xl mx-auto text-center">
            <motion.div variants={fadeUp} custom={0}>
              <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Votre Passeport Maison vous appartient.
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Nous prenons votre vie privée au sérieux.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-4">
              {PRIVACY_POINTS.map((p, i) => (
                <motion.div
                  key={p.text}
                  variants={fadeUp}
                  custom={i + 1}
                  className="rounded-2xl border border-border/30 bg-card/80 p-5"
                >
                  <p.icon className="h-5 w-5 text-primary mx-auto mb-3" />
                  <p className="text-sm text-foreground font-medium">{p.text}</p>
                </motion.div>
              ))}
            </div>
          </InViewSection>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 8 — CTA FINAL
        ═══════════════════════════════════════ */}
        <section className="px-5 py-20 md:py-28 relative overflow-hidden">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px]" style={{ background: "hsl(222 100% 61% / 0.06)" }} />
          </div>

          <InViewSection className="relative z-10 max-w-lg mx-auto text-center">
            <motion.div variants={fadeUp} custom={0} className="space-y-5">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Découvrez le score de votre maison
              </h2>

              <div className="max-w-sm mx-auto space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Votre adresse"
                    className="h-13 rounded-2xl bg-card border-border/40 text-base px-5 flex-1 shadow-sm"
                  />
                  <Button
                    asChild
                    size="lg"
                    className="h-13 rounded-2xl px-6 font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all shrink-0"
                  >
                    <Link to={isAuthenticated ? "/dashboard/home-score" : "/signup"}>
                      <span className="hidden sm:inline">Créer mon Passeport</span>
                      <ArrowRight className="h-4 w-4 sm:ml-1.5" />
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gratuit • Sans engagement
                </p>
              </div>
            </motion.div>
          </InViewSection>
        </section>

      </div>
    </MainLayout>
  );
}
