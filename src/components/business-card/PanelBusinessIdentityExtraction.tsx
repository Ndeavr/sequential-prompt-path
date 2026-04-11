import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, Edit3, Shield, User, Building2, Phone, Mail, Globe, MapPin, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { ExtractedField } from "@/hooks/useBusinessCardImport";

const FIELD_CONFIG: Record<string, { label: string; icon: React.ElementType; group: string }> = {
  first_name: { label: "Prénom", icon: User, group: "identity" },
  last_name: { label: "Nom", icon: User, group: "identity" },
  full_name: { label: "Nom complet", icon: User, group: "identity" },
  company_name: { label: "Entreprise", icon: Building2, group: "identity" },
  role_title: { label: "Poste", icon: Building2, group: "identity" },
  phone: { label: "Téléphone", icon: Phone, group: "contact" },
  mobile_phone: { label: "Mobile", icon: Phone, group: "contact" },
  email: { label: "Courriel", icon: Mail, group: "contact" },
  website_url: { label: "Site web", icon: Globe, group: "contact" },
  street_address: { label: "Adresse", icon: MapPin, group: "location" },
  city: { label: "Ville", icon: MapPin, group: "location" },
  province: { label: "Province", icon: MapPin, group: "location" },
  postal_code: { label: "Code postal", icon: MapPin, group: "location" },
  category_primary: { label: "Métier", icon: Wrench, group: "business" },
  license_rbq: { label: "Licence RBQ", icon: Shield, group: "business" },
  social_linkedin: { label: "LinkedIn", icon: Globe, group: "social" },
  social_facebook: { label: "Facebook", icon: Globe, group: "social" },
};

interface Props {
  fields: ExtractedField[];
  onUpdateField: (fieldName: string, value: string) => void;
  onVerifyField: (fieldName: string) => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 85 ? "text-emerald-400 bg-emerald-500/10" : score >= 70 ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${color}`}>
      {score}%
    </span>
  );
}

function FieldRow({ field, onUpdate, onVerify }: { field: ExtractedField; onUpdate: (v: string) => void; onVerify: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.field_value);
  const config = FIELD_CONFIG[field.field_name];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        field.is_verified ? "border-emerald-500/30 bg-emerald-500/5" :
        field.needs_manual_review ? "border-amber-500/30 bg-amber-500/5" :
        "border-border bg-card"
      }`}
    >
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{config.label}</span>
          <ConfidenceBadge score={field.confidence} />
          {field.needs_manual_review && <AlertTriangle className="w-3 h-3 text-amber-400" />}
          {field.is_verified && <Check className="w-3 h-3 text-emerald-400" />}
        </div>

        {editing ? (
          <div className="flex gap-1.5">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
              onUpdate(editValue);
              setEditing(false);
            }}>
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-foreground truncate">{field.field_value}</p>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {!editing && !field.is_verified && (
          <>
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-muted transition-colors">
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={onVerify} className="p-1 rounded hover:bg-emerald-500/10 transition-colors">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function PanelBusinessIdentityExtraction({ fields, onUpdateField, onVerifyField }: Props) {
  const groups = [
    { key: "identity", label: "Identité" },
    { key: "contact", label: "Contact" },
    { key: "location", label: "Localisation" },
    { key: "business", label: "Entreprise" },
    { key: "social", label: "Réseaux" },
  ];

  const verifiedCount = fields.filter((f) => f.is_verified).length;
  const reviewCount = fields.filter((f) => f.needs_manual_review && !f.is_verified).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{fields.length} champs extraits</span>
          {verifiedCount > 0 && (
            <span className="text-xs text-emerald-400">{verifiedCount} vérifiés</span>
          )}
          {reviewCount > 0 && (
            <span className="text-xs text-amber-400">{reviewCount} à réviser</span>
          )}
        </div>
      </div>

      {/* Grouped fields */}
      <AnimatePresence>
        {groups.map((group) => {
          const groupFields = fields.filter((f) => FIELD_CONFIG[f.field_name]?.group === group.key);
          if (groupFields.length === 0) return null;

          return (
            <motion.div key={group.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                {group.label}
              </h4>
              {groupFields.map((field, i) => (
                <FieldRow
                  key={field.field_name}
                  field={field}
                  onUpdate={(v) => onUpdateField(field.field_name, v)}
                  onVerify={() => onVerifyField(field.field_name)}
                />
              ))}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
