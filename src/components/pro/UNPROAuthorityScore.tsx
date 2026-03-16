/**
 * UNPRO Authority Score — Premium Dark SaaS Dashboard
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, Download, ExternalLink, Brain, ArrowRight, Zap } from "lucide-react";

import AuthoritySidebar from "./authority/AuthoritySidebar";
import AuthorityScoreRing from "./authority/AuthorityScoreRing";
import AuthorityRadar from "./authority/AuthorityRadar";
import AuthorityProjection from "./authority/AuthorityProjection";
import AuthorityHistory from "./authority/AuthorityHistory";
import AuthorityAlexAnalysis from "./authority/AuthorityAlexAnalysis";
import { SCORE_CURRENT, factors } from "./authority/data";

const tabs = ["Vue d'ensemble", "Composition du score", "Historique", "Opportunités", "Analyse Alex"] as const;
type Tab = typeof tabs[number];

function FactorBar({ label, value, max, color, index }: {
  label: string; value: number; max: number; color: string; index: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value} / {max}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.08 }}
        />
      </div>
    </div>
  );
}

export default function UNPROAuthorityScore() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Vue d'ensemble");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar */}
        <AuthoritySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 border-b border-border/30 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between h-14 px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">Authority Score</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-muted-foreground/70">Dernière mise à jour : aujourd'hui</span>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border/40 gap-1.5 hidden sm:flex">
                  <Download className="w-3.5 h-3.5" />
                  Exporter
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border/40 gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voir profil public</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="font-display text-xl font-bold text-foreground">UNPRO Authority Score</h1>
                  <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">Actif</span>
                </div>
                <p className="text-sm text-muted-foreground">Votre visibilité et votre crédibilité sur UNPRO</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Mis à jour à partir de votre profil, de vos preuves de confiance et de votre activité.</p>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="authority-tab"
                      className="absolute inset-0 bg-primary/10 rounded-lg"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Hero section */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 lg:p-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                {/* Left */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-2">Vue d'ensemble</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                      Votre score reflète votre expertise, votre activité, votre crédibilité et votre potentiel de recommandation sur UNPRO.
                    </p>
                  </div>
                  {/* Mini stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Score actuel", value: `${SCORE_CURRENT}` },
                      { label: "Niveau", value: "Actif" },
                      { label: "Potentiel", value: "Autorité locale" },
                      { label: "Recommandation Alex", value: "32 %" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-muted/15 border border-border/30 p-3">
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">{s.label}</p>
                        <p className="text-sm font-bold font-display text-foreground">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Factor bars */}
                  <div className="space-y-2.5 pt-1">
                    {factors.map((f, i) => (
                      <FactorBar key={f.key} {...f} index={i} />
                    ))}
                  </div>
                </div>

                {/* Right — Score ring */}
                <div className="flex justify-center lg:pr-4">
                  <AuthorityScoreRing />
                </div>
              </div>
            </motion.div>

            {/* Authority DNA */}
            <AuthorityRadar />

            {/* Projection */}
            <AuthorityProjection />

            {/* History */}
            <AuthorityHistory />

            {/* Alex Analysis */}
            <AuthorityAlexAnalysis />

            {/* Final CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center space-y-3"
            >
              <Zap className="w-8 h-8 text-primary mx-auto" />
              <h2 className="font-display text-lg font-bold text-foreground">
                Passez au niveau supérieur sur UNPRO
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Améliorez votre score, augmentez votre visibilité et renforcez vos chances d'être recommandé aux propriétaires.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                <Button className="gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-sm font-semibold">
                  <Brain className="w-4 h-4" />
                  Analyser mon profil avec Alex
                </Button>
                <Button variant="outline" className="gap-2 h-11 px-6 border-border/50 text-sm hover:border-primary/40">
                  Améliorer mon profil maintenant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
