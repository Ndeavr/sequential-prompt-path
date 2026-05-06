import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function FormErrorRetry({ message, onRetry, isRetrying }: Props) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-destructive font-medium">
          {message || 'Une erreur est survenue. Réessayez dans un instant.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} disabled={isRetrying} size="sm" variant="outline" className="mt-2">
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isRetrying ? 'animate-spin' : ''}`} />
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
