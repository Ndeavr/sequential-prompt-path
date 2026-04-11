import { Brain, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  type: "comparison" | "record";
}

export default function BadgeUsageSoumission({ type }: Props) {
  if (type === "comparison") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
        <Brain className="h-2.5 w-2.5" /> Comparaison IA
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
      <FolderOpen className="h-2.5 w-2.5" /> Dossier client
    </Badge>
  );
}
