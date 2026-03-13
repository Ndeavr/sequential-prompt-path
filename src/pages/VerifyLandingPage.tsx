import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerificationTimeline } from "@/components/verification";
import {
  Shield, Search, FileText, Building2, Fingerprint, ShieldAlert,
  Eye, Camera, ArrowRight, CheckCircle2,
  ClipboardCheck, MessageSquare, Phone,
  Lock, FileCheck, Wrench, DollarSign,
  ShieldCheck, Sparkles, Upload, Globe, Hash, MapPin,
} from "lucide-react";

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
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
  { num: "01", title: "Entrez un nom ou un numéro", desc: "Téléphone, nom d'entreprise, licence RBQ, NEQ ou site web." },
  { num: "02", title: "UNPRO reconstruit l'identité commerciale probable", desc: "Recoupement automatique de multiples sources publiques." },
  { num: "03", title: "Les validations officielles sont croisées", desc: "RBQ, Registraire des entreprises, profils en ligne." },
  { num: "04", title: "Les preuves visuelles sont analysées", desc: "Contrat, camion, carte d'affaires — OCR et intelligence artificielle." },
  { num: "05", title: "Un verdict clair apparaît", desc: "Score de confiance, compatibilité de licence et recommandation." },
];


import { VERDICT_STYLES } from "@/components/verification";

const VERDICTS_OVERVIEW = Object.entries(VERDICT_STYLES).map(([, cfg]) => ({
  verdict: cfg.label,
  icon: cfg.icon,
  color: cfg.color,
  bg: `${cfg.bg} ${cfg.border}`,
}));

const CHECKLIST = [
  { icon: FileCheck, label: "Contrat écrit détaillé" },
  { icon: ShieldCheck, label: "Preuve d'assurance responsabilité" },
  { icon: Wrench, label: "Portée des travaux spécifiée" },
  { icon: DollarSign, label: "Modalités de paiement claires" },
  { icon: Lock, label: "Garantie sur les travaux" },
  { icon: Building2, label: "Identité claire de l'entreprise" },
];

/* ─── Reusable sub-components ─── */

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
      {eyebrow && <Badge variant="outline" className="mb-3 text-xs font-medium tracking-wide uppercase border-primary/20 text-primary">{eyebrow}</Badge>}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display text-foreground mb-3">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{subtitle}</p>}
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

function LiveDemoPanel() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="max-w-lg mx-auto">
      {inView && <VerificationTimeline autoplay stepDelay={1000} />}
    </div>
  );
}

function ExampleResultCard() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const data = {
    name: "Toitures Québec Pro Inc.",
    phone: "(418) 555-0199",
    service: "Couverture — Toiture résidentielle",
    city: "Québec",
    rbq: "5789-1234-01",
    neq: "1173456789",
    coherence: "Cohérence détectée",
    verdict: "Succès" as const,
  };

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
      <GlassCard className="p-6 md:p-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Résultat — Exemple</p>
            <h3 className="text-base font-bold font-display text-foreground">{data.name}</h3>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-3 mb-5">
          {[
            { icon: Phone, label: "Téléphone", value: data.phone },
            { icon: Wrench, label: "Service probable", value: data.service },
            { icon: MapPin, label: "Ville", value: data.city },
            { icon: FileText, label: "RBQ", value: data.rbq, status: "success" as const },
            { icon: Hash, label: "NEQ", value: data.neq, status: "success" as const },
            { icon: Fingerprint, label: "Cohérence", value: data.coherence, status: "success" as const },
          ].map((row) => {
            const RIcon = row.icon;
            return (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <RIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-28 shrink-0">{row.label}</span>
                <span className="font-medium text-foreground flex-1">{row.value}</span>
                {row.status === "success" && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Verdict */}
        <div className="rounded-xl bg-success/5 border border-success/20 p-4 flex items-center gap-3 mb-5">
          <ShieldCheck className="w-6 h-6 text-success shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Verdict UNPRO</p>
            <p className="text-sm font-bold text-success">{data.verdict}</p>
          </div>
        </div>

        <Button className="w-full gap-2 h-11 font-semibold" variant="outline" onClick={() => {}}>
          <ClipboardCheck className="w-4 h-4" />
          Analyser une soumission de cet entrepreneur
        </Button>
      </GlassCard>
    </motion.div>
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
                Licence RBQ, NEQ, identité commerciale, cohérence visuelle et analyse UNPRO.
              </motion.p>

              {/* Search */}
              <motion.div variants={fadeUp} custom={3} className="max-w-lg mx-auto">
                <GlassCard className="p-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={heroInput}
                        onChange={(e) => setHeroInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        placeholder="Nom, téléphone, RBQ, NEQ ou site web"
                        className="pl-10 h-12 border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                    <Button onClick={handleVerify} size="lg" className="h-12 px-5 md:px-6 gap-2 font-semibold shrink-0">
                      Vérifier <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>

                {/* Secondary CTAs */}
                <motion.div variants={fadeUp} custom={4} className="flex flex-wrap justify-center gap-3 mt-5">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-full" onClick={() => navigate("/verify")}>
                    <Upload className="w-3.5 h-3.5" /> Téléverser une photo
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1.5 rounded-full" onClick={() => navigate("/compare-quotes")}>
                    <Globe className="w-3.5 h-3.5" /> Comparer des entrepreneurs
                  </Button>
                </motion.div>

                <motion.p variants={fadeUp} custom={5} className="text-xs text-muted-foreground/70 mt-5 max-w-md mx-auto leading-relaxed">
                  UNPRO recoupe les informations visibles, les registres et les signaux de cohérence pour vous aider avant de signer.
                </motion.p>
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
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
              className="max-w-2xl mx-auto space-y-0"
            >
              {STEPS.map((step, i) => (
                <motion.div key={step.num} variants={fadeUp} custom={i} className="relative flex gap-5 pb-8 last:pb-0">
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
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════ LIVE DEMO ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="En action"
              title="Vérification en temps réel"
              subtitle="Observez le moteur UNPRO valider chaque composante, une par une."
            />
            <LiveDemoPanel />
          </div>
        </section>

        {/* ═══════ EXAMPLE RESULT ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Exemple"
              title="Un résultat clair et actionnable"
              subtitle="Voici à quoi ressemble un rapport de vérification UNPRO, selon les informations disponibles."
            />
            <ExampleResultCard />
          </div>
        </section>

        {/* ═══════ VERDICTS OVERVIEW ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Verdicts"
              title="Quatre niveaux de confiance"
              subtitle="Chaque vérification se termine par un verdict UNPRO."
            />
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto"
            >
              {VERDICTS_OVERVIEW.map((v, i) => {
                const VIcon = v.icon;
                return (
                  <motion.div key={v.verdict} variants={fadeUp} custom={i}>
                    <GlassCard className={`p-5 text-center border ${v.bg}`}>
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${v.bg}`}>
                        <VIcon className={`w-6 h-6 ${v.color}`} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Verdict</p>
                      <p className={`text-sm font-bold font-display ${v.color}`}>{v.verdict}</p>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ═══════ CHECKLIST ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <SectionHeading
              eyebrow="Aide-mémoire"
              title="Avant de signer"
              subtitle="Les 6 éléments essentiels à vérifier avant d'engager un entrepreneur."
            />
            <div className="max-w-md mx-auto">
              <GlassCard className="p-6">
                <div className="space-y-4">
                  {CHECKLIST.map((item, i) => {
                    const CIcon = item.icon;
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
                          <CIcon className="w-4 h-4 text-success" />
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
                Avant de signer, vérifiez ce que le prix ne dit pas
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm md:text-base mb-8 max-w-md mx-auto">
                Analysez, comparez et obtenez des réponses personnalisées — gratuitement.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="gap-2 font-semibold h-12 px-6" onClick={handleVerify}>
                  <ShieldCheck className="w-4 h-4" /> Vérifier un entrepreneur
                </Button>
                <Button size="lg" variant="outline" className="gap-2 font-semibold h-12 px-6" onClick={() => navigate("/dashboard/quotes/upload")}>
                  <ClipboardCheck className="w-4 h-4" /> Analyser ma soumission
                </Button>
                <Button size="lg" variant="ghost" className="gap-2 font-semibold h-12 px-6 text-primary" onClick={() => navigate("/alex")}>
                  <MessageSquare className="w-4 h-4" /> Parler à Alex
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
