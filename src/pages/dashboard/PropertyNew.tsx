import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateProperty } from "@/hooks/useProperties";
import { toast } from "sonner";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";

const PropertyNew = () => {
  const navigate = useNavigate();
  const createProperty = useCreateProperty();
  const [form, setForm] = useState({ address: "", city: "", province: "QC", postal_code: "", property_type: "", year_built: "", square_footage: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProperty.mutateAsync({
        address: form.address,
        city: form.city || undefined,
        province: form.province || undefined,
        postal_code: form.postal_code || undefined,
        property_type: form.property_type || undefined,
        year_built: form.year_built ? parseInt(form.year_built) : undefined,
        square_footage: form.square_footage ? parseInt(form.square_footage) : undefined,
      });
      toast.success("Propriété ajoutée !");
      navigate("/dashboard/properties");
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <DashboardLayout>
      <PageHeader title="Nouvelle propriété" description="Ajoutez une propriété à votre compte" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={form.city} onChange={set("city")} placeholder="Montréal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input id="province" value={form.province} onChange={set("province")} placeholder="QC" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input id="postal_code" value={form.postal_code} onChange={set("postal_code")} placeholder="H2X 1Y4" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="triplex">Triplex</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year_built">Année de construction</Label>
                <Input id="year_built" type="number" value={form.year_built} onChange={set("year_built")} placeholder="1990" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="square_footage">Superficie (pi²)</Label>
                <Input id="square_footage" type="number" value={form.square_footage} onChange={set("square_footage")} placeholder="1200" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createProperty.isPending}>{createProperty.isPending ? "Ajout…" : "Ajouter la propriété"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default PropertyNew;
