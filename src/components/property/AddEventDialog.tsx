import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreatePropertyEvent } from "@/hooks/usePropertyPassport";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

const EVENT_TYPES = [
  { value: "renovation", label: "Rénovation" },
  { value: "inspection", label: "Inspection" },
  { value: "maintenance", label: "Entretien" },
  { value: "roof_renovation", label: "Toiture" },
  { value: "electrical_upgrade", label: "Mise à niveau électrique" },
  { value: "plumbing_upgrade", label: "Plomberie" },
  { value: "humidity_issue", label: "Problème d'humidité" },
  { value: "purchase", label: "Achat" },
  { value: "emergency", label: "Urgence" },
  { value: "other", label: "Autre" },
];

export default function AddEventDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const createEvent = useCreatePropertyEvent();
  const [form, setForm] = useState({
    event_type: "",
    title: "",
    description: "",
    event_date: "",
    cost: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.event_type) {
      toast.error("Le type et le titre sont requis.");
      return;
    }

    try {
      await createEvent.mutateAsync({
        property_id: propertyId,
        event_type: form.event_type,
        title: form.title,
        description: form.description || undefined,
        event_date: form.event_date || undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
      });
      toast.success("Événement ajouté !");
      setForm({ event_type: "", title: "", description: "", event_date: "", cost: "" });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ajout.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter un événement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={set("title")} placeholder="Ex: Réfection toiture partielle" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={set("description")} placeholder="Détails des travaux..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.event_date} onChange={set("event_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Coût ($)</Label>
              <Input type="number" value={form.cost} onChange={set("cost")} placeholder="0" />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
