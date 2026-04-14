import { AlertCircle } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  first_name: "Prénom",
  phone: "Téléphone",
  email: "Courriel",
  address_line_1: "Adresse",
  city: "Ville",
  postal_code: "Code postal",
};

interface Props {
  missingFields: string[];
  message?: string;
}

export default function CardProfileMissingFields({ missingFields, message }: Props) {
  if (missingFields.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs font-semibold text-foreground">
          {message || "Information manquante pour réserver"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missingFields.map((f) => (
          <span
            key={f}
            className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-medium"
          >
            {FIELD_LABELS[f] || f}
          </span>
        ))}
      </div>
    </div>
  );
}
