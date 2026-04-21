import { useState } from "react";
import type { AippAuditViewModel } from "@/types/aippReal";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AippBreakdownGrid({ model }: { model: AippAuditViewModel }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Détail par catégorie</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {model.breakdown.map(cat => (
          <CategoryCard key={cat.key} cat={cat} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ cat }: { cat: AippAuditViewModel["breakdown"][0] }) {
  const [open, setOpen] = useState(false);
  const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{cat.label}</span>
        <span className="text-sm font-bold">{cat.score} / {cat.maxScore}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{cat.summary}</p>
      {cat.details.length > 0 && (
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          {open ? "Masquer" : "Pourquoi cette note ?"}
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
      {open && (
        <ul className="text-xs text-muted-foreground space-y-1 pl-3">
          {cat.details.map((d, i) => (
            <li key={i} className="list-disc">{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
