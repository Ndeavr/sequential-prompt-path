/**
 * Voice reliability UI components — Toasts, badges, banners, orb states.
 */
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, MessageSquare, AlertTriangle, Mic, Volume2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VoiceReliabilityState } from "@/hooks/useVoiceReliability";

// ─── Toast: Fallback Active ───
export function ToastVoiceFallbackActive({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-yellow-500/30 bg-card p-4 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Voix de secours activée</span>
          </div>
          <p className="text-xs text-muted-foreground">La voix personnalisée d'Alex est temporairement indisponible. Une voix alternative est utilisée.</p>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="mt-2 text-xs">OK</Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Toast: Permission Error ───
export function ToastVoicePermissionError({
  visible,
  onRetry,
  onSwitchToText,
}: {
  visible: boolean;
  onRetry: () => void;
  onSwitchToText: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-destructive/30 bg-card p-4 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Microphone requis</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Autorisez l'accès au microphone dans les paramètres de votre navigateur.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry} className="flex-1 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />Réessayer
            </Button>
            <Button size="sm" onClick={onSwitchToText} className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />Mode texte
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Toast: Voice Unavailable ───
export function ToastVoiceUnavailable({
  visible,
  onSwitchToText,
}: {
  visible: boolean;
  onSwitchToText: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-destructive/30 bg-card p-4 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-2">
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">Service vocal indisponible</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">La conversation vocale est temporairement hors service. Utilisez le chat en attendant.</p>
          <Button size="sm" onClick={onSwitchToText} className="w-full gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />Continuer par texte
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Badge: Active Provider ───
export function BadgeVoiceActiveProvider({ provider, fallback }: { provider: string; fallback: boolean }) {
  return (
    <Badge variant={fallback ? "secondary" : "default"} className="text-[10px] gap-1">
      <Volume2 className="w-3 h-3" />
      {provider}
      {fallback && " (secours)"}
    </Badge>
  );
}

// ─── Badge: Language Forced ───
export function BadgeSpeechLanguageForced({ language }: { language: string }) {
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      🇫🇷 {language}
    </Badge>
  );
}

// ─── Banner: Recovery Mode ───
export function BannerVoiceRecoveryMode({
  visible,
  onRetry,
  onSwitchToText,
  onOpenDiagnostics,
  isAdmin,
}: {
  visible: boolean;
  onRetry: () => void;
  onSwitchToText: () => void;
  onOpenDiagnostics?: () => void;
  isAdmin?: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-semibold text-foreground">Mode récupération vocale</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />Réessayer
        </Button>
        <Button size="sm" onClick={onSwitchToText} className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />Passer au chat
        </Button>
        {isAdmin && onOpenDiagnostics && (
          <Button size="sm" variant="ghost" onClick={onOpenDiagnostics} className="gap-1.5 text-xs">
            Diagnostics
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Orb: Listening State ───
export function OrbAlexListeningState({ state }: { state: VoiceReliabilityState }) {
  const isListening = state === "listening" || state === "hearing_user" || state === "silence_countdown";
  const isSpeaking = state === "alex_speaking";
  const isProcessing = state === "processing";
  const isError = state === "error";

  const size = isSpeaking ? 140 : isListening ? 130 : 110;

  const bgGradient = isError
    ? "hsl(var(--destructive) / 0.5)"
    : isSpeaking
    ? "hsl(var(--primary) / 0.8)"
    : isListening
    ? "hsl(var(--primary) / 0.6)"
    : "hsl(var(--muted-foreground) / 0.3)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.08, 1] : 1,
          opacity: isListening || isSpeaking ? 0.3 : 0.1,
        }}
        transition={{ duration: isSpeaking ? 0.6 : 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: size + 60,
          height: size + 60,
          background: `radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)`,
        }}
      />
      <motion.div
        animate={{ width: size, height: size }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${bgGradient}, hsl(var(--primary) / 0.3))`,
        }}
      >
        <AnimatePresence mode="wait">
          {isSpeaking && (
            <motion.div key="speaking" className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <motion.div key={i} animate={{ height: [4, 18, 4] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }} className="w-1.5 bg-primary-foreground rounded-full" />
              ))}
            </motion.div>
          )}
          {isListening && (
            <motion.div key="listening" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Mic className="w-8 h-8 text-primary-foreground" />
            </motion.div>
          )}
          {isProcessing && (
            <motion.div key="processing" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
              <RefreshCw className="w-7 h-7 text-primary-foreground/80" />
            </motion.div>
          )}
          {isError && (
            <AlertTriangle className="w-7 h-7 text-destructive-foreground" />
          )}
          {state === "idle" && (
            <Mic className="w-8 h-8 text-primary-foreground/50" />
          )}
        </AnimatePresence>
      </motion.div>

      {state === "silence_countdown" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-2 text-[10px] text-muted-foreground tracking-wider"
        >
          Silence détecté…
        </motion.div>
      )}
    </div>
  );
}
