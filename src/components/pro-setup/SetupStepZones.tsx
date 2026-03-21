/**
 * Setup Step 3: Service areas / zones
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, MapPin, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const POPULAR_CITIES = [
  "Montréal", "Laval", "Longueuil", "Québec", "Gatineau",
  "Sherbrooke", "Trois-Rivières", "Lévis", "Terrebonne", "Saint-Jean-sur-Richelieu",
  "Repentigny", "Brossard", "Drummondville", "Saint-Jérôme", "Granby",
  "Blainville", "Saint-Hyacinthe", "Châteauguay", "Mascouche", "Rimouski",
];

interface Props {
  contractorId?: string;
  onNext: () => void;
  onBack: () => void;
}

export default function SetupStepZones({ contractorId, onNext, onBack }: Props) {
  const [zones, setZones] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [radius, setRadius] = useState(25);

  useEffect(() => {
    if (!contractorId) return;
    supabase.from("contractor_service_areas").select("city").eq("contractor_id", contractorId)
      .then(({ data }) => {
        if (data?.length) setZones(data.map((d: any) => d.city).filter(Boolean));
      });
  }, [contractorId]);

  const toggle = (city: string) => {
    setZones(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (trimmed && !zones.includes(trimmed)) {
      setZones(prev => [...prev, trimmed]);
      setCustom("");
    }
  };

  const handleSave = async () => {
    if (!contractorId || zones.length === 0) {
      toast.error("Sélectionnez au moins une zone.");
      return;
    }
    setSaving(true);

    await supabase.from("contractor_service_areas").delete().eq("contractor_id", contractorId);
    const payload = zones.map(city => ({
      contractor_id: contractorId,
      city_name: city,
      city_slug: city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"),
      radius_km: radius,
      is_primary: zones.indexOf(city) === 0,
    }));
    const { error } = await supabase.from("contractor_service_areas").insert(payload);
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success(`${zones.length} zone(s) enregistrée(s)`);
      onNext();
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <MapPin className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Zones desservies</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Où intervenez-vous? Sélectionnez vos villes de service.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Rayon: {radius} km</label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map(city => (
            <Badge
              key={city}
              variant={zones.includes(city) ? "default" : "outline"}
              className={`cursor-pointer text-xs py-1.5 px-3 transition-all ${
                zones.includes(city)
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/10 hover:border-accent/30"
              }`}
              onClick={() => toggle(city)}
            >
              {zones.includes(city) && <X className="h-3 w-3 mr-1" />}
              {city}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustom()}
            placeholder="Autre ville…"
            className="bg-background/50 flex-1"
          />
          <Button variant="outline" size="sm" onClick={addCustom} disabled={!custom.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {zones.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">{zones.length} zone(s) sélectionnée(s)</p>
            <div className="flex flex-wrap gap-1.5">
              {zones.map(z => (
                <Badge key={z} variant="secondary" className="text-xs gap-1">
                  <MapPin className="h-3 w-3" />
                  {z}
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggle(z)} />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
        <Button onClick={handleSave} disabled={saving || zones.length === 0} className="rounded-2xl px-6 gap-2 shadow-[var(--shadow-glow)]">
          {saving ? "Enregistrement…" : "Continuer"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
