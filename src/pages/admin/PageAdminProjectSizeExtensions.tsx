import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Lock, TrendingUp, DollarSign, Sparkles, Shield, ArrowUpRight, Target } from "lucide-react";
import { classifyProjectSize, getSizingConfidenceLabel, MOCK_CLASSIFICATIONS } from "@/services/engineAutoProjectSizingAI";
import { MOCK_TERRITORY_LOCKS, getLockStatusInfo } from "@/services/engineSignatureXXLMonopoly";
import { MOCK_UPGRADE_PRESSURE_EVENTS, getPressureSeverity } from "@/services/engineUpgradePressureBySize";
import { generateMockSnapshots, getPricingTierInfo } from "@/services/engineDynamicPricingBySize";
import type { ProjectSizeCode } from "@/services/clusterProjectSizeMatrixEngine";

const SIZE_COLORS: Record<ProjectSizeCode, string> = {
  xs: "bg-gray-600", s: "bg-blue-600", m: "bg-emerald-600",
  l: "bg-orange-600", xl: "bg-purple-600", xxl: "bg-red-600",
};

export default function PageAdminProjectSizeExtensions() {
  const [activeTab, setActiveTab] = useState("auto-sizing");
  const mockSnapshots = generateMockSnapshots().slice(0, 30);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-950 to-cyan-900/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-xs">Extensions Engine</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Extensions Project Size</h1>
          <p className="text-gray-400 mt-1 text-sm">AutoSizing AI · Signature XXL Monopoly · Upgrade Pressure · Dynamic Pricing</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><Brain className="w-4 h-4 text-blue-400" /><span className="text-xs text-gray-400">Classifications IA</span></div>
                <p className="text-xl font-bold">{MOCK_CLASSIFICATIONS.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-400">Territoires verrouillés</span></div>
                <p className="text-xl font-bold">{MOCK_TERRITORY_LOCKS.filter(l => l.lockStatus === "active").length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-orange-400" /><span className="text-xs text-gray-400">Pressions upgrade</span></div>
                <p className="text-xl font-bold">{MOCK_UPGRADE_PRESSURE_EVENTS.filter(e => !e.dismissed).length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-purple-400" /><span className="text-xs text-gray-400">Prix dynamiques</span></div>
                <p className="text-xl font-bold">{mockSnapshots.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-900 border border-gray-800 mb-6 flex-wrap h-auto">
            <TabsTrigger value="auto-sizing" className="text-xs data-[state=active]:bg-blue-600">
              <Brain className="w-3 h-3 mr-1" />AutoSizing AI
            </TabsTrigger>
            <TabsTrigger value="xxl-monopoly" className="text-xs data-[state=active]:bg-emerald-600">
              <Lock className="w-3 h-3 mr-1" />XXL Monopoly
            </TabsTrigger>
            <TabsTrigger value="upgrade-pressure" className="text-xs data-[state=active]:bg-orange-600">
              <TrendingUp className="w-3 h-3 mr-1" />Upgrade Pressure
            </TabsTrigger>
            <TabsTrigger value="dynamic-pricing" className="text-xs data-[state=active]:bg-purple-600">
              <DollarSign className="w-3 h-3 mr-1" />Dynamic Pricing
            </TabsTrigger>
          </TabsList>

          {/* AutoSizing AI */}
          <TabsContent value="auto-sizing">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  EngineAutoProjectSizingAI — Classifications récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs">
                        <th className="text-left py-2 px-2">Description</th>
                        <th className="text-center py-2 px-2">Budget</th>
                        <th className="text-center py-2 px-2">Taille</th>
                        <th className="text-center py-2 px-2">Confiance</th>
                        <th className="text-left py-2 px-2">Raisonnement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_CLASSIFICATIONS.map((c, i) => (
                        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="py-2 px-2 max-w-[200px] truncate">{c.description}</td>
                          <td className="py-2 px-2 text-center">{c.budgetEstimated?.toLocaleString()}$</td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={`${SIZE_COLORS[c.classifiedSize]} text-white text-xs`}>
                              {c.classifiedSize.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={c.confidence >= 0.85 ? "text-emerald-400" : c.confidence >= 0.7 ? "text-amber-400" : "text-red-400"}>
                              {Math.round(c.confidence * 100)}%
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-gray-400 max-w-[250px] truncate">{c.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Live demo */}
                <div className="mt-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    Test en temps réel
                  </h3>
                  <LiveSizingDemo />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* XXL Monopoly */}
          <TabsContent value="xxl-monopoly">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  EngineSignatureXXLMonopoly — Verrouillages territoriaux
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MOCK_TERRITORY_LOCKS.map(lock => {
                    const statusInfo = getLockStatusInfo(lock.lockStatus);
                    return (
                      <Card key={lock.id} className="bg-gray-800/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{lock.entrepreneurName}</p>
                              <p className="text-xs text-gray-400">{lock.cluster} · {lock.domain}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge className={`${SIZE_COLORS[lock.sizeCode]} text-white text-xs`}>
                                {lock.sizeCode.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={`${statusInfo.color} border-current text-xs`}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                          {lock.lockStatus === "active" && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="text-center p-2 rounded bg-gray-900/50">
                                <p className="text-xs text-gray-400">Revenu protégé / mois</p>
                                <p className="text-sm font-bold text-emerald-400">{lock.revenueProtectedMonthly.toLocaleString()}$</p>
                              </div>
                              <div className="text-center p-2 rounded bg-gray-900/50">
                                <p className="text-xs text-gray-400">Revenu protégé / an</p>
                                <p className="text-sm font-bold text-emerald-400">{lock.revenueProtectedAnnual.toLocaleString()}$</p>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{lock.reason}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upgrade Pressure */}
          <TabsContent value="upgrade-pressure">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-orange-400" />
                  EngineUpgradePressureBySize — Événements actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MOCK_UPGRADE_PRESSURE_EVENTS.map(event => {
                    const severity = getPressureSeverity(event.pressureScore);
                    return (
                      <div key={event.id} className={`p-4 rounded-lg border ${event.converted ? "bg-emerald-900/10 border-emerald-800/30" : event.dismissed ? "bg-gray-800/30 border-gray-700/50 opacity-60" : "bg-gray-800/50 border-gray-700"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{event.entrepreneurName}</p>
                            <p className="text-xs text-gray-400">{event.currentPlan.toUpperCase()} → {event.recommendedPlan.toUpperCase()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${SIZE_COLORS[event.targetSizeCode]} text-white text-xs`}>
                              {event.targetSizeCode.toUpperCase()}
                            </Badge>
                            <span className={`text-xs font-bold ${severity.color}`}>{event.pressureScore}/100</span>
                            {event.converted && <Badge className="bg-emerald-600 text-white text-xs">Converti</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300">{event.messageFr}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`${severity.color} border-current text-xs`}>{severity.label}</Badge>
                          <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">{event.pressureType.replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dynamic Pricing */}
          <TabsContent value="dynamic-pricing">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  EngineDynamicPricingBySize — Matrice des prix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs">
                        <th className="text-left py-2 px-2">Cluster</th>
                        <th className="text-left py-2 px-2">Domaine</th>
                        <th className="text-center py-2 px-2">Plan</th>
                        <th className="text-center py-2 px-2">Size</th>
                        <th className="text-right py-2 px-2">Base</th>
                        <th className="text-center py-2 px-1">×Size</th>
                        <th className="text-center py-2 px-1">×Rare</th>
                        <th className="text-center py-2 px-1">×Cluster</th>
                        <th className="text-center py-2 px-1">×Saison</th>
                        <th className="text-center py-2 px-1">×Demande</th>
                        <th className="text-right py-2 px-2">Final/mois</th>
                        <th className="text-center py-2 px-2">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockSnapshots.map(snap => {
                        const tierInfo = getPricingTierInfo(snap.pricingTier as any);
                        return (
                          <tr key={snap.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 text-xs">
                            <td className="py-1.5 px-2">{snap.cluster}</td>
                            <td className="py-1.5 px-2">{snap.domain}</td>
                            <td className="py-1.5 px-2 text-center">{snap.planName}</td>
                            <td className="py-1.5 px-2 text-center">
                              <Badge className={`${SIZE_COLORS[snap.sizeCode as ProjectSizeCode]} text-white text-[10px] px-1`}>
                                {snap.sizeCode.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-1.5 px-2 text-right">{snap.baseMonthlyPrice}$</td>
                            <td className="py-1.5 px-1 text-center text-gray-400">{snap.sizeMultiplier}</td>
                            <td className="py-1.5 px-1 text-center text-gray-400">{snap.scarcityMultiplier}</td>
                            <td className="py-1.5 px-1 text-center text-gray-400">{snap.clusterValueMultiplier}</td>
                            <td className="py-1.5 px-1 text-center text-gray-400">{snap.seasonalMultiplier}</td>
                            <td className="py-1.5 px-1 text-center text-gray-400">{snap.demandMultiplier}</td>
                            <td className="py-1.5 px-2 text-right font-bold">{snap.finalMonthlyPrice.toLocaleString()}$</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`${tierInfo.color} text-[10px] font-medium`}>{tierInfo.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Live demo component for auto-sizing
function LiveSizingDemo() {
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const result = desc || budget
    ? classifyProjectSize({ description: desc, budgetEstimated: budget ? parseFloat(budget) : undefined })
    : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Description du projet..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500"
        />
        <input
          type="number"
          placeholder="Budget estimé ($)"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500"
        />
      </div>
      {result && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={`${SIZE_COLORS[result.classifiedSize]} text-white`}>
            {result.classifiedSize.toUpperCase()}
          </Badge>
          <span className={`text-sm font-medium ${result.confidence >= 0.7 ? "text-emerald-400" : "text-amber-400"}`}>
            {Math.round(result.confidence * 100)}% — {getSizingConfidenceLabel(result.confidence)}
          </span>
          {result.alternativeSize && (
            <span className="text-xs text-gray-400">
              Alt: {result.alternativeSize.toUpperCase()} ({Math.round((result.alternativeConfidence ?? 0) * 100)}%)
            </span>
          )}
          <span className="text-xs text-gray-500">{result.reasoning}</span>
        </div>
      )}
    </div>
  );
}
