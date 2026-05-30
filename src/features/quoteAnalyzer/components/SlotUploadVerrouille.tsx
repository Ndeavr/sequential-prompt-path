import { Lock, Sparkles } from "lucide-react";

interface Props {
  tier: "passeport" | "gold";
  onClick: () => void;
}

export default function SlotUploadVerrouille({ tier, onClick }: Props) {
  const isGold = tier === "gold";
  const label = isGold ? "Jusqu'à 10 soumissions" : "Ajouter une 4e ou 5e soumission";
  const badge = isGold ? "Passeport Maison Gold" : "Passeport Maison (5 max)";
  const Icon = isGold ? Sparkles : Lock;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-dashed border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all px-4 py-3 flex items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isGold ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{label}</p>
          <p className={`text-[10px] font-medium truncate ${isGold ? "text-amber-600" : "text-primary"}`}>
            {isGold ? "⭐" : "🔒"} {badge}
          </p>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors shrink-0">
        Débloquer
      </span>
    </button>
  );
}
