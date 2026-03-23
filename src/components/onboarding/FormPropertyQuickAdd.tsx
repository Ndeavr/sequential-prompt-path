/**
 * UNPRO — Quick Property Add Form (homeowner onboarding step 2)
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PROPERTY_TYPES = [
  { value: "maison", label: "Maison" },
  { value: "condo", label: "Condo" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "multilogement", label: "Multilogement" },
  { value: "chalet", label: "Chalet" },
  { value: "commercial", label: "Commercial" },
];

interface FormPropertyQuickAddProps {
  onSave: (data: {
    address_line_1: string;
    city: string;
    postal_code: string;
    property_type: string;
  }) => void;
  loading?: boolean;
}

export default function FormPropertyQuickAdd({ onSave, loading }: FormPropertyQuickAddProps) {
  const [form, setForm] = useState({
    address_line_1: "",
    city: "",
    postal_code: "",
    property_type: "",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const isValid = form.address_line_1.trim() && form.city.trim() && form.property_type;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre propriété</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajoutez votre adresse pour commencer</p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Adresse"
          value={form.address_line_1}
          onChange={(e) => update("address_line_1", e.target.value)}
          className="h-11 rounded-xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Ville"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="Code postal"
            value={form.postal_code}
            onChange={(e) => update("postal_code", e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => update("property_type", pt.value)}
              className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                form.property_type === pt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onSave(form)}
        disabled={!isValid || loading}
        className="w-full h-11 rounded-xl"
      >
        {loading ? "Enregistrement…" : "Continuer"}
      </Button>
    </div>
  );
}
