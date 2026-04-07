/**
 * Step 1 — Recherche / Création d'entreprise
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Building2, CheckCircle2, MapPin, Phone, Globe } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

export default function StepEntrepriseSearch({ state, updateState, addEvent }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCompany, setNewCompany] = useState({
    company_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    website: "",
  });

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ["admin-contractor-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from("contractors")
        .select("id, company_name, contact_email, contact_phone, city, website, aipp_score, admin_verified, profile_completion_score")
        .or(`company_name.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,website.ilike.%${searchTerm}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const handleSelect = (contractor: any) => {
    updateState({
      contractorId: contractor.id,
      contractorData: contractor,
    });
    addEvent("contractor_selected", `Contractor: ${contractor.company_name} (${contractor.id})`);
    toast.success(`${contractor.company_name} sélectionné`);
  };

  const handleCreate = async () => {
    if (!newCompany.company_name) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    const { data, error } = await supabase
      .from("contractors")
      .insert({
        company_name: newCompany.company_name,
        contact_email: newCompany.contact_email || null,
        contact_phone: newCompany.contact_phone || null,
        city: newCompany.city || null,
        website: newCompany.website || null,
        onboarding_source: "admin_activation",
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
      return;
    }

    updateState({ contractorId: data.id, contractorData: data });
    addEvent("contractor_created", `Nouveau: ${data.company_name} (${data.id})`);
    toast.success("Entreprise créée avec succès");
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Rechercher ou créer une entreprise</h2>
        <p className="text-sm text-muted-foreground">
          Recherchez par nom, courriel, téléphone, ville ou site web
        </p>
      </div>

      {/* Selected contractor banner */}
      {state.contractorId && state.contractorData && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{state.contractorData.company_name}</p>
                <p className="text-xs text-muted-foreground">{state.contractorData.city} · {state.contractorData.contact_email}</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-300">Sélectionné</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Recherche d'entreprise
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nom, courriel, téléphone, ville, site web..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => refetch()}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Recherche...</p>}

          {results && results.length > 0 && (
            <div className="space-y-2">
              {results.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                    state.contractorId === c.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.company_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {c.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>}
                        {c.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.contact_phone}</span>}
                        {c.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Site</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.admin_verified && <Badge className="bg-green-100 text-green-800 text-xs">Vérifié</Badge>}
                      {c.aipp_score && <Badge variant="outline" className="text-xs">AIPP {c.aipp_score}</Badge>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.length === 0 && searchTerm.length >= 2 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Aucun résultat trouvé</p>
              <Button variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une nouvelle entreprise
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create new */}
      {(showCreate || (!state.contractorId && searchTerm.length < 2)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Créer une entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nom de l'entreprise *</Label>
                <Input
                  value={newCompany.company_name}
                  onChange={e => setNewCompany(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="Ex: Plomberie Laval Inc."
                />
              </div>
              <div>
                <Label>Courriel</Label>
                <Input
                  type="email"
                  value={newCompany.contact_email}
                  onChange={e => setNewCompany(p => ({ ...p, contact_email: e.target.value }))}
                  placeholder="info@entreprise.com"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={newCompany.contact_phone}
                  onChange={e => setNewCompany(p => ({ ...p, contact_phone: e.target.value }))}
                  placeholder="514-555-1234"
                />
              </div>
              <div>
                <Label>Ville</Label>
                <Input
                  value={newCompany.city}
                  onChange={e => setNewCompany(p => ({ ...p, city: e.target.value }))}
                  placeholder="Montréal"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Site web</Label>
                <Input
                  value={newCompany.website}
                  onChange={e => setNewCompany(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://www.entreprise.com"
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full sm:w-auto">
              <Building2 className="h-4 w-4 mr-2" />
              Créer l'entreprise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
