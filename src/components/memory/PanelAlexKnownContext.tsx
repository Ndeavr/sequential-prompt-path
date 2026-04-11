import { useMemoryContextSafe } from '@/contexts/PersistentUserMemoryProvider';
import { Brain, Sparkles } from 'lucide-react';

/**
 * Compact panel showing what Alex already knows about the user.
 * Used in chat/voice interfaces to show prefilled context.
 */
export function PanelAlexKnownContext() {
  const memory = useMemoryContextSafe();
  if (!memory) return null;

  const { reusableContext, timeSavedStats } = memory;
  const knownKeys = Object.keys(reusableContext);

  if (knownKeys.length === 0) return null;

  const DISPLAY_MAP: Record<string, string> = {
    first_name: 'Prénom',
    city: 'Ville',
    address_main: 'Adresse',
    property_type: 'Propriété',
    project_type: 'Projet',
    urgency: 'Urgence',
    preferred_mode: 'Mode',
    problem_detected: 'Problème',
    budget_mentioned: 'Budget',
  };

  const pills = knownKeys
    .filter(k => DISPLAY_MAP[k])
    .slice(0, 6)
    .map(k => ({
      key: k,
      label: DISPLAY_MAP[k],
      value: (() => {
        const v = reusableContext[k]?.value;
        if (!v) return '';
        return typeof v === 'object' ? Object.values(v).filter(Boolean)[0] ?? '' : String(v);
      })(),
    }));

  if (pills.length === 0) return null;

  return (
    <div className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Déjà connu</span>
        {timeSavedStats.estimatedTimeSaved > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            ~{Math.round(timeSavedStats.estimatedTimeSaved / 60)} min gagné
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pills.map(p => (
          <span
            key={p.key}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 text-xs border border-border/50"
          >
            <span className="text-muted-foreground">{p.label}:</span>
            <span className="font-medium truncate max-w-[120px]">{String(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
