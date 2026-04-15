import { useRecruitmentCampaigns } from "@/hooks/useRecruitmentCampaigns";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Mail, MessageSquare } from "lucide-react";

const channelIcon: Record<string, any> = { email: Mail, sms: MessageSquare };

export default function PageAdminRecruitmentSequences() {
  const { sequences } = useRecruitmentCampaigns();

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Séquences</h1>
          <p className="text-sm text-muted-foreground">Séquences multi-étapes email + SMS</p>
        </div>

        {sequences.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        ) : sequences.data?.length === 0 ? (
          <Card className="bg-card/80"><CardContent className="py-12 text-center text-muted-foreground">Aucune séquence</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {sequences.data?.map((s) => (
              <Card key={s.id} className="bg-card/80 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <Badge variant="outline">{s.sequence_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(s as any).contractor_recruitment_campaigns?.name} • Personnalisation: {s.personalization_level}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Placeholder steps visualization */}
                    <div className="flex items-center gap-1 text-xs bg-muted/50 rounded-full px-3 py-1">
                      <Mail className="h-3 w-3" /> Email
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="flex items-center gap-1 text-xs bg-muted/50 rounded-full px-3 py-1">
                      <Mail className="h-3 w-3" /> Relance
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="flex items-center gap-1 text-xs bg-muted/50 rounded-full px-3 py-1">
                      <MessageSquare className="h-3 w-3" /> SMS
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
}
