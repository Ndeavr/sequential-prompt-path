/**
 * UNPRO Condos — Building Components Page
 */
import { useState } from "react";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Puzzle, Plus, Search, Calendar, DollarSign, Clock } from "lucide-react";

/* Mock data — replace with real query */
const mockComponents = [
  { id: "1", name: "Toiture membrane", category: "toiture", install_year: 2010, useful_life_years: 25, remaining_life_years: 9, estimated_replacement_cost: 185000, condition_rating: "fair" },
  { id: "2", name: "Fenêtres PVC", category: "fenêtres", install_year: 2015, useful_life_years: 30, remaining_life_years: 19, estimated_replacement_cost: 120000, condition_rating: "good" },
  { id: "3", name: "Système HVAC", category: "mécanique", install_year: 2008, useful_life_years: 20, remaining_life_years: 2, estimated_replacement_cost: 45000, condition_rating: "poor" },
  { id: "4", name: "Ascenseur", category: "mécanique", install_year: 2005, useful_life_years: 25, remaining_life_years: 4, estimated_replacement_cost: 95000, condition_rating: "fair" },
  { id: "5", name: "Revêtement extérieur", category: "enveloppe", install_year: 2012, useful_life_years: 35, remaining_life_years: 21, estimated_replacement_cost: 75000, condition_rating: "good" },
  { id: "6", name: "Plomberie principale", category: "plomberie", install_year: 2000, useful_life_years: 40, remaining_life_years: 14, estimated_replacement_cost: 65000, condition_rating: "good" },
];

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: "Bon", color: "bg-success/10 text-success border-success/20" },
  fair: { label: "Acceptable", color: "bg-warning/10 text-warning border-warning/20" },
  poor: { label: "Mauvais", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const CondoComponentsPage = () => {
  const [search, setSearch] = useState("");
  const filtered = mockComponents.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <CondoLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Composantes</h1>
          <p className="text-sm text-muted-foreground">Inventaire et cycle de vie des composantes du bâtiment</p>
        </div>
        <Button size="sm" className="rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" /> Ajouter
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une composante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((comp, i) => {
          const cond = conditionConfig[comp.condition_rating] || conditionConfig.good;
          const lifePercent = Math.max(0, Math.round((comp.remaining_life_years / comp.useful_life_years) * 100));
          return (
            <motion.div key={comp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="border-border/40 bg-card/80 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{comp.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{comp.category}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${cond.color}`}>{cond.label}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/40">
                      <Calendar className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{comp.install_year}</p>
                      <p className="text-[10px] text-muted-foreground">Installation</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <Clock className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{comp.remaining_life_years} ans</p>
                      <p className="text-[10px] text-muted-foreground">Vie restante</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40">
                      <DollarSign className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs font-semibold">{(comp.estimated_replacement_cost / 1000).toFixed(0)}k$</p>
                      <p className="text-[10px] text-muted-foreground">Remplacement</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Durée de vie</span>
                      <span className="text-[10px] font-medium">{lifePercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${lifePercent > 50 ? "bg-success" : lifePercent > 20 ? "bg-warning" : "bg-destructive"}`}
                        style={{ width: `${lifePercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </CondoLayout>
  );
};

export default CondoComponentsPage;
