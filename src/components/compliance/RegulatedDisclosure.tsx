/**
 * Divulgation contextuelle pour les catégories réglementées.
 * Concise by default; the full text opens separately so the UX stays premium.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import { UNPRO_REGULATED_DISCLOSURE } from "@/lib/compliance/professionCompliance";
import { useComplianceRule } from "@/hooks/useProfessionCompliance";

interface Props {
  professionCode?: string | null;
  /** Render even if the profession is not flagged as requiring a handoff. */
  force?: boolean;
  className?: string;
}

export function RegulatedDisclosure({ professionCode, force, className }: Props) {
  const [open, setOpen] = useState(false);
  const { data: rule } = useComplianceRule(professionCode);

  const isRegulated = rule?.profession_type === "regulated" || rule?.requires_regulated_handoff;
  if (!force && !isRegulated) return null;

  const extra = rule?.required_disclosures ?? [];

  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-3 ${className ?? ""}`}>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {UNPRO_REGULATED_DISCLOSURE}
          {extra.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="ml-1 text-primary underline-offset-2 hover:underline"
            >
              {open ? "Réduire" : "En savoir plus"}
            </button>
          )}
        </span>
      </p>
      {open && (
        <ul className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground">
          {extra.map((d) => (
            <li key={d} className="list-disc">{d}</li>
          ))}
          {rule?.regulator_name && <li className="list-disc">Encadrement : {rule.regulator_name}.</li>}
        </ul>
      )}
    </div>
  );
}

export default RegulatedDisclosure;
