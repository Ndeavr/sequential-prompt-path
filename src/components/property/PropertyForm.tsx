import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateProperty } from "@/hooks/usePropertyPassport";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";

const PROPERTY_TYPES = [
  { value: "unifamiliale", label: "Maison unifamiliale" },
  { value: "condo", label: "Condo / Copropriété" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "cottage", label: "Cottage" },
  { value: "bungalow", label: "Bungalow" },
  { value: "multilogement", label: "Multilogement" },
];

export default function PropertyForm() {
  const navigate = useNavigate();
  const create = useCreateProperty();
  const [form, setForm] = useState({
    address: "",
    city: "",
    province: "QC",
    postal_code: "",
    country: "CA",
    property_type: "",
    year_built: "",
    square_footage: "",
    lot_size: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim()) {
      toast.error("L'adresse est requise.");
      return;
    }

    try {
      const data = await create.mutateAsync({
        address: form.address,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        country: form.country || undefined,
        property_type: form.property_type || undefined,
        year_built: form.year_built ? parseInt(form.year_built) : undefined,
        square_footage: form.square_footage ? parseInt(form.square_footage) : undefined,
        lot_size: form.lot_size ? parseInt(form.lot_size) : undefined,
      });
      toast.success("Propriété créée !");
      navigate(`/dashboard/properties/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Address section */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Adresse *</Label>
          <GooglePlacesInput
            value={form.address}
            onChange={(v) => setForm((f) => ({ ...f, address: v }))}
            onPlaceSelect={(place) => {
              setForm((f) => ({
                ...f,
                address: place.address,
                city: place.city || f.city,
                postal_code: place.postalCode || f.postal_code,
              }));
            }}
            placeholder="123 rue Principale"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Ville</Label>
            <Input value={form.city} onChange={set("city")} placeholder="Montréal" />
          </div>
          <div className="space-y-1.5">
            <Label>Province</Label>
            <Input value={form.province} onChange={set("province")} placeholder="QC" />
          </div>
          <div className="space-y-1.5">
            <Label>Code postal</Label>
            <Input value={form.postal_code} onChange={set("postal_code")} placeholder="H2X 1Y4" />
          </div>
        </div>
      </div>

      {/* Property details */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Caractéristiques
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type de propriété</Label>
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
            <Label>Année de construction</Label>
            <Input type="number" value={form.year_built} onChange={set("year_built")} placeholder="1990" />
          </div>
          <div className="space-y-1.5">
            <Label>Superficie (pi²)</Label>
            <Input type="number" value={form.square_footage} onChange={set("square_footage")} placeholder="1 200" />
          </div>
          <div className="space-y-1.5">
            <Label>Terrain (pi²)</Label>
            <Input type="number" value={form.lot_size} onChange={set("lot_size")} placeholder="5 000" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Création...</>
          ) : (
            "Créer la propriété"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
