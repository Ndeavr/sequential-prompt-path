import { motion } from 'framer-motion';
import { Mic, MicOff, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import type { VoiceSessionState } from '@/services/alexVoiceAbstraction';
import type { VoiceProviderKey } from '@/services/alexVoiceProviderRegistry';

interface AlexVoiceStatusPillProps {
  voiceState: VoiceSessionState;
  provider: VoiceProviderKey;
  qualityLevel: 'excellent' | 'good' | 'degraded' | 'poor';
}

const stateLabels: Record<VoiceSessionState, string> = {
  idle: '',
  connecting: 'Connexion…',
  listening: 'Alex en direct',
  speaking: 'Alex parle',
  interrupted: 'Un instant…',
  recovering: 'Reconnexion…',
  error: 'Mode texte',
  closed: '',
};

export function AlexVoiceStatusPill({ voiceState, provider, qualityLevel }: AlexVoiceStatusPillProps) {
  if (voiceState === 'idle' || voiceState === 'closed') return null;

  const label = stateLabels[voiceState];
  const isTextMode = provider === 'text_only';
  const isDegraded = qualityLevel === 'degraded' || qualityLevel === 'poor';

  const bgClass =
    voiceState === 'error' ? 'bg-destructive/10 text-destructive' :
    isDegraded ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
    voiceState === 'speaking' ? 'bg-primary/10 text-primary' :
    'bg-muted text-muted-foreground';

  const Icon =
    isTextMode ? MessageSquare :
    voiceState === 'error' ? MicOff :
    isDegraded ? WifiOff :
    voiceState === 'recovering' ? Wifi :
    Mic;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${bgClass}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
      {isDegraded && (
        <span className="text-[10px] opacity-60">
          {qualityLevel === 'poor' ? '• Instable' : '• Connexion lente'}
        </span>
      )}
    </motion.div>
  );
}
