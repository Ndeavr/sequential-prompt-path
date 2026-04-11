import { motion } from "framer-motion";
import type { ExtractedField } from "@/hooks/useBusinessCardImport";

const ESSENTIAL_FIELDS = ["company_name", "phone", "email", "city", "category_primary"];
const OPTIONAL_FIELDS = ["website_url", "street_address", "postal_code", "license_rbq", "role_title"];

interface Props {
  fields: ExtractedField[];
}

export default function WidgetBusinessDataCoverage({ fields }: Props) {
  const fieldNames = new Set(fields.map((f) => f.field_name));
  const essentialFound = ESSENTIAL_FIELDS.filter((f) => fieldNames.has(f));
  const optionalFound = OPTIONAL_FIELDS.filter((f) => fieldNames.has(f));
  const essentialPct = Math.round((essentialFound.length / ESSENTIAL_FIELDS.length) * 100);
  const totalPct = Math.round(((essentialFound.length + optionalFound.length) / (ESSENTIAL_FIELDS.length + OPTIONAL_FIELDS.length)) * 100);

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Couverture données</span>
        <span className="text-sm font-bold text-foreground">{totalPct}%</span>
      </div>

      {/* Essential fields */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground">Essentiels ({essentialFound.length}/{ESSENTIAL_FIELDS.length})</span>
        <div className="flex gap-1.5">
          {ESSENTIAL_FIELDS.map((f) => (
            <motion.div
              key={f}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: Math.random() * 0.3 }}
              className={`h-2 flex-1 rounded-full ${fieldNames.has(f) ? "bg-primary" : "bg-muted"}`}
              title={f}
            />
          ))}
        </div>
      </div>

      {/* Optional fields */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted-foreground">Optionnels ({optionalFound.length}/{OPTIONAL_FIELDS.length})</span>
        <div className="flex gap-1.5">
          {OPTIONAL_FIELDS.map((f) => (
            <motion.div
              key={f}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + Math.random() * 0.3 }}
              className={`h-2 flex-1 rounded-full ${fieldNames.has(f) ? "bg-secondary" : "bg-muted"}`}
              title={f}
            />
          ))}
        </div>
      </div>

      {/* Missing essential warning */}
      {essentialPct < 100 && (
        <p className="text-[10px] text-amber-400">
          Manquant : {ESSENTIAL_FIELDS.filter((f) => !fieldNames.has(f)).join(", ")}
        </p>
      )}
    </div>
  );
}
