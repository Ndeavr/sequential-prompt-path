import { useStrikeDashboard } from "@/hooks/useStrikeDashboard";
import HeroSection36hStrike from "@/components/strike/HeroSection36hStrike";
import Dashboard36hStrikeKPI from "@/components/strike/Dashboard36hStrikeKPI";
import AlertCriticalBlocker from "@/components/strike/AlertCriticalBlocker";
import PanelConversionOpportunities from "@/components/strike/PanelConversionOpportunities";
import WidgetEmailPerformanceLive from "@/components/strike/WidgetEmailPerformanceLive";
import FeedLiveRecruitmentEvents from "@/components/strike/FeedLiveRecruitmentEvents";
import PanelAlexConversionControl from "@/components/strike/PanelAlexConversionControl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function PageAdmin36hStrikeDashboard() {
  const {
    session, isLoading, results, events, hotProspects, targets,
    startStrike, closeStrike, refreshMetrics,
  } = useStrikeDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground text-sm">Chargement…</div></div>;
  }

  const openRate = results && results.total_emails_sent > 0 ? results.total_opened / results.total_emails_sent : 0;
  const hoursLeft = session ? Math.max(0, (new Date(session.end_time).getTime() - Date.now()) / 3600000) : 36;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      <HeroSection36hStrike
        session={session}
        onStart={() => startStrike.mutate({ target_conversions: 1 })}
        onClose={() => closeStrike.mutate()}
        isStarting={startStrike.isPending}
      />

      {session && (
        <>
          <AlertCriticalBlocker status={session.status} openRate={openRate} hoursLeft={hoursLeft} />

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => refreshMetrics.mutate()} disabled={refreshMetrics.isPending}>
              <RefreshCw className={`w-3 h-3 mr-1 ${refreshMetrics.isPending ? "animate-spin" : ""}`} /> Rafraîchir
            </Button>
          </div>

          <Dashboard36hStrikeKPI results={results} />

          <Card className="p-4 bg-card/50 border-border/30">
            <WidgetEmailPerformanceLive results={results} />
          </Card>

          <Card className="p-4 bg-card/50 border-border/30">
            <PanelConversionOpportunities hotProspects={hotProspects} />
          </Card>

          <Card className="p-4 bg-card/50 border-border/30">
            <PanelAlexConversionControl targets={targets} />
          </Card>

          <Card className="p-4 bg-card/50 border-border/30">
            <h3 className="text-sm font-bold text-foreground mb-3">Feed Live</h3>
            <FeedLiveRecruitmentEvents events={events} />
          </Card>
        </>
      )}
    </div>
  );
}
