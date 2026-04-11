import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface BadgeMemoryFreshnessProps {
  updatedAt: string;
  className?: string;
}

export function BadgeMemoryFreshness({ updatedAt, className }: BadgeMemoryFreshnessProps) {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

  const label = ageDays === 0 ? "Aujourd'hui"
    : ageDays === 1 ? 'Hier'
    : ageDays < 7 ? `Il y a ${ageDays}j`
    : ageDays < 30 ? `Il y a ${Math.floor(ageDays / 7)} sem.`
    : `Il y a ${Math.floor(ageDays / 30)} mois`;

  const color = ageDays < 7
    ? 'text-emerald-600 dark:text-emerald-400'
    : ageDays < 30
    ? 'text-muted-foreground'
    : 'text-muted-foreground/60';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', color, className)}>
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}
