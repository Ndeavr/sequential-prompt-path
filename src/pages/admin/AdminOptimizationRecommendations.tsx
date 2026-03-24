/**
 * UNPRO — Optimization Recommendations Page
 */
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightbulb, ArrowLeft, Beaker, Eye, TrendingUp } from "lucide-react";

// Mock recommendations until real data flows
const MOCK_RECOMMENDATIONS = [
  {
    id: "1", screen_key: "contractor_profile_screen", type: "add_share_cta_above_fold",
    title: "Ajouter un bouton partage au-dessus de la ligne de flottaison",
    description: "Le profil entrepreneur génère beaucoup de screenshots mais peu de partages. Un CTA partage visible en haut augmenterait les conversions.",
    priority: "high", metric: "share_rate", risk: "low",
  },
  {
    id: "2", screen_key: "booking_confirmation_screen", type: "improve_booking_transfer_flow",
    title: "Améliorer le transfert de réservation",
    description: "Les confirmations de booking sont souvent capturées. Ajoutez une barre d'action 'Partager la réservation' pour remplacer le besoin de screenshot.",
    priority: "medium", metric: "booking_share_rate", risk: "low",
  },
  {
    id: "3", screen_key: "aipp_score_result_screen", type: "improve_share_visibility",
    title: "Renforcer la visibilité du partage AIPP",
    description: "Le résultat AIPP est fortement capturé mais rarement partagé via lien. Tester une carte export plus forte.",
    priority: "medium", metric: "share_conversion", risk: "low",
  },
  {
    id: "4", screen_key: "plan_comparison_screen", type: "clarify_primary_action",
    title: "Clarifier l'action principale sur la page plans",
    description: "Fort taux de dismiss des prompts sur la page de comparaison. Simplifier le choix principal.",
    priority: "high", metric: "ctr", risk: "medium",
  },
];

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminOptimizationRecommendations = () => (
  <AdminLayout>
    <Helmet><title>Recommandations · Optimisation IA · UNPRO</title></Helmet>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/optimization" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" /> Recommandations UX
          </h1>
          <p className="text-sm text-muted-foreground">Suggestions d'optimisation générées automatiquement</p>
        </div>
      </div>

      <div className="space-y-3">
        {MOCK_RECOMMENDATIONS.map(rec => (
          <Card key={rec.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                    <Badge className={`text-[10px] ${priorityColors[rec.priority]}`}>{rec.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{rec.screen_key}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />{rec.metric}</span>
                    <span className="text-[10px] text-muted-foreground">Risque: {rec.risk}</span>
                  </div>
                </div>
                <Button size="sm" variant="soft" className="shrink-0">
                  <Beaker className="h-3.5 w-3.5 mr-1" /> Créer test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </AdminLayout>
);

export default AdminOptimizationRecommendations;
