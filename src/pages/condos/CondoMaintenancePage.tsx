/**
 * UNPRO Condos — Maintenance Calendar & Tasks
 */
import { useState } from "react";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Wrench, Plus, Calendar, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const mockTasks = [
  { id: "1", title: "Inspection toiture", status: "pending", priority: "high", due_date: "2026-04-15", category: "preventive" },
  { id: "2", title: "Nettoyage gouttières", status: "pending", priority: "medium", due_date: "2026-05-01", category: "preventive" },
  { id: "3", title: "Vérification extincteurs", status: "pending", priority: "low", due_date: "2026-06-15", category: "sécurité" },
  { id: "4", title: "Entretien ascenseur", status: "completed", priority: "high", due_date: "2026-03-01", category: "mécanique" },
  { id: "5", title: "Nettoyage stationnement", status: "completed", priority: "low", due_date: "2026-02-20", category: "général" },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "Haute", color: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Moyenne", color: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Basse", color: "bg-success/10 text-success border-success/20" },
};

const CondoMaintenancePage = () => {
  const pending = mockTasks.filter(t => t.status === "pending");
  const completed = mockTasks.filter(t => t.status === "completed");

  return (
    <CondoLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Entretien</h1>
          <p className="text-sm text-muted-foreground">Calendrier et historique de maintenance</p>
        </div>
        <Button size="sm" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" /> Nouvelle tâche
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="bg-muted/50 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg">À venir ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg">Complétées ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {pending.map((task, i) => {
            const pc = priorityConfig[task.priority];
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="border-border/40 bg-card/80 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${task.priority === "high" ? "bg-destructive" : task.priority === "medium" ? "bg-warning" : "bg-success"}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{task.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(task.due_date).toLocaleDateString("fr-CA")}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">{task.category}</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${pc.color}`}>{pc.label}</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completed.map((task, i) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="border-border/40 bg-card/60">
                <CardContent className="p-4 flex items-center gap-4">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-muted-foreground">{task.title}</h3>
                    <span className="text-xs text-muted-foreground">{new Date(task.due_date).toLocaleDateString("fr-CA")}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{task.category}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </CondoLayout>
  );
};

export default CondoMaintenancePage;
