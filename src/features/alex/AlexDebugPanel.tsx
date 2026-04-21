/**
 * Alex 100M — Debug Panel (dev only)
 * Compact unobtrusive state inspector.
 */

import { useState } from "react";
import { useAlexStore } from "./state/alexStore";

export function AlexDebugPanel() {
  const [open, setOpen] = useState(false);
  const isDev = import.meta.env.DEV;

  const s = useAlexStore();

  if (!isDev) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-[200] bg-card/90 border border-border/40 rounded-full px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground"
      >
        🔧 Alex
      </button>
    );
  }

  const rows: [string, unknown][] = [
    ["mode", s.mode],
    ["initialized", s.isInitialized],
    ["greetingInjected", s.isGreetingInjected],
    ["greetingSpoken", s.isGreetingSpoken],
    ["voiceAvailable", s.isVoiceAvailable],
    ["sttAvailable", s.isSTTAvailable],
    ["autoplay", s.isAutoplayAllowed],
    ["audioUnlocked", s.isAudioUnlocked],
    ["activePlayback", s.hasActivePlayback],
    ["micOpen", s.isMicOpen],
    ["noResponseCount", s.consecutiveNoResponseCount],
    ["repromptCount", s.autoRepromptCount],
    ["interactions", s.interactionCount],
    ["lang", s.activeLanguage],
    ["messages", s.messages.length],
  ];

  return (
    <div className="fixed bottom-6 left-6 z-[200] bg-card/95 backdrop-blur-sm border border-border/40 rounded-lg p-2 text-[10px] font-mono text-muted-foreground w-56 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-foreground text-[11px]">Alex Debug</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <table className="w-full">
        <tbody>
          {rows.map(([key, val]) => (
            <tr key={key} className="border-b border-border/10">
              <td className="py-0.5 pr-2 text-muted-foreground/70">{key}</td>
              <td className={`py-0.5 ${val === true ? "text-success" : val === false ? "text-destructive/70" : "text-foreground"}`}>
                {String(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
