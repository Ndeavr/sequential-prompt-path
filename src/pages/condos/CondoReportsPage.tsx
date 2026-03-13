/**
 * UNPRO Condos — Reports Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, Download, Lock, FileText, BarChart3, PiggyBank } from "lucide-react";

const reports = [
  { title: "Rapport annuel de maintenance", desc: "Résumé de toutes les interventions de l'année", icon: FileText, free: true },
  { title: "État des composantes", desc: "Inventaire détaillé avec durées de vie restantes", icon: BarChart3, free: true },
  { title: "Projection fonds de prévoyance", desc: "Graphiques et projections sur 25 ans", icon: PiggyBank, free: false },
  { title: "Analyse comparative soumissions", desc: "Comparaison détaillée avec recommandations", icon: FileBarChart, free: false },
];

const CondoReportsPage = () => (
  <CondoLayout>
    <div className="mb-6">
      <h1 className="font-display text-xl font-bold">Rapports</h1>
      <p className="text-sm text-muted-foreground">Générez des rapports pour vos assemblées et institutions</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {reports.map((r, i) => (
        <Card key={i} className={`border-border/40 ${r.free ? "bg-card/80" : "bg-card/60 opacity-75"}`}>
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
              <r.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{r.title}</h3>
                {!r.free && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Premium</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <Button size="sm" variant={r.free ? "default" : "outline"} className="rounded-lg" disabled={!r.free}>
                {r.free ? <><Download className="h-3 w-3 mr-1" /> Générer</> : <><Lock className="h-3 w-3 mr-1" /> Premium requis</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </CondoLayout>
);

export default CondoReportsPage;
