/**
 * UNPRO — Critical Screenshot Insights Bar (Admin Dashboard Top Banner)
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useScreenshotAnalytics,
  useFrictionScoring,
  useAdminScreenshotAlerts,
  useScreenshotRecommendations,
} from "@/hooks/screenshot/useScreenshotAnalytics";
import { Camera, Flame, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";

export default function CriticalScreenshotInsightsBar() {
  const { topScreens, conversion } = useScreenshotAnalytics();
  const { data: friction } = useFrictionScoring();
  const { data: alerts } = useAdminScreenshotAlerts("open");
  const { data: recs } = useScreenshotRecommendations("open");

  const topScreen = topScreens.data?.[0];
  const topFriction = friction?.[0];
  const openAlertCount = alerts?.length ?? 0;
  const topRec = recs?.[0];
  const convRate = conversion.data?.conversion_rate_percent ?? 0;

  const items = [
    topScreen && {
      icon: Camera,
      label: "Top capture",
      value: topScreen.screen_name,
      sub: `${topScreen.total_screenshots} captures`,
      href: "/admin/screenshot-analytics",
    },
    topFriction && {
      icon: Flame,
      label: "Friction max",
      value: topFriction.screen_name,
      sub: `Score ${topFriction.friction_score}`,
      href: "/admin/screenshot-friction",
      critical: topFriction.friction_level === "critical",
    },
    {
      icon: AlertTriangle,
      label: "Alertes",
      value: `${openAlertCount} ouvertes`,
      sub: openAlertCount > 0 ? "Action requise" : "Aucune",
      href: "/admin/screenshot-alerts",
      critical: openAlertCount > 3,
    },
    {
      icon: TrendingUp,
      label: "Conversion",
      value: `${convRate}%`,
      sub: "Capture → Partage",
      href: "/admin/screenshot-analytics",
    },
    topRec && {
      icon: Lightbulb,
      label: "Recommandation",
      value: topRec.title,
      sub: topRec.priority,
      href: "/admin/screenshot-insights",
    },
  ].filter(Boolean) as any[];

  if (!items.length) return null;

  return (
    <div className="mb-6 overflow-x-auto pb-2 -mx-1">
      <div className="flex gap-3 min-w-max px-1">
        {items.map((item, i) => (
          <Link key={i} to={item.href}>
            <Card className={`w-48 hover:shadow-md transition-shadow cursor-pointer ${item.critical ? "border-destructive/40 bg-destructive/5" : "border-border/30"}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <item.icon className={`h-3.5 w-3.5 ${item.critical ? "text-destructive" : "text-primary"}`} />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{item.label}</span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
