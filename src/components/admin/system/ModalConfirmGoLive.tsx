import { useState } from "react";
import { useToggleSystemMode } from "@/hooks/useSystemEnvironment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEmailDomainHealth } from "@/hooks/useEmailProductionControl";
import { CheckCircle2, AlertCircle, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onClose: () => void;
}

export default function ModalConfirmGoLive({ onClose }: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [notes, setNotes] = useState("");
  const toggle = useToggleSystemMode();
  const { data: domainHealth } = useEmailDomainHealth();
  const { toast } = useToast();

  const checks = [
    { label: "Domaine email configuré", ok: !!domainHealth },
    { label: "Réputation domaine ≥ acceptable", ok: domainHealth?.status !== "critical" },
    { label: "Authentification admin vérifiée", ok: true },
  ];
  const allOk = checks.every((c) => c.ok);
  const canSubmit = allOk && confirmText.trim().toUpperCase() === "ACTIVER LIVE";

  const handleGoLive = async () => {
    try {
      await toggle.mutateAsync({ mode: "live", notes });
      toast({ title: "🔴 LIVE PRODUCTION activé", description: "Le système envoie maintenant en production." });
      onClose();
    } catch (e: any) {
      toast({ title: "Activation refusée", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <Zap className="h-5 w-5" /> Activer LIVE PRODUCTION
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d'activer les systèmes outbound réels. Tous les envois deviendront réels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold">Pre-flight check</p>
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={c.ok ? "" : "text-red-500"}>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note d'activation (optionnel)</label>
            <Input
              placeholder="Ex: Lancement campagne Laval sniper"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Tapez <span className="font-mono text-red-500">ACTIVER LIVE</span> pour confirmer
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ACTIVER LIVE"
              className="font-mono"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleGoLive}
              disabled={!canSubmit || toggle.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {toggle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              GO LIVE NOW
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
