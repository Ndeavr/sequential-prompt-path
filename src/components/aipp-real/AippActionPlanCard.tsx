import type { AippAuditViewModel } from "@/types/aippReal";

export default function AippActionPlanCard({ model }: { model: AippAuditViewModel }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold">Plan d'action prioritaire</h3>
      <div className="space-y-4">
        {model.actionPlan.map((step, i) => {
          const [title, ...rest] = step.split(" — ");
          return (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                {rest.length > 0 && (
                  <p className="text-xs text-muted-foreground">{rest.join(" — ")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
          Voir mon plan détaillé
        </button>
        <button className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition">
          Activer mon profil UNPRO
        </button>
      </div>
    </div>
  );
}
