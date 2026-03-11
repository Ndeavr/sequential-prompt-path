import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Handshake, Building2, Landmark, ShieldCheck, BarChart3,
  ArrowRight, Sparkles, ChevronRight, Database, Globe, Lock,
  LineChart, Layers, Puzzle,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const PARTNERS = [
  { icon: ShieldCheck, title: "Assurances", desc: "Accédez à des données structurées sur l'état des propriétés pour mieux évaluer les risques et ajuster vos primes.", color: "text-primary", bg: "bg-primary/10" },
  { icon: Landmark, title: "Banques & Prêteurs", desc: "Validez l'état réel d'une propriété avant d'accorder un prêt hypothécaire ou de rénovation.", color: "text-secondary", bg: "bg-secondary/10" },
  { icon: Building2, title: "Municipalités", desc: "Connectez vos données de permis, règlements et programmes à l'écosystème UNPRO.", color: "text-accent", bg: "bg-accent/10" },
  { icon: Layers, title: "Fournisseurs & Fabricants", desc: "Positionnez vos matériaux et systèmes dans les recommandations de solutions.", color: "text-success", bg: "bg-success/10" },
  { icon: Globe, title: "Immobilier", desc: "Offrez le Property Passport à vos clients pour valoriser chaque transaction.", color: "text-primary", bg: "bg-primary/10" },
  { icon: Puzzle, title: "Intégrateurs tech", desc: "Connectez vos outils via API au Knowledge Graph immobilier d'UNPRO.", color: "text-secondary", bg: "bg-secondary/10" },
];

const DATA_POINTS = [
  { label: "Score Maison", value: "Santé propriété" },
  { label: "Property Passport", value: "Historique complet" },
  { label: "Knowledge Graph", value: "30 000+ cas" },
  { label: "AIPP Score", value: "Profils pro indexés" },
];

const API_FEATURES = [
  { icon: Database, title: "API Data Access", desc: "Accédez aux données structurées des propriétés, scores et historiques." },
  { icon: Lock, title: "Sécurité enterprise", desc: "Authentification OAuth, chiffrement bout-en-bout, conformité PIPEDA." },
  { icon: LineChart, title: "Analytiques", desc: "Tableaux de bord dédiés pour mesurer l'impact de l'intégration." },
];

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[10%] right-[-5%] w-[35vw] h-[35vw] rounded-full bg-accent/12 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[-10%] w-[30vw] h-[30vw] rounded-full bg-primary/10 blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-20 md:pt-40 md:pb-28">
          <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-accent/10 text-accent border-accent/20">
                <Handshake className="h-3 w-3" /> Partenaires & Institutions
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-[2rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
              Intégrez{" "}
              <span className="text-gradient-accent">l'écosystème</span>{" "}
              immobilier intelligent
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Connectez-vous au Knowledge Graph d'UNPRO pour enrichir vos services avec des données structurées sur les propriétés québécoises.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col items-center gap-3 pt-2">
              <Button asChild size="lg" className="w-full max-w-[280px] h-14 text-base rounded-2xl bg-gradient-to-r from-accent to-primary text-primary-foreground shadow-[0_0_32px_-4px_hsl(195,100%,50%,0.35)]">
                <Link to="/signup">Devenir partenaire <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Données disponibles ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-6">
            <p className="text-xs font-semibold text-accent tracking-widest uppercase mb-1">Données structurées</p>
            <h2 className="text-xl font-bold text-foreground">Le Knowledge Graph UNPRO</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 gap-3">
            {DATA_POINTS.map((d, i) => (
              <motion.div key={d.label} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-foreground">{d.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{d.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Types de partenaires ── */}
      <section className="px-5 py-10">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-accent tracking-widest uppercase mb-1">Écosystème</p>
            <h2 className="text-xl font-bold text-foreground">Qui peut devenir partenaire ?</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {PARTNERS.map((p, i) => (
              <motion.div key={p.title} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-11 w-11 shrink-0 rounded-xl ${p.bg} flex items-center justify-center`}>
                      <p.icon className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{p.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── API & Intégration ── */}
      <section className="px-5 py-10 relative">
        <div className="absolute inset-0 section-gradient" />
        <div className="relative z-10 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <p className="text-xs font-semibold text-accent tracking-widest uppercase mb-1">Technique</p>
            <h2 className="text-xl font-bold text-foreground">Intégration & API</h2>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-3">
            {API_FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i}>
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-accent/10 flex items-center justify-center">
                      <f.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-5 py-14">
        <div className="max-w-lg mx-auto text-center space-y-5">
          <Sparkles className="h-8 w-8 text-accent mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Rejoignez l'écosystème UNPRO</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Contactez notre équipe pour discuter des possibilités d'intégration et de partenariat.
          </p>
          <Button asChild size="lg" className="rounded-2xl h-14 min-w-[260px] text-base bg-gradient-to-r from-accent to-primary text-primary-foreground shadow-[0_0_32px_-4px_hsl(195,100%,50%,0.35)]">
            <Link to="/signup">Contacter l'équipe <ChevronRight className="h-5 w-5 ml-1" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
