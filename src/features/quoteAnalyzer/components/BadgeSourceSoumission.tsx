import { Badge } from "@/components/ui/badge";

interface Props {
  source: "manual_record" | "contractor_upload" | "rep_upload" | "analysis_saved_copy";
}

const LABELS: Record<string, { label: string; className: string }> = {
  manual_record: { label: "Saisie manuelle", className: "bg-muted text-muted-foreground" },
  contractor_upload: { label: "Entrepreneur", className: "bg-blue-500/10 text-blue-600" },
  rep_upload: { label: "Représentant", className: "bg-purple-500/10 text-purple-600" },
  analysis_saved_copy: { label: "Copie d'analyse", className: "bg-primary/10 text-primary" },
};

export default function BadgeSourceSoumission({ source }: Props) {
  const { label, className } = LABELS[source] || LABELS.manual_record;
  return (
    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${className}`}>
      {label}
    </Badge>
  );
}
