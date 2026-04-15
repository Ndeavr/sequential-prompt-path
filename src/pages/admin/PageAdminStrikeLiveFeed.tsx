import { useStrikeDashboard } from "@/hooks/useStrikeDashboard";
import FeedLiveRecruitmentEvents from "@/components/strike/FeedLiveRecruitmentEvents";
import PanelConversionOpportunities from "@/components/strike/PanelConversionOpportunities";
import Countdown36hTimer from "@/components/strike/Countdown36hTimer";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function PageAdminStrikeLiveFeed() {
  const { session, events, hotProspects, isLoading } = useStrikeDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground text-sm">Chargement…</div></div>;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Aucun strike actif. Lancez un strike depuis le dashboard.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Feed Live</h1>
        </div>
        <Countdown36hTimer endTime={session.end_time} status={session.status} />
      </div>

      <Card className="p-4 bg-card/50 border-border/30">
        <PanelConversionOpportunities hotProspects={hotProspects} />
      </Card>

      <Card className="p-4 bg-card/50 border-border/30">
        <h3 className="text-sm font-bold text-foreground mb-3">Événements temps réel</h3>
        <FeedLiveRecruitmentEvents events={events} />
      </Card>
    </div>
  );
}
