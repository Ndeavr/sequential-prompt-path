import { cn } from '@/lib/utils';

interface BadgeMemoryConfidenceProps {
  score: number;
  className?: string;
}

export function BadgeMemoryConfidence({ score, className }: BadgeMemoryConfidenceProps) {
  const label = score >= 0.9 ? 'Vérifié' : score >= 0.7 ? 'Fiable' : score >= 0.5 ? 'Probable' : 'Incertain';
  const color = score >= 0.9
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    : score >= 0.7
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    : score >= 0.5
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-muted text-muted-foreground';

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color, className)}>
      {label} ({Math.round(score * 100)}%)
    </span>
  );
}
