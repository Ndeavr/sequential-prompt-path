/**
 * UNPRO Authority Score V2 — Premium Dark SaaS Dashboard
 * Now powered by real 8-dimension performance scoring.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, Download, ExternalLink, Brain, ArrowRight, Zap, Shield } from "lucide-react";

import AuthoritySidebar from "./authority/AuthoritySidebar";
import AuthorityScoreRing from "./authority/AuthorityScoreRing";
import AuthorityRadar from "./authority/AuthorityRadar";
import AuthorityProjection from "./authority/AuthorityProjection";
import AuthorityHistory from "./authority/AuthorityHistory";
import AuthorityAlexAnalysis from "./authority/AuthorityAlexAnalysis";
import AuthorityAdminBreakdown from "./authority/AuthorityAdminBreakdown";
import { useAuthorityScoreV2 } from "@/hooks/useAuthorityScoreV2";
import { dimensionsToFactors } from "./authority/data";
import { DIMENSION_META } from "@/services/authorityScoreV2";
import type { AuthorityDimensions } from "@/services/authorityScoreV2";

const tabs = ["Vue d'ensemble", "Composition", "Historique", "Opportunités", "Analyse Alex", "Admin"] as const;
type Tab = typeof tabs[number];

function FactorBar({ label, value, weight, color, index }: {
  label: string; value: number; weight: number; color: string; index: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/60 text-[10px]">{weight}%</span>
          <span className="text-foreground tabular-nums font-semibold">{value}/100</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.08 }}
        />
      </div>
    </div>
  );
}

export default function UNPROAuthorityScore() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Vue d'ensemble");

  // TODO: pass real contractorId from auth context
  const { score, events, isLoading } = useAuthorityScoreV2(undefined);

  // Use computed default if no DB score
  const scoreData = score ?? {
    overall: 0,
    dimensions: {
      completionPerformance: 0, reviewQuality: 0, matchingPrecision: 0,
      learningReliability: 0, executionModel: 0, subcontractNetwork: 0,
      responsiveness: 0, stability: 0,
    },
    confidence: 0,
    tier: "bronze",
    tags: [],
  };

  const factors = dimensionsToFactors(scoreData.dimensions);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex">
        <AuthoritySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-border/30 bg-background/80 backdrop-blur-xl">
            <div className="flex items-center justify-between h-14 px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Dashboard</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">Authority Score V2</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-muted-foreground/70">Signaux réels uniquement</span>
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

          <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="font-display text-xl font-bold text-foreground">UNPRO Authority Score V2</h1>
                  <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">Performance réelle</span>
                </div>
                <p className="text-sm text-muted-foreground">Score basé sur des signaux réels — jamais artificiel ni gonflé</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">8 dimensions : complétion, avis, matching, apprentissage, exécution, réseau, réactivité, stabilité</p>
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
                      layoutId="authority-tab-v2"
                      className="absolute inset-0 bg-primary/10 rounded-lg"
                      transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {(activeTab === "Vue d'ensemble" || activeTab === "Composition") && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 lg:p-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-2">
                        {activeTab === "Composition" ? "Composition détaillée" : "Vue d'ensemble"}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                        Votre score reflète votre performance réelle sur UNPRO — complétion de projets, qualité des avis, précision du matching et fiabilité opérationnelle.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Score global", value: `${scoreData.overall}` },
                        { label: "Niveau", value: scoreData.tier === "elite" ? "Élite" : scoreData.tier === "authority" ? "Autorité" : scoreData.tier.charAt(0).toUpperCase() + scoreData.tier.slice(1) },
                        { label: "Confiance", value: `${Math.round(scoreData.confidence * 100)}%` },
                        { label: "Tags", value: `${scoreData.tags.length}` },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-muted/15 border border-border/30 p-3">
                          <p className="text-[10px] text-muted-foreground/70 mb-0.5">{s.label}</p>
                          <p className="text-sm font-bold font-display text-foreground">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2.5 pt-1">
                      {factors.map((f, i) => (
                        <FactorBar key={f.key} label={f.label} value={f.value} weight={f.weight} color={f.color} index={i} />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center lg:pr-4">
                    <AuthorityScoreRing
                      overall={scoreData.overall}
                      dimensions={scoreData.dimensions}
                      tier={scoreData.tier}
                      confidence={scoreData.confidence}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === "Vue d'ensemble" || activeTab === "Composition") && (
              <AuthorityRadar
                dimensions={scoreData.dimensions}
                overall={scoreData.overall}
                tier={scoreData.tier}
                confidence={scoreData.confidence}
                tags={scoreData.tags}
              />
            )}

            {(activeTab === "Vue d'ensemble" || activeTab === "Opportunités") && (
              <AuthorityProjection currentScore={scoreData.overall} />
            )}

            {(activeTab === "Vue d'ensemble" || activeTab === "Historique") && (
              <AuthorityHistory />
            )}

            {(activeTab === "Vue d'ensemble" || activeTab === "Analyse Alex") && (
              <AuthorityAlexAnalysis />
            )}

            {activeTab === "Admin" && (
              <AuthorityAdminBreakdown score={scoreData} events={events} />
            )}

            {/* Final CTA */}
            {activeTab === "Vue d'ensemble" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center space-y-3"
              >
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Votre score reflète la réalité
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Chaque point est mérité. Complétez des projets, obtenez des avis vérifiés et soyez réactif pour progresser.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <Button className="gap-2 h-11 px-6 bg-primary hover:bg-primary/90 text-sm font-semibold">
                    <Brain className="w-4 h-4" />
                    Analyser mon profil avec Alex
                  </Button>
                  <Button variant="outline" className="gap-2 h-11 px-6 border-border/50 text-sm hover:border-primary/40">
                    Améliorer mon score
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
