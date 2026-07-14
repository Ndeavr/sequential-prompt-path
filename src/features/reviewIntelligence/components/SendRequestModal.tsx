import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSendReviewRequest } from "../hooks/useReviewRequests";
import { Loader2, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractorId: string;
}

export default function SendRequestModal({ open, onOpenChange, contractorId }: Props) {
  const [form, setForm] = useState({
    homeowner_name: "",
    phone: "",
    email: "",
    project_type: "",
    city: "",
    completion_date: new Date().toISOString().split("T")[0],
  });
  const send = useSendReviewRequest();

  const submit = async () => {
    if (!form.homeowner_name || (!form.phone && !form.email)) {
      toast.error("Nom + téléphone ou courriel requis");
      return;
    }
    try {
      await send.mutateAsync({ contractor_id: contractorId, ...form });
      toast.success("Demande d'avis envoyée");
      onOpenChange(false);
      setForm({ ...form, homeowner_name: "", phone: "", email: "" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'envoi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer une demande d'avis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom du client *</Label>
            <Input value={form.homeowner_name} onChange={(e) => setForm({ ...form, homeowner_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15145551234" />
            </div>
            <div>
              <Label>Courriel</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type de projet</Label>
              <Input value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })} placeholder="Isolation grenier" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Terrebonne" />
            </div>
          </div>
          <div>
            <Label>Date de fin des travaux</Label>
            <Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} />
          </div>
          <Button onClick={submit} disabled={send.isPending} className="w-full">
            {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Envoyer la demande
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Un SMS et/ou courriel avec un lien unique sera envoyé au client.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
