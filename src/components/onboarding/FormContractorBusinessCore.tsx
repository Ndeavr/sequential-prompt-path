/**
 * UNPRO — Contractor Business Core Form (onboarding)
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormContractorBusinessCoreProps {
  initialData?: Record<string, any>;
  onSave: (data: Record<string, string>) => void;
  loading?: boolean;
}

export default function FormContractorBusinessCore({ initialData, onSave, loading }: FormContractorBusinessCoreProps) {
  const [form, setForm] = useState({
    company_name: initialData?.company_name || "",
    contact_name: initialData?.contact_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    main_category: initialData?.main_category || "",
    service_area: initialData?.service_area || "",
    team_size: initialData?.team_size || "",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const isValid = form.company_name.trim() && form.email.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre entreprise</h2>
        <p className="text-sm text-muted-foreground mt-1">Informations de base</p>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Nom de l'entreprise *"
          value={form.company_name}
          onChange={(e) => update("company_name", e.target.value)}
          className="h-11 rounded-xl"
        />
        <Input
          placeholder="Nom du contact"
          value={form.contact_name}
          onChange={(e) => update("contact_name", e.target.value)}
          className="h-11 rounded-xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="email"
            placeholder="Courriel *"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            type="tel"
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
        <Input
          placeholder="Site web"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
          className="h-11 rounded-xl"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Catégorie principale"
            value={form.main_category}
            onChange={(e) => update("main_category", e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="Zone desservie"
            value={form.service_area}
            onChange={(e) => update("service_area", e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
        <Input
          placeholder="Taille de l'équipe"
          value={form.team_size}
          onChange={(e) => update("team_size", e.target.value)}
          className="h-11 rounded-xl"
        />
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
