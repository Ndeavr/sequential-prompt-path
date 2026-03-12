import { useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Building2, AlertTriangle, Shield, ChevronRight, Clock,
  TrendingDown, Users, FileText, Wrench, PiggyBank,
  CheckCircle2, ArrowRight, BarChart3, Zap, Calculator,
  Star, BadgeCheck, ChevronDown
} from "lucide-react";

/* ─── Animations ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

/* ─── Data ─── */
const problems = [
  { icon: AlertTriangle, text: "Cotisations spéciales imprévues", color: "text-destructive" },
  { icon: Wrench, text: "Travaux urgents non planifiés", color: "text-warning" },
  { icon: PiggyBank, text: "Fonds de prévoyance insuffisant", color: "text-destructive" },
  { icon: Users, text: "Conflits entre copropriétaires", color: "text-muted-foreground" },
];

const timeline = [
  { year: "2027", label: "Inspection toiture", cost: "3 500 $", urgency: "medium" },
  { year: "2029", label: "Remplacement membrane", cost: "190 000 $", urgency: "high" },
  { year: "2033", label: "Remplacement fenêtres", cost: "120 000 $", urgency: "medium" },
  { year: "2037", label: "Maçonnerie façade", cost: "85 000 $", urgency: "low" },
];

const dashboardFeatures = [
  { icon: BarChart3, label: "Score santé immeuble" },
  { icon: PiggyBank, label: "Fonds de prévoyance" },
  { icon: Wrench, label: "Projets planifiés" },
  { icon: FileText, label: "Documents" },
  { icon: Users, label: "Votes assemblée" },
  { icon: Shield, label: "Entrepreneurs vérifiés" },
];

/* ─── Page ─── */
const CoproprietePage = () => {
  const [buildYear, setBuildYear] = useState([1995]);
  const [units, setUnits] = useState([24]);
  const [reserveFund, setReserveFund] = useState([82000]);
  const [showScore, setShowScore] = useState(false);

  // Simulated score
  const simScore = Math.max(30, Math.min(92,
    100 - Math.round((2026 - buildYear[0]) * 0.6) - Math.round(units[0] * 0.3) + Math.round(reserveFund[0] / 5000)
  ));
  const structureScore = Math.min(100, simScore + 10);
  const roofScore = Math.max(20, simScore - 6);
  const windowScore = Math.max(20, simScore - 12);
  const financeScore = Math.min(100, Math.round(reserveFund[0] / 2000));

  // Cost simulation
  const totalCost = 210000;
  const costPerUnit = Math.round(totalCost / units[0]);
  const plannedCost = Math.round(totalCost * 0.78);
  const plannedPerUnit = Math.round(plannedCost / units[0]);

  return (
    <MainLayout>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Decorative */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-secondary/6 blur-3xl" />
        </div>

        <div className="container relative mx-auto max-w-5xl px-4">
          <motion.div initial="hidden" animate="show" variants={stagger} className="text-center">
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
                <Building2 className="mr-1.5 h-3.5 w-3.5" /> Copropriétés
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp} custom={1}
              className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Votre copropriété est-elle à risque de{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                cotisation spéciale
              </span> ?
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Analysez la santé de votre immeuble en 60 secondes. Anticipez les travaux, protégez votre investissement.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base" onClick={() => {
                document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <Zap className="h-4 w-4" /> Analyser notre immeuble
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}>
                Voir comment ça fonctionne <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Floating score card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mx-auto mt-12 max-w-xs"
          >
            <Card className="border-primary/20 bg-card/80 backdrop-blur-lg shadow-[var(--shadow-glow)]">
              <CardContent className="p-5 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score santé immeuble</p>
                <p className="mt-2 text-5xl font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>74<span className="text-lg text-muted-foreground">/100</span></p>
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: "Structure", value: 84, color: "bg-success" },
                    { label: "Toiture", value: 68, color: "bg-warning" },
                    { label: "Fenêtres", value: 62, color: "bg-warning" },
                    { label: "Finances", value: 58, color: "bg-destructive" },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-2 text-xs">
                      <span className="w-16 text-right text-muted-foreground">{b.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${b.value}%` }}
                          transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${b.color}`}
                        />
                      </div>
                      <span className="w-6 text-muted-foreground">{b.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══ PROBLEM AWARENESS ═══ */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              7 copropriétés sur 10 sous-estiment leurs travaux futurs
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground">
              Les conséquences peuvent coûter des dizaines de milliers de dollars par propriétaire.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="mt-10 grid gap-4 sm:grid-cols-2"
          >
            {problems.map((p, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <Card className="border-destructive/10 hover:border-destructive/20 transition-colors">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 rounded-lg bg-destructive/10 p-2">
                      <p.icon className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{p.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ QUICK ANALYSIS TOOL ═══ */}
      <section id="analysis" className="py-16 sm:py-24">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Analysez votre copropriété en 60 secondes
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-2 text-muted-foreground text-sm">
              Ajustez les paramètres pour obtenir une estimation de la santé de votre immeuble.
            </motion.p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="border-primary/10 shadow-[var(--shadow-lg)]">
              <CardContent className="p-6 space-y-6">
                {/* Build year */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Année de construction</span>
                    <span className="font-semibold">{buildYear[0]}</span>
                  </div>
                  <Slider value={buildYear} onValueChange={setBuildYear} min={1960} max={2024} step={1} />
                </div>
                {/* Units */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Nombre d'unités</span>
                    <span className="font-semibold">{units[0]}</span>
                  </div>
                  <Slider value={units} onValueChange={setUnits} min={4} max={200} step={1} />
                </div>
                {/* Reserve fund */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Fonds de prévoyance</span>
                    <span className="font-semibold">{reserveFund[0].toLocaleString("fr-CA")} $</span>
                  </div>
                  <Slider value={reserveFund} onValueChange={setReserveFund} min={5000} max={500000} step={5000} />
                </div>

                <Button className="w-full gap-2" size="lg" onClick={() => setShowScore(true)}>
                  <Calculator className="h-4 w-4" /> Calculer le score copropriété
                </Button>

                {showScore && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-border pt-5 space-y-3"
                  >
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Score santé immeuble</p>
                      <p className="text-4xl font-bold text-primary mt-1" style={{ fontFamily: "var(--font-display)" }}>
                        {simScore}<span className="text-lg text-muted-foreground">/100</span>
                      </p>
                    </div>
                    {[
                      { label: "Structure", value: structureScore },
                      { label: "Toiture", value: roofScore },
                      { label: "Fenêtres", value: windowScore },
                      { label: "Finances", value: financeScore },
                    ].map((b) => (
                      <div key={b.label} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-right text-muted-foreground">{b.label}</span>
                        <Progress value={b.value} className="flex-1 h-2" />
                        <span className="w-6 font-medium">{b.value}</span>
                      </div>
                    ))}
                    <div className="pt-2 text-center">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/signup">Créer mon passeport immeuble <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══ COST SIMULATION ═══ */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Combien pourrait coûter la prochaine cotisation spéciale ?
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid gap-4 sm:grid-cols-2"
          >
            {/* Without planning */}
            <motion.div variants={fadeUp} custom={0}>
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-5 text-center space-y-2">
                  <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
                  <p className="text-xs font-medium uppercase tracking-wider text-destructive">Sans planification</p>
                  <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    {totalCost.toLocaleString("fr-CA")} $
                  </p>
                  <p className="text-sm text-muted-foreground">{units[0]} unités</p>
                  <p className="text-lg font-semibold text-destructive">{costPerUnit.toLocaleString("fr-CA")} $ / condo</p>
                </CardContent>
              </Card>
            </motion.div>
            {/* With planning */}
            <motion.div variants={fadeUp} custom={1}>
              <Card className="border-success/20 bg-success/5">
                <CardContent className="p-5 text-center space-y-2">
                  <TrendingDown className="mx-auto h-8 w-8 text-success" />
                  <p className="text-xs font-medium uppercase tracking-wider text-success">Avec planification</p>
                  <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    {plannedCost.toLocaleString("fr-CA")} $
                  </p>
                  <p className="text-sm text-muted-foreground">{units[0]} unités</p>
                  <p className="text-lg font-semibold text-success">{plannedPerUnit.toLocaleString("fr-CA")} $ / condo</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="mt-6 text-center"
          >
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-success" />
              Économie potentielle : {(totalCost - plannedCost).toLocaleString("fr-CA")} $
            </Badge>
          </motion.div>
        </div>
      </section>

      {/* ═══ PASSEPORT IMMEUBLE ═══ */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Passeport Immeuble Intelligent
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Un jumeau numérique de votre bâtiment : composants, historique d'entretien, fonds de prévoyance, projections futures et score de santé.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="grid gap-3 grid-cols-2 sm:grid-cols-3"
          >
            {dashboardFeatures.map((f, i) => (
              <motion.div key={f.label} variants={fadeUp} custom={i}>
                <Card className="hover:shadow-[var(--shadow-md)] transition-shadow h-full">
                  <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                    <div className="rounded-xl bg-primary/10 p-2.5">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">{f.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-10">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Projection des travaux
            </motion.h2>
          </motion.div>

          <div className="relative ml-4 border-l-2 border-primary/20 space-y-6">
            {timeline.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
                className="relative pl-6"
              >
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                <Card>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs font-medium text-primary">{t.year}</p>
                      <p className="text-sm font-semibold">{t.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{t.cost}</p>
                      <Badge variant={t.urgency === "high" ? "destructive" : t.urgency === "medium" ? "secondary" : "outline"} className="text-[10px]">
                        {t.urgency === "high" ? "Haute" : t.urgency === "medium" ? "Moyenne" : "Basse"} priorité
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VERIFIED CONTRACTORS ═══ */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Entrepreneurs vérifiés pour copropriétés
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground">
              Licences validées, avis analysés, score AIPP, spécialisés en travaux de copropriété.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mt-8 grid gap-4 sm:grid-cols-3"
          >
            {[
              { name: "Toitures Montréal Inc.", trade: "Couvreur", score: 87, reviews: 142 },
              { name: "Fenêtres Prestige", trade: "Fenestration", score: 82, reviews: 98 },
              { name: "Maçonnerie Québec", trade: "Maçon", score: 79, reviews: 67 },
            ].map((c, i) => (
              <motion.div key={c.name} variants={fadeUp} custom={i}>
                <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
                  <CardContent className="p-4 text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-success" />
                      <span className="text-xs font-medium text-success">Vérifié</span>
                    </div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.trade}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-warning fill-warning" /> {c.reviews} avis
                      </span>
                      <Badge variant="secondary" className="text-[10px]">AIPP {c.score}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CASE STUDY ═══ */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto max-w-2xl px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Étude de cas réelle
            </motion.h2>
            <motion.div variants={fadeUp} custom={1} className="mt-6">
              <Card className="text-left">
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground">Copropriété 20 unités • Montréal • Construite en 1992</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-destructive/10 p-4 text-center">
                      <p className="text-xs text-destructive font-medium">Sans planification</p>
                      <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>195 000 $</p>
                      <p className="text-xs text-muted-foreground">Urgence toiture</p>
                    </div>
                    <div className="rounded-lg bg-success/10 p-4 text-center">
                      <p className="text-xs text-success font-medium">Avec UNPRO</p>
                      <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>142 000 $</p>
                      <p className="text-xs text-muted-foreground">Planifié sur 3 ans</p>
                    </div>
                  </div>
                  <div className="text-center pt-2">
                    <Badge className="bg-success/10 text-success border-success/20 px-4 py-1.5">
                      <TrendingDown className="h-3.5 w-3.5 mr-1.5" /> Économie : 53 000 $
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto max-w-xl px-4 text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Analysez votre copropriété maintenant
            </motion.h2>
            <motion.div variants={fadeUp} custom={1} className="mt-6">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base" asChild>
                <Link to="/signup"><Zap className="h-4 w-4" /> Analyser notre immeuble</Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Gratuit</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Sans engagement</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Résultat immédiat</span>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
};

export default CoproprietePage;
