import { useMemoryContextSafe } from '@/contexts/PersistentUserMemoryProvider';
import { Clock, Sparkles, Zap } from 'lucide-react';

export function WidgetTimeSavedEstimate({ className }: { className?: string }) {
  const memory = useMemoryContextSafe();
  if (!memory) return null;

  const { timeSavedStats } = memory;
  if (timeSavedStats.fieldsKnown === 0) return null;

  const minutes = Math.round(timeSavedStats.estimatedTimeSaved / 60);

  return (
    <div className={`flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 p-3 ${className ?? ''}`}>
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/10">
        <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          ~{minutes > 0 ? `${minutes} min` : `${timeSavedStats.estimatedTimeSaved}s`} gagné
        </p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
          {timeSavedStats.fieldsKnown} information{timeSavedStats.fieldsKnown > 1 ? 's' : ''} préremplie{timeSavedStats.fieldsKnown > 1 ? 's' : ''}
        </p>
      </div>
      <Sparkles className="h-4 w-4 text-emerald-500/60" />
    </div>
  );
}
