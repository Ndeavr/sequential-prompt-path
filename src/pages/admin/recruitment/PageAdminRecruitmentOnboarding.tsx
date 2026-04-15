import { useRecruitmentProspects } from "@/hooks/useRecruitmentProspects";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, Clock, CheckCircle, XCircle } from "lucide-react";

export default function PageAdminRecruitmentOnboarding() {
  const { prospects } = useRecruitmentProspects();

  const onboardingProspects = prospects.data?.filter((p) =>
    ["in_progress", "completed", "abandoned"].includes(p.onboarding_status)
  ) || [];

  const inProgress = onboardingProspects.filter((p) => p.onboarding_status === "in_progress");
  const completed = onboardingProspects.filter((p) => p.onboarding_status === "completed");
  const abandoned = onboardingProspects.filter((p) => p.onboarding_status === "abandoned");

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Onboarding</h1>
          <p className="text-sm text-muted-foreground">Suivi du funnel d'onboarding des prospects</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold">{inProgress.length}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Complétés</p>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur">
            <CardContent className="p-4 text-center">
              <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold">{abandoned.length}</p>
              <p className="text-xs text-muted-foreground">Abandonnés</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prospects en onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            {prospects.isLoading ? (
              <Skeleton className="h-40" />
            ) : onboardingProspects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucun prospect en onboarding actuellement</p>
            ) : (
              <div className="space-y-2">
                {onboardingProspects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{p.business_name}</p>
                      <p className="text-xs text-muted-foreground">{p.city} • {p.category_slug}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{p.onboarding_status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
