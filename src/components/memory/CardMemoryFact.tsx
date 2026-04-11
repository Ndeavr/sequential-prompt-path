import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BadgeMemoryConfidence } from './BadgeMemoryConfidence';
import { BadgeMemoryFreshness } from './BadgeMemoryFreshness';
import { Pencil, Trash2, ArrowUpCircle, Check } from 'lucide-react';

const FACT_LABELS: Record<string, string> = {
  first_name: 'Prénom',
  language: 'Langue',
  preferred_mode: 'Mode préféré',
  address_main: 'Adresse principale',
  city: 'Ville',
  property_type: 'Type de propriété',
  project_type: 'Type de projet',
  urgency: 'Urgence',
  budget_mentioned: 'Budget mentionné',
  problem_detected: 'Problème détecté',
  phone: 'Téléphone',
  permission_mic: 'Permission micro',
  permission_location: 'Permission localisation',
  role_type: 'Rôle',
};

interface CardMemoryFactProps {
  fact: any;
  onEdit?: (factId: string) => void;
  onDismiss?: (factId: string) => void;
  onPromote?: (factId: string) => void;
  onConfirm?: (factId: string) => void;
  compact?: boolean;
}

export function CardMemoryFact({
  fact, onEdit, onDismiss, onPromote, onConfirm, compact = false,
}: CardMemoryFactProps) {
  const label = FACT_LABELS[fact.fact_key] ?? fact.fact_key;
  const value = typeof fact.fact_value_json === 'object'
    ? Object.values(fact.fact_value_json).filter(Boolean).join(', ')
    : String(fact.fact_value_json ?? '');
  const needsConfirm = fact.status === 'pending_confirmation';

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
          <span className="text-sm truncate">{value}</span>
        </div>
        <BadgeMemoryConfidence score={fact.confidence_score} />
      </div>
    );
  }

  return (
    <Card className={needsConfirm ? 'border-amber-300 dark:border-amber-700' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{label}</span>
              {needsConfirm && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  À confirmer
                </span>
              )}
            </div>
            <p className="text-sm text-foreground break-words">{value}</p>
            <div className="flex items-center gap-2 mt-2">
              <BadgeMemoryConfidence score={fact.confidence_score} />
              <BadgeMemoryFreshness updatedAt={fact.updated_at} />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {needsConfirm && onConfirm && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => onConfirm(fact.id)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(fact.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onPromote && !fact.is_persistent && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onPromote(fact.id)}>
                <ArrowUpCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDismiss(fact.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
