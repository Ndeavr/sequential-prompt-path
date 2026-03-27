import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlexAudioRecoveryToastProps {
  visible: boolean;
  message: string;
  onRetry: () => void;
  onSwitchToText: () => void;
}

export function AlexAudioRecoveryToast({
  visible,
  message,
  onRetry,
  onSwitchToText,
}: AlexAudioRecoveryToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <p className="mb-3 text-sm text-foreground">{message}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry} className="flex-1 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </Button>
            <Button size="sm" onClick={onSwitchToText} className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Mode texte
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
