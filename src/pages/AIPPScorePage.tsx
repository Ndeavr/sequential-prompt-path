/**
 * UNPRO — Public AIPP Score Checker (Viral marketing page)
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, Sparkles, TrendingUp, CheckCircle2,
  AlertCircle, ChevronRight, Shield, Eye, Brain, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScoreRing from "@/components/ui/score-ring";
import BusinessNameSearch, { type BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";

const CATEGORIES = [
  "Toiture", "Isolation", "Électricité", "Plomberie",
  "Drainage", "Fondation", "CVC / Chauffage", "Rénovation générale",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function AIPPScorePage() {
  const [form, setForm] = useState({ name: "", city: "", category: "" });
  const [calculated, setCalculated] = useState(false);

  // Simulation sliders
  const [addProjects, setAddProjects] = useState(0);
  const [addCerts, setAddCerts] = useState(0);

  const baseScore = 72;
  const projectBoost = Math.min(addProjects * 1.8, 12);
  const certBoost = addCerts * 3;
  const simulatedScore = Math.min(100, Math.round(baseScore + projectBoost + certBoost));

  const handleCalculate = () => {
    if (form.name && form.city && form.category) {
      setCalculated(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-5 pt-28 pb-12 md:pt-40 md:pb-20">
          <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="rounded-full px-4 py-1.5 text-xs font-semibold gap-1.5 bg-secondary/10 text-secondary border-secondary/20">
                <Brain className="h-3 w-3" /> Score AIPP — Intelligence artificielle
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="text-[1.75rem] md:text-[3rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-foreground">
              Découvrez votre{" "}
              <span className="text-gradient">Score AIPP</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
              Voyez comment votre entreprise se positionne pour être recommandée par l'intelligence artificielle.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Form / Result */}
      <section className="px-5 pb-14">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {!calculated ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card-elevated rounded-3xl p-6 md:p-8 space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nom de l'entreprise *</Label>
                  <Input placeholder="Ex: Toiture Expert Inc." value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Ville *</Label>
                  <Input placeholder="Montréal" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Catégorie *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]"
                  disabled={!form.name || !form.city || !form.category}
                  onClick={handleCalculate}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Calculer mon Score AIPP
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Score result card */}
                <div className="glass-card-elevated rounded-3xl p-6 md:p-8">
                  <div className="flex flex-col items-center text-center mb-6">
                    <ScoreRing score={simulatedScore} size={120} strokeWidth={10} label="AIPP" />
                    <div className="mt-4">
                      <Badge className={`text-xs ${simulatedScore >= 70 ? "bg-success/15 text-success border-success/20" : simulatedScore >= 45 ? "bg-warning/15 text-warning border-warning/20" : "bg-destructive/15 text-destructive border-destructive/20"}`}>
                        {simulatedScore >= 70 ? "Bon positionnement" : simulatedScore >= 45 ? "Positionnement moyen" : "Positionnement faible"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{form.name} — {form.category} — {form.city}</p>
                  </div>

                  <div className="divider-gradient mb-5" />

                  {/* Strengths / Improvements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Points forts
                      </p>
                      {["Expérience reconnue", "Avis clients positifs"].map((s) => (
                        <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 text-success shrink-0" /> {s}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-warning" /> À améliorer
                      </p>
                      {["Projets documentés", "Certifications manquantes"].map((s) => (
                        <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="h-3 w-3 text-warning shrink-0" /> {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulation sliders */}
                <div className="glass-card-elevated rounded-3xl p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-secondary" />
                    <p className="text-sm font-bold text-foreground">Simulation d'amélioration</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Ajouter des projets documentés</Label>
                        <span className="text-xs font-bold text-foreground">{addProjects}</span>
                      </div>
                      <Slider
                        value={[addProjects]}
                        onValueChange={([v]) => setAddProjects(v)}
                        min={0}
                        max={10}
                        step={1}
                      />
                      {addProjects > 0 && (
                        <p className="text-[10px] text-success">Score : {baseScore} → {Math.min(100, Math.round(baseScore + projectBoost))}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Ajouter des certifications</Label>
                        <span className="text-xs font-bold text-foreground">{addCerts}</span>
                      </div>
                      <Slider
                        value={[addCerts]}
                        onValueChange={([v]) => setAddCerts(v)}
                        min={0}
                        max={4}
                        step={1}
                      />
                      {addCerts > 0 && (
                        <p className="text-[10px] text-success">Score : {Math.min(100, Math.round(baseScore + projectBoost))} → {simulatedScore}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground">
                      <strong className="text-foreground">Les entrepreneurs avec un Score AIPP élevé</strong> sont recommandés plus souvent par Alex et apparaissent en priorité dans les résultats.
                    </p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full h-14 rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground text-base shadow-[0_0_32px_-4px_hsl(252,100%,65%,0.4)]">
                    <Link to="/contractor-onboarding">Améliorer mon Score AIPP <ArrowRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full h-14 rounded-2xl border-border/50">
                    <Link to="/professionals">Rejoindre UNPRO <ChevronRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
