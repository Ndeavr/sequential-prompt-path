import { useState, useEffect } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GooglePlacesInput from "@/components/property/GooglePlacesInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractorProfile, useUpsertContractorProfile } from "@/hooks/useContractor";
import { toast } from "sonner";
import { RbqStatusBadge } from "@/features/compliance/RbqStatusBadge";
import { getRbqCompliance, type RbqStatus } from "@/lib/compliance/rbqStatus";

const ProProfile = () => {
  const { data: profile, isLoading } = useContractorProfile();
  const upsert = useUpsertContractorProfile();
  const [form, setForm] = useState({
    business_name: "", specialty: "", description: "", phone: "", email: "",
    website: "", address: "", city: "", province: "QC", postal_code: "",
    license_number: "", insurance_info: "", years_experience: "",
    rbq_number: "", rbq_compliance_status: "not_provided" as RbqStatus, rbq_expiry_date: "",
  });

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setForm({
        business_name: p.business_name || "",
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

  const currentCompliance = getRbqCompliance({
    rbq_compliance_status: form.rbq_compliance_status,
    rbq_expiry_date: form.rbq_expiry_date || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Contractor may only self-declare "not_provided" or "in_progress".
      // "verified" and "expired" are admin/system controlled.
      const submitStatus: RbqStatus =
        form.rbq_compliance_status === "verified" || form.rbq_compliance_status === "expired"
          ? (profile as any)?.rbq_compliance_status || "in_progress"
          : form.rbq_compliance_status;
      await upsert.mutateAsync({
        ...form,
        years_experience: form.years_experience ? parseInt(form.years_experience) : undefined,
        rbq_compliance_status: submitStatus,
        rbq_expiry_date: form.rbq_expiry_date || null,
      });
      toast.success("Profil enregistré !");
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const currentDbStatus = (profile as any)?.rbq_compliance_status as RbqStatus | undefined;
  const statusLocked = currentDbStatus === "verified" || currentDbStatus === "expired";

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
              <div className="space-y-2"><Label>Info assurance</Label><Input value={form.insurance_info} onChange={set("insurance_info")} /></div>
              <div className="space-y-2"><Label>Numéro de licence (autre)</Label><Input value={form.license_number} onChange={set("license_number")} /></div>
            </div>

            {/* RBQ Compliance Block */}
            <div className="rounded-lg border border-border/50 p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Licence RBQ (Régie du bâtiment du Québec)</h3>
                  <p className="text-xs text-muted-foreground">Obligatoire pour la plupart des travaux résidentiels au Québec.</p>
                </div>
                <RbqStatusBadge
                  status={currentCompliance.status}
                  expiryDate={form.rbq_expiry_date || null}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Numéro RBQ</Label>
                  <Input value={form.rbq_number} onChange={set("rbq_number")} placeholder="1234-5678-90" />
                </div>
                <div className="space-y-2">
                  <Label>Statut RBQ</Label>
                  <Select
                    value={form.rbq_compliance_status}
                    onValueChange={(v: RbqStatus) => setForm((f) => ({ ...f, rbq_compliance_status: v }))}
                    disabled={statusLocked}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_provided">Non fournie</SelectItem>
                      <SelectItem value="in_progress">En cours d'obtention</SelectItem>
                      {statusLocked && (
                        <SelectItem value={currentDbStatus!} disabled>
                          {currentDbStatus === "verified" ? "Vérifiée (validée par UNPRO)" : "Expirée / invalide"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date d'expiration</Label>
                  <Input type="date" value={form.rbq_expiry_date} onChange={set("rbq_expiry_date")} />
                </div>
              </div>
              {statusLocked && (
                <p className="text-[11px] text-muted-foreground">
                  Le statut « Vérifiée » et « Expirée » est contrôlé par l'équipe UNPRO. Contactez-nous pour toute correction.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {currentCompliance.badge.explanationFr}
              </p>
            </div>

            <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </form>
        </CardContent>
      </Card>
    </ContractorLayout>
  );
};

export default ProProfile;
