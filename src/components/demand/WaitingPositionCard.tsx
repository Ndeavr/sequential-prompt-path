/**
 * UNPRO — WaitingPositionCard
 * Shown to a homeowner when no contractor is available for their project.
 * Never says "no contractor available" — always frames as queued + expanding coverage.
 */
import { useState } from "react";
import { Bell, Crown, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Props = {
  projectId: string;
  homeownerId: string;
  city: string;
  category: string;
  position: number | null;
};

export function WaitingPositionCard({ projectId, homeownerId, city, category, position }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notify, setNotify] = useState({ sms: true, email: true, push: true });
  const [referralOpen, setReferralOpen] = useState(false);
  const [referral, setReferral] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const positionLabel = position && position > 0 ? `#${position}` : "en file";

  async function saveNotify(channel: "sms" | "email" | "push", value: boolean) {
    const next = { ...notify, [channel]: value };
    setNotify(next);
    await supabase
      .from("demand_signals")
      .update({ notify_channels: next })
      .eq("project_id", projectId);
  }

  async function submitReferral() {
    if (!referral.name.trim()) {
      toast({ title: "Nom requis", description: "Indiquez au moins le nom de l'entreprise." });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contractor_referrals").insert({
      homeowner_id: homeownerId,
      project_id: projectId,
      contractor_name: referral.name.trim(),
      contractor_phone: referral.phone.trim() || null,
      contractor_email: referral.email.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Envoi impossible", description: error.message });
      return;
    }
    toast({ title: "Merci !", description: "Nous contactons cet entrepreneur." });
    setReferral({ name: "", phone: "", email: "" });
    setReferralOpen(false);
  }

  return (
    <Card className="p-6 space-y-6 glass-strong">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-readable-muted">Projet reçu</p>
        <h2 className="text-2xl font-semibold text-readable-primary">
          Vous êtes {positionLabel} en attente d'une recommandation {category} à {city}.
        </h2>
        <p className="text-readable-body">
          Alex cherche activement un entrepreneur compatible. Votre projet reste prioritaire.
        </p>
        <p className="text-xs text-readable-muted">Référence : {projectId.slice(0, 8)}</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="font-medium text-readable-primary">Me notifier dès qu'une recommandation est prête</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {(["sms", "email", "push"] as const).map((c) => (
            <label key={c} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="capitalize text-readable-body">{c}</span>
              <Switch checked={notify[c]} onCheckedChange={(v) => saveNotify(c, v)} />
            </label>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => navigate(`/founder?source=demand_waitlist&city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`)}
      >
        <Crown className="mr-2 h-4 w-4" />
        Devenir propriétaire fondateur
      </Button>

      <div className="space-y-3">
        {!referralOpen ? (
          <Button variant="outline" className="w-full" onClick={() => setReferralOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Connaissez-vous un entrepreneur ?
          </Button>
        ) : (
          <div className="space-y-2 rounded-2xl border border-white/10 p-4">
            <Input
              placeholder="Nom de l'entreprise *"
              value={referral.name}
              onChange={(e) => setReferral((r) => ({ ...r, name: e.target.value }))}
            />
            <Input
              placeholder="Téléphone (optionnel)"
              value={referral.phone}
              onChange={(e) => setReferral((r) => ({ ...r, phone: e.target.value }))}
            />
            <Input
              placeholder="Courriel (optionnel)"
              value={referral.email}
              onChange={(e) => setReferral((r) => ({ ...r, email: e.target.value }))}
            />
            <div className="flex gap-2 pt-1">
              <Button onClick={submitReferral} disabled={submitting} className="flex-1">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer"}
              </Button>
              <Button variant="ghost" onClick={() => setReferralOpen(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
