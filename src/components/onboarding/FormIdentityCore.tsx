/**
 * UNPRO — Identity Core Form (shared by homeowner + contractor)
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormIdentityCoreProps {
  initialData?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  onSave: (data: { first_name: string; last_name: string; email: string; phone: string }) => void;
  loading?: boolean;
}

export default function FormIdentityCore({ initialData, onSave, loading }: FormIdentityCoreProps) {
  const [form, setForm] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const isValid = form.first_name.trim() && form.last_name.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Vos informations</h2>
        <p className="text-sm text-muted-foreground mt-1">Les essentiels pour commencer</p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Prénom"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className="h-11 rounded-xl"
          />
          <Input
            placeholder="Nom"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
        <Input
          type="email"
          placeholder="Courriel"
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
