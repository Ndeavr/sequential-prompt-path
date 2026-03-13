/**
 * UNPRO Condos — Quote Analysis Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Receipt, Plus, Upload, FileText, ArrowRight, Lock } from "lucide-react";
import { EmptyState } from "@/components/shared";

const CondoQuotesPage = () => {
  return (
    <CondoLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold">Analyse de soumissions</h1>
          <p className="text-sm text-muted-foreground">Comparez les soumissions d'entrepreneurs pour vos projets</p>
        </div>
        <Button size="sm" className="rounded-xl">
          <Upload className="h-4 w-4 mr-1.5" /> Téléverser une soumission
        </Button>
      </div>

      <EmptyState
        icon={<Receipt className="h-10 w-10 text-primary/40" />}
        message="Aucune soumission analysée. Téléversez vos soumissions pour obtenir une comparaison intelligente."
        action={
          <div className="space-y-3 text-center">
            <Button className="rounded-xl">
              <Upload className="h-4 w-4 mr-2" /> Téléverser des soumissions
            </Button>
            <p className="text-xs text-muted-foreground">L'IA extrait automatiquement les prix, la portée et les exclusions</p>
          </div>
        }
      />

      {/* How it works */}
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        {[
          { step: "1", title: "Téléversez", desc: "Importez les PDF ou photos de vos soumissions d'entrepreneurs" },
          { step: "2", title: "Analyse IA", desc: "L'IA extrait prix, portée, matériaux et exclusions automatiquement" },
          { step: "3", title: "Comparez", desc: "Recevez un tableau comparatif avec recommandations et alertes" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-5 text-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-display font-bold text-sm text-primary">{s.step}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </CondoLayout>
  );
};

export default CondoQuotesPage;
