/**
 * EmptyStateFallback — No dead ends. Always offer escape paths.
 */
import { MessageCircle, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onManualAdd?: () => void;
  onAlex?: () => void;
  retryLabel?: string;
  manualLabel?: string;
  alexLabel?: string;
}

export default function EmptyStateFallback({
  title = "Aucun résultat trouvé",
  description = "Essayez une autre approche.",
  onRetry,
  onManualAdd,
  onAlex,
  retryLabel = "Réessayer",
  manualLabel = "Ajouter manuellement",
  alexLabel = "Parler à Alex",
}: Props) {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {retryLabel}
          </Button>
        )}
        {onManualAdd && (
          <Button variant="outline" size="sm" onClick={onManualAdd}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {manualLabel}
          </Button>
        )}
        {onAlex && (
          <Button variant="secondary" size="sm" onClick={onAlex}>
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            {alexLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
