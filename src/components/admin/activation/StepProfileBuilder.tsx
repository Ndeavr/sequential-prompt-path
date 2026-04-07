/**
 * Step 3 — Profile Construction + Live Preview
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

export default function StepProfileBuilder({ state, updateState, addEvent }: Props) {
  const [form, setForm] = useState({
    business_name: "",
    legal_name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    postal_code: "",
    province: "QC",
    website: "",
    description: "",
    slug: "",
    years_experience: "",
    specialty: "",
    rbq_number: "",
    neq: "",
    license_number: "",
  });

  const { data: contractor } = useQuery({
    queryKey: ["admin-contractor-profile", state.contractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", state.contractorId!)
        .single();
      return data;
    },
    enabled: !!state.contractorId,
  });

  useEffect(() => {
    if (contractor) {
      setForm({
        business_name: contractor.business_name || "",
        legal_name: contractor.legal_name || "",
        email: contractor.email || "",
        phone: contractor.phone || "",
        city: contractor.city || "",
        address: contractor.address || "",
        postal_code: contractor.postal_code || "",
        province: contractor.province || "QC",
        website: contractor.website || "",
        description: contractor.description || "",
        slug: contractor.slug || "",
        years_experience: contractor.years_experience?.toString() || "",
        specialty: contractor.specialty || "",
        rbq_number: contractor.rbq_number || "",
        neq: contractor.neq || "",
        license_number: contractor.license_number || "",
      });
    }
  }, [contractor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const { error } = await supabase
        .from("contractors")
        .update({
          business_name: form.business_name,
          legal_name: form.legal_name || null,
          email: form.email || null,
          phone: form.phone || null,
          city: form.city || null,
          address: form.address || null,
          postal_code: form.postal_code || null,
          province: form.province || null,
          website: form.website || null,
          description: form.description || null,
          slug,
          years_experience: form.years_experience ? Number(form.years_experience) : null,
          specialty: form.specialty || null,
          rbq_number: form.rbq_number || null,
          neq: form.neq || null,
          license_number: form.license_number || null,
        })
        .eq("id", state.contractorId!);
      if (error) throw error;
    },
    onSuccess: () => {
      updateState({ profileComplete: true });
      addEvent("profile_saved", "Profil mis à jour");
      toast.success("Profil sauvegardé");
    },
    onError: () => toast.error("Erreur de sauvegarde"),
  });

  const completeness = (() => {
    const fields = [form.business_name, form.email, form.phone, form.city, form.description, form.specialty];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Construction du profil</h2>
          <p className="text-sm text-muted-foreground">Complétez les informations de l'entrepreneur</p>
        </div>
        <Badge variant={completeness >= 80 ? "default" : "secondary"} className="text-sm">
          {completeness}% complet
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nom commercial *</Label>
                  <Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Nom légal</Label>
                  <Input value={form.legal_name} onChange={e => setForm(p => ({ ...p, legal_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Slug public</Label>
                  <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="auto-généré" />
                </div>
                <div>
                  <Label>Spécialité</Label>
                  <Input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Plomberie, Électricité..." />
                </div>
                <div>
                  <Label>Courriel *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adresse et couverture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <Label>Ville *</Label>
                  <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label>Province</Label>
                  <Input value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))} />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input value={form.postal_code} onChange={e => setForm(p => ({ ...p, postal_code: e.target.value }))} />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Détails & Licences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Années exp.</Label>
                  <Input type="number" value={form.years_experience} onChange={e => setForm(p => ({ ...p, years_experience: e.target.value }))} />
                </div>
                <div>
                  <Label>RBQ</Label>
                  <Input value={form.rbq_number} onChange={e => setForm(p => ({ ...p, rbq_number: e.target.value }))} />
                </div>
                <div>
                  <Label>NEQ</Label>
                  <Input value={form.neq} onChange={e => setForm(p => ({ ...p, neq: e.target.value }))} />
                </div>
                <div>
                  <Label>Licence</Label>
                  <Input value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder le profil
          </Button>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-32">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Aperçu public
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{form.business_name || "Nom de l'entreprise"}</h3>
                  <p className="text-sm text-muted-foreground">{form.specialty || "Spécialité..."}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.city && <Badge variant="outline" className="text-xs">{form.city}</Badge>}
                  {form.years_experience && <Badge variant="outline" className="text-xs">{form.years_experience} ans</Badge>}
                  {form.rbq_number && <Badge variant="outline" className="text-xs">RBQ ✓</Badge>}
                </div>
                {form.description && (
                  <p className="text-xs text-muted-foreground line-clamp-4">{form.description}</p>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Slug: /{form.slug || form.business_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
