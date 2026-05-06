import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask } from "@/hooks/usePartnerCrm";
import { toast } from "sonner";

const TYPES = [
  ["call","Appel"],["email_followup","Suivi courriel"],["demo","Démo"],
  ["payment_followup","Relance paiement"],["onboarding_check","Vérification onboarding"],
  ["renewal","Renouvellement"],["other","Autre"],
];

export function ReminderModal({
  leadId, open, onOpenChange,
}: { leadId?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState(() => {
    const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(9,0,0,0);
    return t.toISOString().slice(0, 16);
  });
  const [desc, setDesc] = useState("");
  const create = useCreateTask();

  const submit = async () => {
    if (!title.trim()) return toast.error("Titre requis");
    try {
      await create.mutateAsync({
        lead_id: leadId, title, task_type: type, priority,
        due_at: new Date(dueAt).toISOString(), description: desc,
      });
      toast.success("Rappel planifié.");
      onOpenChange(false);
      setTitle(""); setDesc("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0B1220] border-white/10 text-white">
        <DialogHeader><DialogTitle>Planifier un rappel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titre</Label>
            <Input value={title} onChange={e=>setTitle(e.target.value)} className="bg-white/5 border-white/10 text-white" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-[#0B1220] text-white border-white/10">
                  {TYPES.map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><Label>Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-[#0B1220] text-white border-white/10">
                  <SelectItem value="low">Faible</SelectItem><SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem><SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select></div>
          </div>
          <div><Label>Date / heure</Label>
            <Input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)}
              className="bg-white/5 border-white/10 text-white" /></div>
          <div><Label>Note</Label>
            <Textarea value={desc} onChange={e=>setDesc(e.target.value)} className="bg-white/5 border-white/10 text-white" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)} className="border-white/20 text-white hover:bg-white/5">Annuler</Button>
          <Button onClick={submit} disabled={create.isPending} className="bg-amber-500 text-black hover:bg-amber-400">Planifier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
