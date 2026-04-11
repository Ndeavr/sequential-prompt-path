/**
 * BadgeBestMatchSelected — Shows when a best match has been selected.
 */
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface Props {
  contractorName?: string;
  className?: string;
}

export default function BadgeBestMatchSelected({ contractorName, className }: Props) {
  return (
    <Badge
      variant="default"
      className={`text-[10px] px-2 py-0.5 bg-green-600 hover:bg-green-700 ${className || ""}`}
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {contractorName ? `Sélectionné: ${contractorName}` : "Meilleur match sélectionné"}
    </Badge>
  );
}
