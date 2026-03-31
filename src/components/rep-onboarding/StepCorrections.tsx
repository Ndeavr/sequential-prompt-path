import { motion } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { SeedData } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  seed: SeedData;
  importedData: Record<string, any> | null;
  contractorId: string | null;
  onUpdate: (patch: Partial<SeedData>) => void;
  onContinue: () => void;
  isProcessing: boolean;
}

const INPUT_CLS = "w-full h-11 rounded-xl bg-muted/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";

export default function StepCorrections({ seed, importedData, contractorId, onUpdate, onContinue, isProcessing }: Props) {
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "business_name" as const, label: "Nom de l'entreprise", value: seed.business_name, status: seed.business_name ? "ok" : "missing" },
    { key: "contact_name" as const, label: "Nom du contact", value: seed.contact_name, status: seed.contact_name ? "ok" : "improve" },
    { key: "phone" as const, label: "Téléphone", value: seed.phone, status: seed.phone ? "ok" : "missing" },
    { key: "email" as const, label: "Email", value: seed.email, status: seed.email ? "ok" : "improve" },
    { key: "website" as const, label: "Site web", value: seed.website, status: seed.website ? "ok" : "improve" },
    { key: "rbq_number" as const, label: "Numéro RBQ", value: seed.rbq_number, status: seed.rbq_number ? "ok" : "improve" },
    { key: "neq_number" as const, label: "Numéro NEQ", value: seed.neq_number, status: seed.neq_number ? "ok" : "improve" },
  ];

  const handleSave = async () => {
    if (!contractorId) { onContinue(); return; }
    setSaving(true);
    try {
      await supabase.from("contractors").update({
        business_name: seed.business_name,
        phone: seed.phone || null,
        email: seed.email || null,
        website: seed.website || null,
        license_number: seed.rbq_number || null,
      }).eq("id", contractorId);
      toast.success("Informations mises à jour");
      onContinue();
    } catch {
      toast.error("Erreur de sauvegarde");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Corrections rapides</h2>
      <p className="text-xs text-muted-foreground">
        Corrigez ou complétez les informations importantes pour améliorer le score AIPP.
      </p>

      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <div className="flex items-center gap-1.5">
              {f.status === "ok" ? (
                <CheckCircle className="w-3 h-3 text-green-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
              <label className="text-xs font-medium text-foreground">{f.label}</label>
            </div>
            <input
              type="text"
              value={f.value}
              onChange={(e) => onUpdate({ [f.key]: e.target.value })}
              placeholder={f.label}
              className={INPUT_CLS}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? "Sauvegarde..." : "Confirmer mon profil"}
        </motion.button>

        <button
          onClick={onContinue}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Je complète plus tard →
        </button>
      </div>
    </div>
  );
}
