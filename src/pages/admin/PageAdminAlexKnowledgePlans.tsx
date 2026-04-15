/**
 * PageAdminAlexKnowledgePlans — Admin page for managing Alex plan knowledge base
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, RefreshCw, Zap, Star, Crown, Gem } from "lucide-react";
import type { PlanDefinition } from "@/services/alexPlanTruthEngine";
import { fetchPlanDefinitions, fetchKnowledgeBase, type KnowledgeBase } from "@/services/alexPlanTruthEngine";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  pro: <Zap className="w-5 h-5 text-blue-400" />,
  premium: <Star className="w-5 h-5 text-amber-400" />,
  elite: <Crown className="w-5 h-5 text-purple-400" />,
  signature: <Gem className="w-5 h-5 text-emerald-400" />,
};

export default function PageAdminAlexKnowledgePlans() {
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([fetchPlanDefinitions(), fetchKnowledgeBase()]);
      setPlans(p);
      setKnowledge(k);
    } catch (e) {
      console.error("Failed to load plan data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Alex — Knowledge Plans
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de connaissances et règles de vérité pour les réponses Alex
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Knowledge Base */}
      {knowledge && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Positionnement UNPRO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-foreground leading-relaxed">{knowledge.corePositioning}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-emerald-400 mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Sujets autorisés
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {knowledge.allowedTopics.map(t => (
                    <Badge key={t} variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-destructive mb-2 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Sujets INTERDITS
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {knowledge.forbiddenTopics.map(t => (
                    <Badge key={t} variant="outline" className="border-destructive/30 text-destructive text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
          <Card key={plan.id} className="border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {PLAN_ICONS[plan.code]}
                {plan.name}
              </CardTitle>
              <p className="text-2xl font-bold">{(plan.priceMonthly / 100).toFixed(0)} $/mois</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">{plan.appointmentsIncluded} RDV exclusifs</Badge>
                <Badge variant="outline" className="text-xs">P{plan.priorityLevel}</Badge>
              </div>
              <div className="space-y-1">
                {plan.features.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-primary shrink-0" /> {f}
                  </p>
                ))}
              </div>
              <p className="text-[10px] italic text-muted-foreground/70 mt-2">{plan.differentiator}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
