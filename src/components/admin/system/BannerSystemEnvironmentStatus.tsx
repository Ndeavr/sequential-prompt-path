import { useState } from "react";
import { Link } from "react-router-dom";
import { useSystemEnvironment } from "@/hooks/useSystemEnvironment";
import { Button } from "@/components/ui/button";
import { Activity, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Zap, Pause } from "lucide-react";
import ModalConfirmGoLive from "./ModalConfirmGoLive";
import ButtonKillSwitch from "./ButtonKillSwitch";
import PanelLiveKPIs from "./PanelLiveKPIs";

export default function BannerSystemEnvironmentStatus() {
  const { data: env, isLoading } = useSystemEnvironment();
  const [showModal, setShowModal] = useState(false);
  const [showKpis, setShowKpis] = useState(false);

  if (isLoading || !env) {
    return (
      <div className="bg-muted/40 border-b border-border/30 px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
        <Activity className="h-3 w-3 animate-pulse" /> Chargement état système…
      </div>
    );
  }

  const isLive = env.mode === "live" && !env.kill_switch_active;
  const isPaused = env.kill_switch_active;
  const isTest = env.mode === "test" && !env.kill_switch_active;

  // Color classes via semantic tokens
  let bannerClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-200";
  let pillClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  let icon = <ShieldCheck className="h-3.5 w-3.5" />;
  let label = "TEST MODE";
  let subtitle = "0 envoi réel · Sécurisé";

  if (isLive) {
    bannerClass = "bg-red-500/15 border-red-500/40 text-red-100 animate-pulse";
    pillClass = "bg-red-500/30 text-red-100 border-red-500/50";
    icon = <Zap className="h-3.5 w-3.5" />;
    label = "🔴 LIVE PRODUCTION";
    subtitle = "Envois réels actifs";
  }
  if (isPaused) {
    bannerClass = "bg-amber-500/15 border-amber-500/40 text-amber-100";
    pillClass = "bg-amber-500/30 text-amber-100 border-amber-500/50";
    icon = <Pause className="h-3.5 w-3.5" />;
    label = "⏸ PAUSED (Kill Switch)";
    subtitle = env.paused_at ? `Activé ${new Date(env.paused_at).toLocaleTimeString("fr-CA")}` : "Tous envois suspendus";
  }

  return (
    <>
      <div className={`border-b ${bannerClass} sticky top-0 z-40`}>
        <div className="px-3 md:px-4 py-1.5 flex items-center gap-2 flex-wrap text-xs">
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-bold ${pillClass}`}>
            {icon} {label}
          </span>
          <span className="text-current/80 hidden sm:inline">{subtitle}</span>

          <div className="ml-auto flex items-center gap-1.5">
            <Link to="/admin/system-mode">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-white/10">
                Détails
              </Button>
            </Link>

            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-white/10"
              onClick={() => setShowKpis((v) => !v)}
            >
              KPIs {showKpis ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>

            {isTest && (
              <Button
                size="sm"
                onClick={() => setShowModal(true)}
                className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Zap className="h-3 w-3 mr-1" /> GO LIVE NOW
              </Button>
            )}

            {(isLive || isPaused) && <ButtonKillSwitch state={env} />}
          </div>
        </div>

        {showKpis && (
          <div className="border-t border-current/20 px-3 md:px-4 py-2 bg-black/20">
            <PanelLiveKPIs />
          </div>
        )}
      </div>

      {showModal && <ModalConfirmGoLive onClose={() => setShowModal(false)} />}
    </>
  );
}
