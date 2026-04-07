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
import { Switch } from "@/components/ui/switch";
import { User, Eye, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

export default function StepProfileBuilder({ state, updateState, addEvent }: Props) {
  const [form, setForm] = useState({
    company_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    website: "",
    description: "",
    short_description: "",
    slug: "",
    years_experience: "",
    team_size: "",
    languages: "fr",
    service_radius_km: "50",
    license_rbq: "",
    license_neq: "",
  });

  // Load existing data
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
        company_name: contractor.company_name || "",
        contact_email: contractor.contact_email || "",
        contact_phone: contractor.contact_phone || "",
        city: contractor.city || "",
        website: contractor.website || "",
        description: contractor.description || "",
        short_description: contractor.short_description || "",
        slug: contractor.slug || "",
        years_experience: contractor.years_experience?.toString() || "",
        team_size: contractor.team_size?.toString() || "",
        languages: contractor.languages || "fr",
        service_radius_km: contractor.service_radius_km?.toString() || "50",
        license_rbq: contractor.license_rbq || "",
        license_neq: contractor.license_neq || "",
      });
    }
  }, [contractor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const { error } = await supabase
        .from("contractors")
        .update({
          company_name: form.company_name,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          city: form.city || null,
          website: form.website || null,
          description: form.description || null,
          short_description: form.short_description || null,
          slug,
          years_experience: form.years_experience ? Number(form.years_experience) : null,
          team_size: form.team_size ? Number(form.team_size) : null,
          languages: form.languages || null,
          service_radius_km: form.service_radius_km ? Number(form.service_radius_km) : null,
          license_rbq: form.license_rbq || null,
          license_neq: form.license_neq || null,
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
    const fields = [form.company_name, form.contact_email, form.contact_phone, form.city, form.description, form.short_description];
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

      {/* Profile form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Nom de l'entreprise *</Label>
                  <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Slug public</Label>
                  <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="auto-généré" />
                </div>
                <div>
                  <Label>Courriel *</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} />
                </div>
                <div>
                  <Label>Téléphone *</Label>
                  <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Ville *</Label>
                  <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Détails entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Description courte</Label>
                <Input value={form.short_description} onChange={e => setForm(p => ({ ...p, short_description: e.target.value }))} placeholder="En une phrase..." />
              </div>
              <div>
                <Label>Description complète *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Années exp.</Label>
                  <Input type="number" value={form.years_experience} onChange={e => setForm(p => ({ ...p, years_experience: e.target.value }))} />
                </div>
                <div>
                  <Label>Taille équipe</Label>
                  <Input type="number" value={form.team_size} onChange={e => setForm(p => ({ ...p, team_size: e.target.value }))} />
                </div>
                <div>
                  <Label>Rayon (km)</Label>
                  <Input type="number" value={form.service_radius_km} onChange={e => setForm(p => ({ ...p, service_radius_km: e.target.value }))} />
                </div>
                <div>
                  <Label>Langues</Label>
                  <Input value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Licenses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Licences et identifiants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Numéro RBQ</Label>
                  <Input value={form.license_rbq} onChange={e => setForm(p => ({ ...p, license_rbq: e.target.value }))} />
                </div>
                <div>
                  <Label>Numéro NEQ</Label>
                  <Input value={form.license_neq} onChange={e => setForm(p => ({ ...p, license_neq: e.target.value }))} />
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
                  <h3 className="font-semibold">{form.company_name || "Nom de l'entreprise"}</h3>
                  <p className="text-sm text-muted-foreground">{form.short_description || "Description courte..."}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.city && <Badge variant="outline" className="text-xs">{form.city}</Badge>}
                  {form.years_experience && <Badge variant="outline" className="text-xs">{form.years_experience} ans</Badge>}
                  {form.license_rbq && <Badge variant="outline" className="text-xs">RBQ ✓</Badge>}
                </div>
                {form.description && (
                  <p className="text-xs text-muted-foreground line-clamp-4">{form.description}</p>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Slug: /{form.slug || form.company_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "..."}
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
