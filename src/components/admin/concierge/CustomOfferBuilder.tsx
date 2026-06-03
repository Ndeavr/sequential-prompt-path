/**
 * UNPRO — Custom activation offer + Stripe checkout link generator.
 * Uses existing `activation-create-checkout` edge function with quote_id-like metadata.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ConciergeTarget } from "@/hooks/useConcierge";
import { useLogTouch, useUpdateProspect } from "@/hooks/useConcierge";

const PLANS = [
  { key: "recrue", label: "Recrue · 149$/mo" },
  { key: "pro", label: "Pro · 349$/mo" },
  { key: "premium", label: "Premium · 599$/mo" },
  { key: "elite", label: "Élite · 999$/mo" },
  { key: "signature", label: "Signature · 1 799$/mo" },
  { key: "founder_elite", label: "Founder Élite · 19 995$" },
  { key: "founder_signature", label: "Founder Signature · 29 995$" },
];

export default function CustomOfferBuilder({ prospect }: { prospect: ConciergeTarget }) {
  const [plan, setPlan] = useState("pro");
  const [override, setOverride] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const logTouch = useLogTouch();
  const updateProspect = useUpdateProspect();

  const generate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("concierge-create-offer", {
        body: {
          prospect_id: prospect.id,
          plan,
          price_override_cad: override ? Number(override) : null,
        },
      });
      if (error) throw error;
      const url = data?.checkout_url as string | undefined;
      if (!url) throw new Error("Aucun lien retourné");
      setLink(url);
      await updateProspect.mutateAsync({
        id: prospect.id,
        patch: {
          custom_offer: { plan, price_override_cad: override ? Number(override) : null, checkout_url: url, created_at: new Date().toISOString() },
          concierge_stage: "offer_sent",
          outreach_status: "offer_sent",
        },
      });
      await logTouch.mutateAsync({
        prospect_id: prospect.id,
        channel: "system",
        direction: "internal",
        body: `Offre générée: ${plan}${override ? ` (override ${override}$)` : ""}\n${url}`,
      });
      toast.success("Lien d'activation prêt");
    } catch (e: any) {
      toast.error(e.message || "Échec de la génération");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-card/40 p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Offre d'activation</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Plan</Label>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLANS.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Override prix (CAD)</Label>
          <Input
            inputMode="numeric"
            placeholder="optionnel"
            value={override}
            onChange={(e) => setOverride(e.target.value.replace(/[^\d.]/g, ""))}
            className="h-9"
          />
        </div>
      </div>

      <Button onClick={generate} disabled={busy} className="w-full">
        <Link2 className="h-3.5 w-3.5 mr-1.5" />
        {busy ? "Génération…" : "Générer le lien d'activation"}
      </Button>

      {link && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3 space-y-2">
          <div className="text-[11px] text-emerald-300 uppercase tracking-wider">Lien prêt</div>
          <div className="text-xs font-mono break-all text-foreground/90">{link}</div>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copié"); }}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copier
          </Button>
        </div>
      )}
    </div>
  );
}
