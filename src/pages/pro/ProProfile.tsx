import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SetupStepPhotos from "@/components/pro-setup/SetupStepPhotos";
import { useContractorProfile, useUpsertContractorProfile } from "@/hooks/useContractor";
import { toast } from "sonner";
import { RbqStatusBadge } from "@/features/compliance/RbqStatusBadge";
import { getRbqCompliance, type RbqStatus } from "@/lib/compliance/rbqStatus";
import type { Tables } from "@/integrations/supabase/types";
import RbqSituationSelector from "@/components/compliance/RbqSituationSelector";
import { useQueryClient } from "@tanstack/react-query";

const ProProfile = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = useContractorProfile();
  const upsert = useUpsertContractorProfile();
  const hydrated = useRef<string | null>(null);
  const [form, setForm] = useState({
    business_name: "", legal_name: "", neq: "", specialty: "", description: "", phone: "", email: "",
    website: "", address: "", city: "", province: "QC", postal_code: "",
    license_number: "", insurance_info: "", years_experience: "",
    rbq_number: "", rbq_compliance_status: "not_provided" as RbqStatus, rbq_expiry_date: "",
  });

  useEffect(() => {
    if (profile && hydrated.current !== profile.id) {
      hydrated.current = profile.id;
      const p: Tables<"contractors"> = profile;
      setForm({
        business_name: p.business_name || "",
        legal_name: p.legal_name || "",
        neq: p.neq || "",
        specialty: p.specialty || "",
        description: p.description || "",
        phone: p.phone || "",
        email: p.email || "",
        website: p.website || "",
        address: p.address || "",
        city: p.city || "",
        province: p.province || "QC",
        postal_code: p.postal_code || "",
        license_number: p.license_number || "",
        insurance_info: p.insurance_info || "",
        years_experience: p.years_experience?.toString() || "",
        rbq_number: p.rbq_number || "",
        rbq_compliance_status: (p.rbq_compliance_status as RbqStatus) || "not_provided",
        rbq_expiry_date: p.rbq_expiry_date || "",
      });
    }
  }, [profile]);

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  if (isError) return <ContractorLayout><p role="alert">Impossible de charger votre profil.</p><Button onClick={() => void refetch()}>Réessayer</Button></ContractorLayout>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.neq && !/^\d{10}$/.test(form.neq.replace(/\s/g, ""))) {
      toast.error("Le NEQ doit contenir exactement 10 chiffres."); return;
    }
    try {
      // RBQ fields are saved only by RbqSituationSelector (DB refuses self-verification).
      const { rbq_number: _n, rbq_compliance_status: _s, rbq_expiry_date: _x, ...rest } = form;
      const savedProfile = await upsert.mutateAsync({
        ...rest,
        business_name: form.business_name.trim(),
        neq: form.neq.replace(/\s/g, ""),
        years_experience: form.years_experience ? parseInt(form.years_experience) : undefined,
      });
      toast.success("Profil enregistré !");
      navigate(`/pro/profile/public/${savedProfile.id}`, { replace: true, state: { saved: true } });
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
        <CardContent className="pt-6 space-y-6">
          <SetupStepPhotos contractorId={profile?.id} embedded />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Nom de l'entreprise *</Label>
                <Input id="business_name" value={form.business_name} onChange={set("business_name")} required placeholder="Construction ABC" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Spécialité</Label>
                <Input id="specialty" value={form.specialty} onChange={set("specialty")} placeholder="Rénovation, Plomberie…" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="legal_name">Nom légal</Label><Input id="legal_name" value={form.legal_name} onChange={set("legal_name")} /></div>
              <div className="space-y-2"><Label htmlFor="neq">NEQ</Label><Input id="neq" inputMode="numeric" value={form.neq} onChange={set("neq")} placeholder="10 chiffres" /><p className="text-xs text-muted-foreground">Numéro déclaré. La validation au registre est distincte.</p></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={set("description")} placeholder="Décrivez votre entreprise…" rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.phone} onChange={set("phone")} placeholder="514-555-1234" /></div>
              <div className="space-y-2"><Label htmlFor="email">Courriel</Label><Input id="email" value={form.email} onChange={set("email")} type="email" placeholder="info@abc.com" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="website">Site web</Label><Input id="website" type="url" value={form.website} onChange={set("website")} placeholder="https://abc.com" /></div>
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
              <div className="space-y-2"><Label htmlFor="city">Ville</Label><Input id="city" value={form.city} onChange={set("city")} placeholder="Montréal" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label htmlFor="province">Province</Label><Input id="province" value={form.province} onChange={set("province")} /></div>
              <div className="space-y-2"><Label htmlFor="postal_code">Code postal</Label><Input id="postal_code" value={form.postal_code} onChange={set("postal_code")} /></div>
              <div className="space-y-2"><Label>Années d'expérience</Label><Input type="number" value={form.years_experience} onChange={set("years_experience")} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="insurance_info">Info assurance</Label><Input id="insurance_info" value={form.insurance_info} onChange={set("insurance_info")} /></div>
              <div className="space-y-2"><Label htmlFor="license_number">Numéro de licence (autre)</Label><Input id="license_number" value={form.license_number} onChange={set("license_number")} /></div>
            </div>

            {/* RBQ — 5 choix (auto-déclaration), vérification par UNPRO */}
            <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-muted/20" id="rbq">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold">Licence RBQ (Régie du bâtiment du Québec)</h3>
                <RbqStatusBadge status={getRbqCompliance(profile ?? {}).status} expiryDate={profile?.rbq_expiry_date || null} />
              </div>
              <RbqSituationSelector
                profile={profile}
                onSaved={() => qc.invalidateQueries({ queryKey: ["contractor-profile"] })}
              />
            </div>

            <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>
    </ContractorLayout>
  );
};

export default ProProfile;
