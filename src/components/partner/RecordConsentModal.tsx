import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordConsent } from "@/hooks/usePartnerCrm";
import { toast } from "sonner";

const METHODS = [
  { v: "verbal_permission", l: "Permission verbale (appel téléphonique)" },
  { v: "written_permission", l: "Permission écrite (courriel, SMS, contrat)" },
  { v: "web_form_opt_in", l: "Opt-in via formulaire web" },
  { v: "existing_business_relationship", l: "Relation d'affaires existante" },
];

export function RecordConsentModal({
  leadId, open, onOpenChange,
}: { leadId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [status, setStatus] = useState("verbal_permission");
  const [proof, setProof] = useState("");
  const record = useRecordConsent();

  const submit = async () => {
    if (!proof.trim() || proof.trim().length < 10) {
      toast.error("Décrivez la preuve de consentement (min 10 caractères).");
      return;
    }
    try {
      await record.mutateAsync({ lead_id: leadId, new_status: status, consent_method: status, consent_proof: proof });
      toast.success("Consentement enregistré.");
      onOpenChange(false);
      setProof("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0B1220] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Enregistrer le consentement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-white/60 bg-amber-500/5 border border-amber-500/20 rounded p-3">
            Vous devez obtenir la permission du client avant d'envoyer un message.
            UNPRO conserve l'historique de consentement afin de protéger les partenaires,
            les entrepreneurs et la plateforme.
          </div>
          <div>
            <Label>Méthode</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0B1220] text-white border-white/10">
                {METHODS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preuve / contexte</Label>
            <Textarea value={proof} onChange={e => setProof(e.target.value)}
              placeholder="Ex: Appel du 6 mai 2026, M. Tremblay accepte d'être contacté par courriel pour démo UNPRO."
              className="bg-white/5 border-white/10 text-white min-h-[100px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white hover:bg-white/5">Annuler</Button>
          <Button onClick={submit} disabled={record.isPending} className="bg-emerald-500 text-black hover:bg-emerald-400">
            Enregistrer le consentement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
