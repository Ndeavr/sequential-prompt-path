/**
 * ProfileCompletionChecklist — Shows imported data + what's missing, editable.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle, ArrowRight, Globe, MapPin, Star, Phone, Mail, Edit2, Shield, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ImportedBusinessData, ImportModule } from "@/pages/signature/PageAlexGuidedOnboarding";

interface Props {
  draft: {
    business_name: string;
    first_name: string;
    city: string;
    phone: string;
    email: string;
    activity: string;
    website?: string;
  };
  completion: number;
  importedData?: ImportedBusinessData | null;
  importModules?: ImportModule[];
  contractorId?: string | null;
  onComplete: () => void;
}

interface EditableField {
  key: string;
  label: string;
  icon: any;
  getValue: () => string;
  dbField?: string;
}

export default function ProfileCompletionChecklist({ draft, completion, importedData, importModules, contractorId, onComplete }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const hasImport = importedData && Object.keys(importedData).length > 0;

  // Build field items from imported data + draft
  const items = [
    { key: "business_name", label: "Nom d'entreprise", done: !!draft.business_name, value: draft.business_name, source: "user" },
    { key: "city", label: "Ville", done: !!draft.city, value: draft.city, source: "user" },
    { key: "phone", label: "Téléphone", done: !!(draft.phone || importedData?.phone?.value), value: importedData?.phone?.value || draft.phone, source: importedData?.phone?.source || "user" },
    { key: "email", label: "Courriel", done: !!(draft.email || importedData?.email?.value), value: importedData?.email?.value || draft.email, source: importedData?.email?.source || "user" },
    { key: "activity", label: "Activité principale", done: !!draft.activity, value: draft.activity, source: "user" },
    { key: "website", label: "Site web", done: !!(draft.website || importedData?.website?.value), value: importedData?.website?.value || draft.website, source: importedData?.website?.source || "user" },
    { key: "address", label: "Adresse complète", done: !!importedData?.address?.value, value: importedData?.address?.value || "", source: importedData?.address?.source || "none" },
    { key: "rating", label: "Note Google", done: !!importedData?.rating?.value, value: importedData?.rating?.value ? `${importedData.rating.value}/5` : "", source: "google" },
    { key: "reviewCount", label: "Nombre d'avis", done: !!importedData?.reviewCount?.value, value: importedData?.reviewCount?.value ? `${importedData.reviewCount.value} avis` : "", source: "google" },
    { key: "businessHours", label: "Heures d'ouverture", done: !!importedData?.businessHours?.value, value: importedData?.businessHours?.value || "", source: importedData?.businessHours?.source || "none" },
    { key: "description", label: "Description générée", done: !!importedData?.description?.value, value: "", source: importedData?.description?.source || "auto" },
    { key: "insurance", label: "Assurance", done: !!importedData?.insuranceInfo?.value, value: importedData?.insuranceInfo?.value || "", source: "none" },
    { key: "license", label: "Licence RBQ", done: !!importedData?.licenseNumber?.value, value: importedData?.licenseNumber?.value || "", source: "none" },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  const handleSaveField = async (key: string, value: string) => {
    if (!contractorId || !value.trim()) return;
    setSaving(true);
    try {
      const fieldMap: Record<string, string> = {
        address: "address",
        website: "website",
        phone: "phone",
        email: "email",
        insurance: "insurance_info",
        license: "license_number",
      };
      const dbField = fieldMap[key];
      if (dbField) {
        await supabase.from("contractors").update({ [dbField]: value }).eq("id", contractorId);
        toast.success("Sauvegardé");
      }
    } catch { toast.error("Erreur de sauvegarde"); }
    finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === "google") return { label: "Google", color: "text-blue-500 bg-blue-500/10" };
    if (source === "website") return { label: "Site web", color: "text-purple-500 bg-purple-500/10" };
    if (source === "user") return { label: "Vous", color: "text-primary bg-primary/10" };
    if (source === "auto") return { label: "Auto", color: "text-amber-500 bg-amber-500/10" };
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Score circle */}
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-foreground">Complétion du profil</h2>
        <div className="relative w-24 h-24 mx-auto">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <motion.path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${pct} 100` }}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-foreground">{pct}%</span>
          </div>
        </div>
        {hasImport && (
          <p className="text-xs text-muted-foreground">
            Données importées depuis {importModules?.filter(m => m.status === "completed").length || 0} sources
          </p>
        )}
      </div>

      {/* Import sources summary */}
      {importModules && importModules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {importModules.map((mod) => (
            <div
              key={mod.id}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${
                mod.status === "completed"
                  ? "bg-green-500/10 text-green-600"
                  : mod.status === "partial"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-muted/20 text-muted-foreground"
              }`}
            >
              {mod.status === "completed" ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
              {mod.label}
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {items.map((item) => {
          const badge = getSourceBadge(item.source);
          const isEditing = editingField === item.key;
          const isEditable = ["address", "website", "phone", "email", "insurance", "license"].includes(item.key);

          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
                item.done ? "bg-green-500/5 border border-green-500/10" : "bg-muted/10 border border-border/20"
              }`}
            >
              {item.done ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                  {badge && item.done && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {item.done && item.value && !isEditing && (
                  <p className="text-[11px] text-muted-foreground truncate">{item.value}</p>
                )}
                {isEditing && (
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8 text-xs"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveField(item.key, editValue)}
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSaveField(item.key, editValue)}
                      disabled={saving}
                      className="px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                    >
                      OK
                    </motion.button>
                  </div>
                )}
              </div>
              {!item.done && isEditable && !isEditing && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setEditingField(item.key); setEditValue(""); }}
                  className="p-1.5 rounded-lg hover:bg-muted/30"
                >
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-saved notice */}
      <p className="text-center text-[10px] text-muted-foreground/60">
        Sauvegardé automatiquement • Vous pourrez modifier ces informations à tout moment
      </p>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
      >
        Voir la prévisualisation <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
