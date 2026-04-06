import { Sparkles } from "lucide-react";

interface Props {
  label: string;
}

export default function BadgePricePerUnit({ label }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium">
      <Sparkles className="w-3 h-3" />
      {label}
    </span>
  );
}
