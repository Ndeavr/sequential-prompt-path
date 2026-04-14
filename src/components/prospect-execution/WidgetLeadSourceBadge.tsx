import { Badge } from "@/components/ui/badge";
import { Globe, FileText, Upload, Zap } from "lucide-react";

const SRC: Record<string, { label: string; icon: React.ElementType }> = {
  manual_admin: { label: "Admin", icon: FileText },
  domain: { label: "Domaine", icon: Globe },
  csv: { label: "CSV", icon: Upload },
  api: { label: "API", icon: Zap },
};

export default function WidgetLeadSourceBadge({ source }: { source: string }) {
  const s = SRC[source] ?? SRC.manual_admin;
  const Icon = s.icon;
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}
