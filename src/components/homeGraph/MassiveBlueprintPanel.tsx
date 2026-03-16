import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Rocket, Calculator, Layers, Target, AlertTriangle, Zap, Globe, Loader2, TrendingUp,
} from "lucide-react";
import {
  simulateMassiveGeneration, executeMassiveGeneration,
  type SimulationResult, type WavePlan,
} from "@/services/blueprintGeneratorService";

export default function MassiveBlueprintPanel() {
  const [minPriority, setMinPriority] = useState(20);
  const [wave1, setWave1] = useState(500);
  const [wave2, setWave2] = useState(2000);
  const [wave3, setWave3] = useState(10000);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const simulate = useMutation({
    mutationFn: () => simulateMassiveGeneration(minPriority, [wave1, wave2, wave3]),
    onSuccess: (data) => { setSimResult(data); toast.success("Simulation terminée"); },
    onError: () => toast.error("Erreur de simulation"),
  });

  const generate = useMutation({
    mutationFn: ({ wave, max }: { wave: number; max: number }) => executeMassiveGeneration(minPriority, wave, max),
    onSuccess: (data) => toast.success(`${data.created} blueprints créés, ${data.skipped} ignorés`),
    onError: () => toast.error("Erreur de génération"),
  });

  return (
    <div className="space-y-4">
      {/* Simulator Controls */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Simulateur de volume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Priorité min.</Label>
              <Input type="number" value={minPriority} onChange={e => setMinPriority(+e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vague 1</Label>
              <Input type="number" value={wave1} onChange={e => setWave1(+e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vague 2</Label>
              <Input type="number" value={wave2} onChange={e => setWave2(+e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vague 3</Label>
              <Input type="number" value={wave3} onChange={e => setWave3(+e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <Button onClick={() => simulate.mutate()} disabled={simulate.isPending} className="w-full sm:w-auto">
            {simulate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Lancer la simulation
          </Button>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simResult && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{simResult.totalCombinations.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Combinaisons totales</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-emerald-500">{simResult.afterDedup.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Après dédoublonnage</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{simResult.afterThreshold.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Après seuil priorité</p>
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">${simResult.waves.reduce((s, w) => s + w.estimatedCostUSD, 0).toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">Coût total estimé</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2">
              <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{simResult.recommendation}</p>
            </CardContent>
          </Card>

          {/* Wave Plans */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Plan de vagues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {simResult.waves.map(wave => (
                  <WaveCard key={wave.wave} wave={wave} onGenerate={() => generate.mutate({ wave: wave.wave, max: wave.blueprintCount })} isGenerating={generate.isPending} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Domination Scores */}
          {simResult.dominationScores.length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Domination SEO par cluster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Ville</TableHead>
                        <TableHead className="text-xs text-center">Total</TableHead>
                        <TableHead className="text-xs text-center">Publiées</TableHead>
                        <TableHead className="text-xs text-center">En attente</TableHead>
                        <TableHead className="text-xs">Domination</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simResult.dominationScores.map(d => (
                        <TableRow key={d.cluster}>
                          <TableCell className="p-2 text-sm font-medium">{d.cluster}</TableCell>
                          <TableCell className="p-2 text-center text-xs font-mono">{d.totalPages}</TableCell>
                          <TableCell className="p-2 text-center text-xs font-mono text-emerald-500">{d.publishedPages}</TableCell>
                          <TableCell className="p-2 text-center text-xs font-mono text-amber-500">{d.pendingPages}</TableCell>
                          <TableCell className="p-2">
                            <div className="flex items-center gap-2">
                              <Progress value={d.dominationPct} className="h-1.5 flex-1" />
                              <span className="text-xs font-mono w-8 text-right">{d.dominationPct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function WaveCard({ wave, onGenerate, isGenerating }: { wave: WavePlan; onGenerate: () => void; isGenerating: boolean }) {
  const typeEntries = Object.entries(wave.types);
  return (
    <Card className="border-border/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{wave.label}</Badge>
            <span className="text-sm font-bold">{wave.blueprintCount.toLocaleString()} pages</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            Générer
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Priorité moy:</span>
            <span className="font-mono font-bold">{wave.avgPriority}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Cannib:</span>
            <span className={`font-mono font-bold ${wave.cannibalizationRisk > 0.5 ? "text-destructive" : wave.cannibalizationRisk > 0.2 ? "text-amber-500" : "text-emerald-500"}`}>
              {Math.round(wave.cannibalizationRisk * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Quick wins:</span>
            <span className="font-mono font-bold text-emerald-500">{wave.quickWins}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Coût:</span>
            <span className="font-mono font-bold">${wave.estimatedCostUSD}</span>
          </div>
        </div>
        {typeEntries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {typeEntries.map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-[10px]">{type.replace(/_/g, " ")}: {count}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
