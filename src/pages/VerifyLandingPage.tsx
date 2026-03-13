import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, FileText, Building2, Fingerprint, ShieldAlert,
  Eye, Camera, ArrowRight, CheckCircle2, AlertTriangle, XCircle,
  Ban, Loader2, ClipboardCheck, MessageSquare, Users, Phone,
  Truck, CreditCard, Lock, FileCheck, Wrench, DollarSign,
  ShieldCheck, Sparkles,
} from "lucide-react";

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Data ─── */
const VERIFY_CARDS = [
  { icon: FileText, title: "Licence RBQ", desc: "Vérification du statut, des sous-catégories et de la validité de la licence auprès de la Régie du bâtiment." },
  { icon: Building2, title: "Entreprise / NEQ", desc: "Validation de l'existence légale de l'entreprise au Registraire des entreprises du Québec." },
  { icon: Fingerprint, title: "Cohérence identité", desc: "Recoupement entre le nom, le téléphone, le site web et les profils publics de l'entrepreneur." },
  { icon: ShieldAlert, title: "Signaux de prudence", desc: "Détection de signaux d'alerte : noms multiples, licences manquantes, incohérences." },
  { icon: Eye, title: "Portée de licence", desc: "Traduction des sous-catégories RBQ en types de travaux concrets pour votre projet." },
  { icon: Camera, title: "Validation UNPRO", desc: "Analyse visuelle de contrats, camions et cartes d'affaires par reconnaissance optique." },
];

const STEPS = [
  { num: "01", title: "Entrer un numéro ou un nom", desc: "Téléphone, nom d'entreprise, licence RBQ ou NEQ." },
  { num: "02", title: "UNPRO reconstruit l'identité", desc: "Recoupement automatique de multiples sources publiques." },
  { num: "03", title: "Les registres sont vérifiés", desc: "RBQ, Registraire des entreprises, profils en ligne." },
  { num: "04", title: "Les preuves visuelles sont analysées", desc: "Contrat, camion, carte d'affaires — OCR et IA." },
  { num: "05", title: "UNPRO donne un verdict", desc: "Score de confiance, compatibilité et recommandation." },
];

const VERDICTS = [
  { verdict: "Très rassurant", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", ring: "ring-emerald-500/30" },
  { verdict: "Prudence", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", ring: "ring-amber-500/30" },
  { verdict: "Non recommandé", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", ring: "ring-red-500/30" },
  { verdict: "Se tenir loin", icon: Ban, color: "text-red-700 dark:text-red-400", bg: "bg-red-600/10 border-red-600/20", ring: "ring-red-600/30" },
];

const CHECKLIST = [
  { icon: FileCheck, label: "Contrat écrit détaillé" },
  { icon: ShieldCheck, label: "Preuve d'assurance responsabilité" },
  { icon: Wrench, label: "Portée des travaux spécifiée" },
  { icon: DollarSign, label: "Modalités de paiement claires" },
  { icon: Lock, label: "Garantie sur les travaux" },
];

const DEMO_STEPS = [
  { label: "Validation RBQ", icon: FileText },
  { label: "Validation NEQ", icon: Building2 },
  { label: "Analyse téléphone", icon: Phone },
  { label: "Analyse contrat", icon: ClipboardCheck },
  { label: "Analyse camion", icon: Truck },
  { label: "Analyse carte d'affaires", icon: CreditCard },
];

/* ─── Components ─── */

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
      {eyebrow && <Badge variant="outline" className="mb-3 text-xs font-medium tracking-wide uppercase border-primary/20 text-primary">{eyebrow}</Badge>}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display text-foreground mb-3">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>}
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

function DemoAnimation() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = useState(-1);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    if (!inView) return;
    let step = 0;
    const interval = setInterval(() => {
      if (step >= DEMO_STEPS.length) {
        clearInterval(interval);
        return;
      }
      setActiveStep(step);
      setTimeout(() => {
        setCompleted((prev) => [...prev, step]);
      }, 900);
      step++;
    }, 1400);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <div ref={ref} className="space-y-3 max-w-md mx-auto">
      {DEMO_STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = activeStep === i;
        const isDone = completed.includes(i);
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-500 ${
              isDone
                ? "border-emerald-500/30 bg-emerald-500/5"
                : isActive
                ? "border-primary/40 bg-primary/5"
                : "border-border/40 bg-card/60"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
              isDone ? "bg-emerald-500/15" : "bg-muted/50"
            }`}>
              <Icon className={`w-4.5 h-4.5 ${isDone ? "text-emerald-500" : "text-muted-foreground"}`} />
            </div>
            <span className="text-sm font-medium text-foreground flex-1">{s.label}</span>
            <AnimatePresence mode="wait">
              {isActive && !isDone && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </motion.div>
              )}
              {isDone && (
                <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function VerifyLandingPage() {
  const navigate = useNavigate();
  const [heroInput, setHeroInput] = useState("");

  const handleVerify = () => {
    navigate(`/verify${heroInput.trim() ? `?q=${encodeURIComponent(heroInput.trim())}` : ""}`);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background overflow-x-hidden">

        {/* ═══════ HERO ═══════ */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-secondary/6 via-transparent to-transparent" />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="text-center">
              <motion.div variants={fadeUp} custom={0} className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase">
                  <Shield className="w-4 h-4" />
                  Moteur de vérification UNPRO
                </div>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-foreground leading-[1.1] mb-5">
                Vérifiez un entrepreneur{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  en 30 secondes
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-8">
                Licence RBQ, NEQ, identité commerciale et analyse UNPRO.
                Avant de signer, vérifiez.
              </motion.p>

              {/* Search input */}
              <motion.div variants={fadeUp} custom={3} className="max-w-lg mx-auto">
                <GlassCard className="p-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                      <Input
                        value={heroInput}
                        onChange={(e) => setHeroInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        placeholder="Nom, téléphone, RBQ ou NEQ"
                        className="pl-10 h-12 border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button onClick={handleVerify} size="lg" className="h-12 px-5 md:px-6 gap-2 font-semibold shrink-0">
                      Vérifier <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>

                <motion.div variants={fadeUp} custom={4} className="flex flex-wrap justify-center gap-3 mt-5">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1.5" onClick={() => navigate("/compare-quotes")}>
                    <Users className="w-3.5 h-3.5" /> Comparer avec d'autres entrepreneurs
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ WHAT WE VERIFY ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Analyse complète"
              title="Ce que nous vérifions"
              subtitle="Six couches de validation croisée pour protéger votre investissement."
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto"
            >
              {VERIFY_CARDS.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div key={card.title} variants={fadeUp} custom={i}>
                    <GlassCard className="p-6 h-full group hover:-translate-y-1 transition-transform duration-300">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold font-display text-foreground mb-2">{card.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Processus"
              title="Comment ça fonctionne"
              subtitle="Un processus automatisé en 5 étapes, complété en moins d'une minute."
            />

            <div className="max-w-2xl mx-auto space-y-0">
              {STEPS.map((step, i) => {
                const ref = useRef(null);
                const inView = useInView(ref, { once: true, margin: "-40px" });
                return (
                  <motion.div
                    key={step.num}
                    ref={ref}
                    initial={{ opacity: 0, x: -20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="relative flex gap-5 pb-8 last:pb-0"
                  >
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute left-[22px] top-12 bottom-0 w-px bg-gradient-to-b from-primary/20 to-transparent" />
                    )}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold font-display text-primary">{step.num}</span>
                    </div>
                    <div className="pt-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════ DEMO ANIMATION ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="En action"
              title="Exemple de vérification"
              subtitle="Observez le moteur UNPRO valider chaque composante en temps réel."
            />
            <DemoAnimation />
          </div>
        </section>

        {/* ═══════ VERDICTS ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Verdicts"
              title="Résultat clair et actionnable"
              subtitle="Chaque vérification se termine par un verdict UNPRO, selon les informations disponibles."
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              {VERDICTS.map((v, i) => {
                const Icon = v.icon;
                return (
                  <motion.div key={v.verdict} variants={fadeUp} custom={i}>
                    <GlassCard className={`p-5 text-center border ${v.bg} ring-1 ${v.ring}`}>
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${v.bg}`}>
                        <Icon className={`w-6 h-6 ${v.color}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Verdict UNPRO</p>
                      <p className={`text-sm font-bold font-display ${v.color}`}>{v.verdict}</p>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ═══════ CHECKLIST ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Aide-mémoire"
              title="Avant de signer"
              subtitle="Les 5 éléments essentiels à vérifier avant d'engager un entrepreneur."
            />

            <div className="max-w-md mx-auto">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  {CHECKLIST.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                          <Icon className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <CheckCircle2 className="w-4 h-4 text-success/40 ml-auto" />
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-primary/5" />
          <div className="container mx-auto px-4 relative z-10 max-w-2xl text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <motion.div variants={fadeUp} custom={0}>
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-2xl md:text-3xl lg:text-4xl font-bold font-display text-foreground mb-4">
                Vous avez une soumission?
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm md:text-base mb-8 max-w-md mx-auto">
                Analysez-la, comparez les entrepreneurs et obtenez des réponses personnalisées.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="gap-2 font-semibold h-12 px-6" onClick={() => navigate("/dashboard/quotes/upload")}>
                  <ClipboardCheck className="w-4.5 h-4.5" /> Analyser ma soumission
                </Button>
                <Button size="lg" variant="outline" className="gap-2 font-semibold h-12 px-6" onClick={() => navigate("/compare-quotes")}>
                  <Users className="w-4.5 h-4.5" /> Comparer 3 entrepreneurs
                </Button>
                <Button size="lg" variant="ghost" className="gap-2 font-semibold h-12 px-6 text-primary" onClick={() => navigate("/alex")}>
                  <MessageSquare className="w-4.5 h-4.5" /> Parler à Alex
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
