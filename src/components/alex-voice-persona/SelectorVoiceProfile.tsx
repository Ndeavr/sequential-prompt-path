/**
 * SelectorVoiceProfile — Admin voice profile selector.
 */
import { Check, Mic } from "lucide-react";

interface VoiceProfile {
  id: string;
  name: string;
  gender: string;
  language: string;
  voice_provider: string;
  voice_id_primary: string;
  tone_style: string;
  is_active: boolean;
}

interface Props {
  profiles: VoiceProfile[];
  activeProfileId: string | null;
  onSelect: (profileId: string) => void;
}

export default function SelectorVoiceProfile({ profiles, activeProfileId, onSelect }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Profils voix</h3>
      <div className="grid gap-2">
        {profiles.map(profile => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
              activeProfileId === profile.id
                ? "border-primary/50 bg-primary/5"
                : "border-border/30 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Mic className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {profile.language.toUpperCase()} · {profile.gender} · {profile.tone_style}
              </p>
            </div>
            {activeProfileId === profile.id && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
