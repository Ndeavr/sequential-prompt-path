import { useState } from "react";
import { useSystemEnvironment, useToggleSystemMode } from "@/hooks/useSystemEnvironment";
import { useEmailDomainHealth } from "@/hooks/useEmailProductionControl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Zap, History, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ModalConfirmGoLive from "@/components/admin/system/ModalConfirmGoLive";
import ButtonKillSwitch from "@/components/admin/system/ButtonKillSwitch";
import PanelLiveKPIs from "@/components/admin/system/PanelLiveKPIs";
import { useToast } from "@/hooks/use-toast";

export default function PageSystemModeControlCenter() {
  const { data: env, isLoading } = useSystemEnvironment();
  const { data: domain } = useEmailDomainHealth();
  const toggle = useToggleSystemMode();
  const [showGoLive, setShowGoLive] = useState(false);
  const { toast } = useToast();

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (!env) return <div className="p-6 text-red-500">État système introuvable</div>;

  const isLive = env.mode === "live";

  const handleReturnToTest = async () => {
    try {
      await toggle.mutateAsync({ mode: "test", notes: "Retour à TEST mode manuel" });
      toast({ title: "✅ Retour à TEST mode", description: "Aucun envoi réel ne sera effectué." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
        </Link>
        <h1 className="text-2xl font-bold">Centre de Contrôle Système</h1>
      </div>

      {/* Current state */}
      <Card className={isLive ? "border-red-500/50 bg-red-500/5" : "border-emerald-500/50 bg-emerald-500/5"}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isLive ? <Zap className="h-5 w-5 text-red-500" /> : <ShieldCheck className="h-5 w-5 text-emerald-500" />}
              Mode actuel
            </span>
            <Badge className={isLive ? "bg-red-600" : "bg-emerald-600"}>
              {isLive ? "🔴 LIVE PRODUCTION" : "🟢 TEST MODE"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isLive
              ? "Le système envoie réellement aux prospects. Tous les guards sont actifs."
              : "Aucun envoi réel. Toutes les fonctions outbound retournent skipped."}
          </p>
          {env.activated_at && (
            <p className="text-xs text-muted-foreground">
              Activé : {new Date(env.activated_at).toLocaleString("fr-CA")}
            </p>
          )}
          <div className="flex gap-2 pt-2 flex-wrap">
            {!isLive && (
              <Button onClick={() => setShowGoLive(true)} className="bg-red-600 hover:bg-red-700 text-white">
                <Zap className="h-4 w-4 mr-2" /> GO LIVE NOW
              </Button>
            )}
            {isLive && (
              <Button variant="outline" onClick={handleReturnToTest}>
                Revenir à TEST
              </Button>
            )}
            <ButtonKillSwitch state={env} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">KPIs en direct</CardTitle>
        </CardHeader>
        <CardContent>
          <PanelLiveKPIs />
        </CardContent>
      </Card>

      {/* Pre-flight checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre-flight checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { label: "Domaine email configuré", ok: !!domain },
            { label: `Réputation domaine (${domain?.status ?? "?"})`, ok: domain?.status !== "critical" },
            { label: "Approbation requise avant envoi", ok: env.live_requires_approval },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
              <span>{c.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Approbation obligatoire avant envoi</p>
              <p className="text-xs text-muted-foreground">Chaque batch vérifie approval_status=approved</p>
            </div>
            <Switch checked={env.live_requires_approval} disabled />
          </div>
        </CardContent>
      </Card>

      {showGoLive && <ModalConfirmGoLive onClose={() => setShowGoLive(false)} />}
    </div>
  );
}
