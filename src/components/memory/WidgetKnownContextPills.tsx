import { useMemoryContextSafe } from '@/contexts/PersistentUserMemoryProvider';
import { Check } from 'lucide-react';

/**
 * Inline pills showing pre-filled values from memory.
 * Drop this into any form to show "already known" fields.
 */
export function WidgetKnownContextPills({ keys }: { keys: string[] }) {
  const memory = useMemoryContextSafe();
  if (!memory) return null;

  const known = keys.filter(k => memory.isKnown(k));
  if (known.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground">Prérempli pour vous :</span>
      {known.map(k => (
        <span key={k} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          <Check className="h-3 w-3" />
          {k.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  );
}
