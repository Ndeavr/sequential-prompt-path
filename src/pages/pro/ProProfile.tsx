import { useState, useEffect } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContractorProfile, useUpsertContractorProfile } from "@/hooks/useContractor";
import { toast } from "sonner";

const ProProfile = () => {
  const { data: profile, isLoading } = useContractorProfile();
  const upsert = useUpsertContractorProfile();
  const [form, setForm] = useState({
    business_name: "", specialty: "", description: "", phone: "", email: "",
    website: "", address: "", city: "", province: "QC", postal_code: "",
    license_number: "", insurance_info: "", years_experience: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name || "",
        specialty: profile.specialty || "",
        description: profile.description || "",
        phone: profile.phone || "",
        email: profile.email || "",
        website: profile.website || "",
        address: profile.address || "",
        city: profile.city || "",
        province: profile.province || "QC",
        postal_code: profile.postal_code || "",
        license_number: profile.license_number || "",
        insurance_info: profile.insurance_info || "",
        years_experience: profile.years_experience?.toString() || "",
      });
    }
  }, [profile]);

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert.mutateAsync({
        ...form,
        years_experience: form.years_experience ? parseInt(form.years_experience) : undefined,
      });
      toast.success("Profil enregistré !");
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <ContractorLayout>
      <PageHeader title="Mon profil entrepreneur" description="Complétez votre profil pour être visible" />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input value={form.business_name} onChange={set("business_name")} required placeholder="Construction ABC" />
              </div>
              <div className="space-y-2">
                <Label>Spécialité</Label>
                <Input value={form.specialty} onChange={set("specialty")} placeholder="Rénovation, Plomberie…" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={set("description")} placeholder="Décrivez votre entreprise…" rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={set("phone")} placeholder="514-555-1234" /></div>
              <div className="space-y-2"><Label>Courriel</Label><Input value={form.email} onChange={set("email")} type="email" placeholder="info@abc.com" /></div>
            </div>
            <div className="space-y-2"><Label>Site web</Label><Input value={form.website} onChange={set("website")} placeholder="https://abc.com" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adresse</Label>
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
                />
              </div>
              <div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={set("city")} placeholder="Montréal" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Province</Label><Input value={form.province} onChange={set("province")} /></div>
              <div className="space-y-2"><Label>Code postal</Label><Input value={form.postal_code} onChange={set("postal_code")} /></div>
              <div className="space-y-2"><Label>Années d'expérience</Label><Input type="number" value={form.years_experience} onChange={set("years_experience")} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Numéro de licence</Label><Input value={form.license_number} onChange={set("license_number")} /></div>
              <div className="space-y-2"><Label>Info assurance</Label><Input value={form.insurance_info} onChange={set("insurance_info")} /></div>
            </div>
            <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>
    </ContractorLayout>
  );
};

export default ProProfile;
