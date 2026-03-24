/**
 * UNPRO — Winning Variants Page
 */
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useWinningVariants } from "@/hooks/optimization";
import { Trophy, ArrowLeft, CheckCircle, Zap } from "lucide-react";

const AdminWinningVariantsPage = () => {
  const { data, isLoading } = useWinningVariants();
  const list = (data ?? []) as any[];

  return (
    <AdminLayout>
      <Helmet><title>Variantes gagnantes · Optimisation IA · UNPRO</title></Helmet>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <Link to="/admin/optimization" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" /> Variantes gagnantes
          </h1>
          <p className="text-sm text-muted-foreground">Historique des variantes promues</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune variante gagnante encore</p>
              <p className="text-xs text-muted-foreground mt-1">Les résultats apparaîtront ici après la fin des premières expériences</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((w) => (
              <Card key={w.id} className="border-success/20 bg-success/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm font-semibold text-foreground">{w.screen_key}</span>
                        {w.auto_promoted && <Badge variant="outline" className="text-[9px] flex items-center gap-0.5"><Zap className="h-2.5 w-2.5" /> Auto</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{w.decision_reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">+{w.primary_metric_lift_percent}%</p>
                      <p className="text-[10px] text-muted-foreground">Confiance: {w.confidence_score}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWinningVariantsPage;
