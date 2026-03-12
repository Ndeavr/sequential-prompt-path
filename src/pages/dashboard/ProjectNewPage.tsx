import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Hammer, Check } from "lucide-react";
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

const ProjectNewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const [form, setForm] = useState({
    title: "",
    description: "",
    property_id: "",
    urgency: "normal",
    timeline: "flexible",
    budget_min: "",
    budget_max: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.property_id) {
      toast.error("Sélectionnez une propriété.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("projects").insert({
        title: form.title,
        description: form.description || null,
        property_id: form.property_id,
        user_id: user.id,
        urgency: form.urgency,
        timeline: form.timeline,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
      });

      if (error) throw error;

      setCreated(true);
      toast.success("Projet créé avec succès !");
      setTimeout(() => navigate("/dashboard"), 1500);
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
          <p className="text-sm text-muted-foreground">Redirection en cours…</p>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property">Propriété *</Label>
              <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une propriété" />
                </SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Urgence</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Création…" : "Créer le projet"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ProjectNewPage;
