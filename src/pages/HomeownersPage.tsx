import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  Home, ArrowRight, CheckCircle2, Shield, Sparkles,
  ChevronRight, Leaf, Droplets, Wind, Zap, HardHat,
  TrendingUp, FileText, Star,
} from "lucide-react";

/* ─── Animation presets ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/* ─── Score Gauge SVG ─── */
const ScoreGauge = ({ score, size = 180 }: { score: number; size?: number }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "hsl(152 69% 51%)" : score >= 60 ? "hsl(222 100% 65%)" : score >= 40 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" opacity="0.3"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        {/* Glow */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" opacity="0.15"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          style={{ filter: "blur(6px)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-display text-4xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-meta text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
};

/* ─── Simulated result data ─── */
const MOCK_STRENGTHS = [
  { icon: HardHat, label: "Toiture récente (< 5 ans)" },
  { icon: Zap, label: "Fenêtres écoénergétiques" },
  { icon: Shield, label: "Fondation en bon état" },
];
const MOCK_IMPROVEMENTS = [
  { icon: Leaf, label: "Isolation du grenier", impact: "+6 pts" },
  { icon: Wind, label: "Ventilation sous-sol", impact: "+4 pts" },
  { icon: Droplets, label: "Drainage périphérique", impact: "+3 pts" },
];
const BREAKDOWN = [
  { label: "Structure", score: 82, color: "text-success" },
  { label: "Systèmes", score: 71, color: "text-primary" },
  { label: "Extérieur", score: 78, color: "text-primary" },
  { label: "Énergie", score: 65, color: "text-warning" },
];

const PROPERTY_TYPES = ["Maison unifamiliale", "Condo", "Duplex", "Triplex", "Cottage", "Bungalow"];

export default function HomeownersPage() {
  const { isAuthenticated } = useAuth();
  const signupOrDash = isAuthenticated ? "/dashboard" : "/signup";

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !city.trim()) return;
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="bg-background min-h-screen">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/6 blur-[80px]" />
          </div>

          <div className="relative z-10 max-w-lg mx-auto px-5 pt-16 pb-12 md:pt-24 md:pb-16">
            <motion.div className="text-center space-y-4" initial="hidden" animate="visible">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15">
                <Home className="h-3 w-3 text-primary" />
                <span className="text-caption font-semibold text-primary uppercase tracking-wider">Score Maison</span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="font-display text-hero-sm md:text-hero text-foreground">
                Quel est le Score de{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                  votre maison
                </span>{" "}
                ?
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-body text-muted-foreground max-w-sm mx-auto">
                Découvrez comment votre maison se compare dans votre quartier. Gratuit, instantané, sans engagement.
              </motion.p>
            </motion.div>

            {/* ── Score Form ── */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 rounded-3xl border border-border/30 bg-card/70 backdrop-blur-xl p-5 md:p-6 shadow-elevated space-y-3"
            >
              <div>
                <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Adresse
                </label>
                <Input
                  placeholder="123 rue des Érables"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl h-11 bg-muted/30 border-border/30 text-body"
                  required
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Ville
                  </label>
                  <Input
                    placeholder="Laval"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl h-11 bg-muted/30 border-border/30 text-body"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full h-11 rounded-xl bg-muted/30 border border-border/30 px-3 text-body text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Sélectionner</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isCalculating || !address.trim() || !city.trim()}
                className="w-full h-12 rounded-2xl text-body font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow-lg hover:shadow-[0_0_48px_-4px_hsl(222_100%_65%_/_0.4)] transition-all"
              >
                {isCalculating ? (
                  <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    Analyse en cours…
                  </motion.div>
                ) : (
                  <>
                    Calculer mon Score Maison
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-3 pt-1">
                {[
                  { icon: CheckCircle2, text: "Gratuit" },
                  { icon: Shield, text: "Confidentiel" },
                  { icon: Zap, text: "Instantané" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-1">
                    <b.icon className="h-3 w-3 text-success" />
                    <span className="text-caption text-muted-foreground">{b.text}</span>
                  </div>
                ))}
              </div>
            </motion.form>
          </div>
        </section>

        {/* ── Result Section ── */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Score Card */}
              <section className="px-5 pb-8">
                <div className="max-w-lg mx-auto">
                  <div className="rounded-3xl border border-border/30 bg-card/70 backdrop-blur-xl p-6 md:p-8 shadow-elevated text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-caption uppercase tracking-[0.2em] text-primary font-semibold mb-1"
                    >
                      Score Maison
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-meta text-muted-foreground mb-6"
                    >
                      {address}, {city}
                    </motion.p>

                    <div className="flex justify-center mb-6">
                      <ScoreGauge score={74} />
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                    >
                      <TrendingUp className="h-3 w-3 text-primary" />
                      <span className="text-meta font-semibold text-primary">Bon positionnement</span>
                    </motion.div>

                    {/* Breakdown bars */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4, duration: 0.5 }}
                      className="mt-6 space-y-2.5"
                    >
                      {BREAKDOWN.map((b, i) => (
                        <div key={b.label} className="flex items-center gap-3">
                          <span className="text-meta text-muted-foreground w-20 text-right">{b.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: b.score >= 75 ? "hsl(152 69% 51%)" : b.score >= 60 ? "hsl(222 100% 65%)" : "hsl(38 92% 50%)" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${b.score}%` }}
                              transition={{ delay: 1.6 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                          <span className={`text-meta font-bold w-8 ${b.color}`}>{b.score}</span>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Analyse rapide */}
              <section className="px-5 pb-8">
                <div className="max-w-lg mx-auto">
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="font-display text-section text-foreground text-center mb-5"
                  >
                    Analyse rapide
                  </motion.h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Points forts */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.2, duration: 0.5 }}
                      className="rounded-2xl border border-success/20 bg-success/5 p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <h3 className="text-meta font-bold text-success">Points forts</h3>
                      </div>
                      <div className="space-y-2.5">
                        {MOCK_STRENGTHS.map((s) => (
                          <div key={s.label} className="flex items-center gap-2.5">
                            <s.icon className="h-4 w-4 text-success/70 shrink-0" />
                            <span className="text-meta text-foreground/80">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Améliorations */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 2.4, duration: 0.5 }}
                      className="rounded-2xl border border-warning/20 bg-warning/5 p-5"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-warning" />
                        <h3 className="text-meta font-bold text-warning">Améliorations possibles</h3>
                      </div>
                      <div className="space-y-2.5">
                        {MOCK_IMPROVEMENTS.map((s) => (
                          <div key={s.label} className="flex items-center gap-2.5">
                            <s.icon className="h-4 w-4 text-warning/70 shrink-0" />
                            <div className="flex-1">
                              <span className="text-meta text-foreground/80">{s.label}</span>
                            </div>
                            <span className="text-caption font-bold text-success">{s.impact}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Alex insight */}
              <section className="px-5 pb-8">
                <div className="max-w-lg mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.6, duration: 0.5 }}
                    className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl p-5 flex gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow shrink-0">
                      <Sparkles className="text-primary-foreground h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-meta font-bold text-foreground mb-1">Alex — Concierge IA</p>
                      <p className="text-meta text-muted-foreground leading-relaxed">
                        Votre maison a un bon score ! L'isolation du grenier serait l'amélioration la plus rentable. Voulez-vous que je vous aide à trouver un entrepreneur en isolation à {city || "votre ville"} ?
                      </p>
                      <Button variant="soft" size="sm" className="mt-3 rounded-xl text-caption" asChild>
                        <Link to="/search?specialty=isolation">
                          Trouver un entrepreneur <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Passeport Maison CTA */}
              <section className="px-5 pb-16">
                <div className="max-w-lg mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.8, duration: 0.5 }}
                    className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-accent/5 p-6 md:p-8 text-center"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/15">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="font-display text-section text-foreground mb-2">
                      Créer mon Passeport Maison
                    </h2>
                    <p className="text-body text-muted-foreground leading-relaxed max-w-sm mx-auto mb-6">
                      Le Passeport Maison regroupe vos inspections, travaux et documents dans un dossier numérique permanent. C'est la mémoire complète de votre propriété.
                    </p>

                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      {[
                        { icon: FileText, label: "Inspections" },
                        { icon: Shield, label: "Travaux documentés" },
                        { icon: Star, label: "Historique complet" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/20"
                        >
                          <item.icon className="h-3 w-3 text-primary" />
                          <span className="text-caption font-medium text-foreground/80">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      asChild
                      size="lg"
                      className="rounded-2xl h-12 min-w-[240px] text-body font-bold bg-primary text-primary-foreground shadow-glow-lg"
                    >
                      <Link to={signupOrDash}>
                        Créer mon Passeport Maison
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>

                    <p className="text-caption text-muted-foreground mt-3">
                      Gratuit · Sans engagement · Données sécurisées
                    </p>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pre-result: Social proof ── */}
        {!showResult && (
          <section className="px-5 py-12">
            <div className="max-w-lg mx-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center space-y-6"
              >
                <p className="text-caption uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                  Déjà utilisé par des milliers de propriétaires
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "12 400+", label: "Scores calculés" },
                    { value: "74", label: "Score moyen au Québec" },
                    { value: "3 min", label: "Pour comprendre sa maison" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="font-display text-title text-foreground">{stat.value}</p>
                      <p className="text-caption text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* How it helps */}
                <div className="space-y-3 pt-4">
                  <h2 className="font-display text-section text-foreground">Pourquoi calculer votre score ?</h2>
                  <div className="space-y-2.5">
                    {[
                      { icon: Home, text: "Comprenez l'état réel de votre maison" },
                      { icon: TrendingUp, text: "Identifiez les travaux prioritaires" },
                      { icon: Shield, text: "Prenez de meilleures décisions d'entretien" },
                      { icon: Star, text: "Comparez avec votre quartier" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-3 p-3 rounded-2xl border border-border/20 bg-muted/10">
                        <div className="h-8 w-8 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-meta text-foreground/80">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
