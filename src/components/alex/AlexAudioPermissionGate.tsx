import { motion } from 'framer-motion';
import { Mic, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlexAudioPermissionGateProps {
  onRetryMic: () => void;
  onContinueText: () => void;
}

export function AlexAudioPermissionGate({ onRetryMic, onContinueText }: AlexAudioPermissionGateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Mic className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        Microphone requis
      </h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Alex peut vous guider par la voix. Autorisez le micro pour une expérience plus fluide, ou continuez en écrivant.
      </p>
      <div className="flex flex-col gap-3">
        <Button onClick={onRetryMic} className="w-full gap-2">
          <Mic className="h-4 w-4" />
          Réessayer le micro
        </Button>
        <Button variant="outline" onClick={onContinueText} className="w-full gap-2">
          <MessageSquare className="h-4 w-4" />
          Continuer en écrivant
        </Button>
      </div>
    </motion.div>
  );
}
