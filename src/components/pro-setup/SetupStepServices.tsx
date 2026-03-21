/**
 * Setup Step 2: Services & specialties
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Wrench, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SUGGESTED_SERVICES = [
  "Toiture", "Isolation", "Plomberie", "Électricité", "CVC / Chauffage",
  "Fenêtres & Portes", "Fondation", "Drainage", "Peinture", "Rénovation générale",
  "Menuiserie", "Maçonnerie", "Plancher", "Béton", "Ébénisterie",
  "Revêtement extérieur", "Aménagement paysager", "Excavation",
];

interface Props {
  contractorId?: string;
  onNext: () => void;
  onBack: () => void;
}

export default function SetupStepServices({ contractorId, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!contractorId) return;
    supabase.from("contractor_services").select("service_name").eq("contractor_id", contractorId).eq("is_active", true)
      .then(({ data }) => {
        if (data?.length) setSelected(data.map((d: any) => d.service_name));
      });
  }, [contractorId]);

  const toggle = (s: string) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected(prev => [...prev, trimmed]);
      setCustom("");
    }
  };

  const handleSave = async () => {
    if (!contractorId || selected.length === 0) {
      toast.error("Sélectionnez au moins un service.");
      return;
    }
    setSaving(true);

    // Delete existing then insert
    await supabase.from("contractor_services").delete().eq("contractor_id", contractorId);
    const payload = selected.map((s, i) => ({
      contractor_id: contractorId,
      service_name_fr: s,
      service_slug: s.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      service_type: i === 0 ? "primary" : "secondary",
      is_active: true,
      is_primary: i === 0,
    }));
    const { error } = await supabase.from("contractor_services").insert(payload);
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(`${selected.length} service(s) enregistré(s)`);
      onNext();
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
          <Wrench className="h-7 w-7 text-secondary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Vos services</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Sélectionnez les services que vous offrez. Le premier sera votre spécialité principale.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_SERVICES.map(s => (
            <Badge
              key={s}
              variant={selected.includes(s) ? "default" : "outline"}
              className={`cursor-pointer text-xs py-1.5 px-3 transition-all ${
                selected.includes(s)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-primary/10 hover:border-primary/30"
              }`}
              onClick={() => toggle(s)}
            >
              {selected.includes(s) && <X className="h-3 w-3 mr-1" />}
              {s}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustom()}
            placeholder="Autre service…"
            className="bg-background/50 flex-1"
          />
          <Button variant="outline" size="sm" onClick={addCustom} disabled={!custom.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {selected.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">{selected.length} service(s) sélectionné(s)</p>
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s, i) => (
                <Badge key={s} variant="secondary" className="text-xs gap-1">
                  {i === 0 && <span className="text-primary font-bold">★</span>}
                  {s}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggle(s)} />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
        <Button onClick={handleSave} disabled={saving || selected.length === 0} className="rounded-2xl px-6 gap-2 shadow-[var(--shadow-glow)]">
          {saving ? "Enregistrement…" : "Continuer"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
