import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProperty } from "@/hooks/usePropertyPassport";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AddressVerifiedInput from "@/components/address/AddressVerifiedInput";
import { emptyAddress, isVerified, type VerifiedAddress } from "@/types/address";

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
  const [address, setAddress] = useState<VerifiedAddress>(emptyAddress());
  const [form, setForm] = useState({
    property_type: "",
    year_built: "",
    square_footage: "",
    lot_size: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isVerified(address)) {
      toast.error("Veuillez sélectionner une adresse vérifiée dans la liste.");
      return;
    }

    try {
      const fullAddress = address.unit
        ? `${address.streetNumber} ${address.streetName}, app. ${address.unit}, ${address.city}, ${address.province} ${address.postalCode}`
        : address.fullAddress;

      const data = await create.mutateAsync({
        address: fullAddress,
        city: address.city || undefined,
        province: address.province || undefined,
        postal_code: address.postalCode || undefined,
        country: address.country || "CA",
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
      <AddressVerifiedInput
        value={address}
        onChange={setAddress}
        label="Adresse"
        required
      />

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
        <Button type="submit" disabled={create.isPending || !isVerified(address)}>
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
