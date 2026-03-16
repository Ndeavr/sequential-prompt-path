import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropertySelect from "@/components/shared/PropertySelect";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hammer, Check, Sparkles, Camera, Phone, Mail, MessageSquare, Plus } from "lucide-react";
import { motion } from "framer-motion";

const URGENCY_OPTIONS = [
  { value: "low", label: "Faible — pas urgent" },
  { value: "normal", label: "Normal — dans les prochains mois" },
  { value: "high", label: "Élevé — dans les prochaines semaines" },
  { value: "critical", label: "Critique — immédiat" },
];

const TIMELINE_OPTIONS = [
  { value: "flexible", label: "Flexible" },
  { value: "1_month", label: "Sous 1 mois" },
  { value: "3_months", label: "Sous 3 mois" },
  { value: "6_months", label: "Sous 6 mois" },
  { value: "1_year", label: "Sous 1 an" },
];

const CONTACT_OPTIONS = [
  { value: "phone", label: "Téléphone", icon: Phone },
  { value: "email", label: "Courriel", icon: Mail },
  { value: "message", label: "Messagerie", icon: MessageSquare },
];

const ProjectNewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const { data: categories } = useServiceCategories();
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_id: "",
    category_id: "",
    subcategory: "",
    urgency: "normal",
    timeline: "flexible",
    budget_min: "",
    budget_max: "",
    preferred_contact: "phone",
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const selectedCategory = categories?.roots.find((c) => c.id === form.category_id);
  const subcategories = selectedCategory?.children ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.property_id) {
      toast.error("Sélectionnez une propriété.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("projects").insert({
        title: form.title,
        description: form.description || null,
        property_id: form.property_id,
        user_id: user.id,
        category_id: form.category_id || null,
        subcategory: form.subcategory || null,
        urgency: form.urgency,
        timeline: form.timeline,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        preferred_contact: form.preferred_contact,
      } as any).select("id").single();

      if (error) throw error;

      setCreated(data.id);
      toast.success("Projet créé ! Recherche d'entrepreneurs…");
      setTimeout(() => navigate(`/dashboard/projects/${data.id}/matches`), 1500);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Check className="h-8 w-8 text-primary" />
          </motion.div>
          <h2 className="text-lg font-semibold text-foreground">Projet créé</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Recherche d'entrepreneurs en cours…
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Nouveau projet"
        description="Décrivez les travaux que vous souhaitez réaliser"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hammer className="h-4 w-4 text-primary" />
            Détails du projet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Property */}
            <div className="space-y-2">
              <Label htmlFor="property">Propriété *</Label>
              {(properties ?? []).length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => navigate("/dashboard/properties/new")}
                >
                  <Plus className="h-4 w-4 text-primary" />
                  Ajouter une propriété
                </Button>
              ) : (
                <Select value={form.property_id} onValueChange={(v) => {
                  if (v === "__new__") {
                    navigate("/dashboard/properties/new");
                    return;
                  }
                  setForm((f) => ({ ...f, property_id: v }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {(properties ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-2 text-primary">
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une propriété
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Catégorie de travaux</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v, subcategory: "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {(categories?.roots ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            {subcategories.length > 0 && (
              <div className="space-y-2">
                <Label>Sous-catégorie</Label>
                <Select value={form.subcategory} onValueChange={(v) => setForm((f) => ({ ...f, subcategory: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Précisez le type de travaux" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((c) => (
                      <SelectItem key={c.id} value={c.name_fr}>{c.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre du projet *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                placeholder="Ex: Réfection de toiture"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Décrivez les travaux en détail…"
                rows={4}
              />
            </div>

            {/* Urgency + Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Échéancier</Label>
                <Select value={form.timeline} onValueChange={(v) => setForm((f) => ({ ...f, timeline: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget_min">Budget min ($)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={form.budget_min}
                  onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value }))}
                  placeholder="5 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Budget max ($)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={form.budget_max}
                  onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
                  placeholder="15 000"
                />
              </div>
            </div>

            {/* Contact preference */}
            <div className="space-y-2">
              <Label>Mode de contact préféré</Label>
              <div className="flex gap-2">
                {CONTACT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, preferred_contact: opt.value }))}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      form.preferred_contact === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Création…" : "Créer le projet et trouver des entrepreneurs"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ProjectNewPage;
