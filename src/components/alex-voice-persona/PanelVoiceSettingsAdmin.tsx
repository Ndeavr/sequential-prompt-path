/**
 * PanelVoiceSettingsAdmin — Admin panel for Alex voice persona management.
 */
import { useState } from "react";
import { useAlexVoicePersona } from "@/hooks/useAlexVoicePersona";
import SelectorVoiceProfile from "./SelectorVoiceProfile";
import DetectorLanguageAutoSwitch from "./DetectorLanguageAutoSwitch";
import PlayerVoiceResponse from "./PlayerVoiceResponse";
import { Settings, Shield } from "lucide-react";

export default function PanelVoiceSettingsAdmin() {
  const { profiles, activeProfile, activeLanguage, switchLanguage, isPlaying, setIsPlaying } = useAlexVoicePersona();
  const [selectedId, setSelectedId] = useState<string | null>(activeProfile?.id || null);

  return (
    <div className="space-y-6 p-4 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Persona vocale Alex</h2>
          <p className="text-xs text-muted-foreground">Voix masculine premium · ElevenLabs</p>
        </div>
      </div>

      {/* Language indicator */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Langue active :</span>
        <DetectorLanguageAutoSwitch currentLanguage={activeLanguage} />
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => switchLanguage("fr")}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              activeLanguage === "fr" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            FR
          </button>
          <button
            onClick={() => switchLanguage("en")}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              activeLanguage === "en" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Voice profiles */}
      <SelectorVoiceProfile
        profiles={profiles}
        activeProfileId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Playback test */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Test voix :</span>
        <PlayerVoiceResponse
          isPlaying={isPlaying}
          onToggle={() => setIsPlaying(!isPlaying)}
          language={activeLanguage}
        />
      </div>

      {/* Identity guardrails indicator */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <Shield className="w-4 h-4 text-emerald-500" />
        <div>
          <p className="text-xs font-medium text-emerald-400">Guardrails identité actifs</p>
          <p className="text-[10px] text-muted-foreground">
            Zéro mention technique · Ton constant · Identité : Alex, l'assistant IA d'UNPRO
          </p>
        </div>
      </div>
    </div>
  );
}
