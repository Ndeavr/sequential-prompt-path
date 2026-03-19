import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUpdateProperty } from "@/hooks/usePropertyPassport";
import type { Property } from "@/types/property";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

const PROPERTY_TYPES = [
  { value: "unifamiliale", label: "Maison unifamiliale" },
  { value: "condo", label: "Condo / Copropriété" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "cottage", label: "Cottage" },
  { value: "bungalow", label: "Bungalow" },
  { value: "multilogement", label: "Multilogement" },
];

export default function EditPropertyDialog({
  property,
  onUpdated,
}: {
  property: Property;
  onUpdated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateProperty();
  const [form, setForm] = useState({
    address: property.address,
    city: property.city || "",
    province: property.province || "",
    postal_code: property.postal_code || "",
    property_type: property.property_type || "",
    year_built: property.year_built?.toString() || "",
    square_footage: property.square_footage?.toString() || "",
    lot_size: property.lot_size?.toString() || "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        id: property.id,
        address: form.address,
        city: form.city || null,
        province: form.province || null,
        postal_code: form.postal_code || null,
        property_type: form.property_type || null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        square_footage: form.square_footage ? parseInt(form.square_footage) : null,
        lot_size: form.lot_size ? parseInt(form.lot_size) : null,
      });
      toast.success("Propriété mise à jour !");
      setOpen(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la propriété</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input value={form.address} onChange={set("address")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-1.5">
              <Label>Province</Label>
              <Input value={form.province} onChange={set("province")} />
            </div>
            <div className="space-y-1.5">
              <Label>Code postal</Label>
              <Input value={form.postal_code} onChange={set("postal_code")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année</Label>
              <Input type="number" value={form.year_built} onChange={set("year_built")} />
            </div>
            <div className="space-y-1.5">
              <Label>Superficie (pi²)</Label>
              <Input type="number" value={form.square_footage} onChange={set("square_footage")} />
            </div>
            <div className="space-y-1.5">
              <Label>Terrain (pi²)</Label>
              <Input type="number" value={form.lot_size} onChange={set("lot_size")} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
