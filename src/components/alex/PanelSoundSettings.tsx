/**
 * PanelSoundSettings — Sound preferences UI for Alex / UNPRO.
 * Toggle sound, volume slider, focus mode.
 */
import { Volume2, VolumeX, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export default function PanelSoundSettings() {
  const { enabled, toggleSound, volume, setVolume, focusMode, setFocusMode, play } = useAudioEngine();

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {enabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
        Sons Alex
      </h3>

      {/* Master toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="sound-toggle" className="text-xs text-muted-foreground">Activer les sons</Label>
        <Switch id="sound-toggle" checked={enabled} onCheckedChange={toggleSound} />
      </div>

      {/* Volume */}
      {enabled && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Volume ({Math.round(volume * 100)}%)</Label>
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([v]) => setVolume(v)}
            onValueCommit={() => play("notification")}
          />
        </div>
      )}

      {/* Focus mode */}
      {enabled && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
            <Label htmlFor="focus-mode" className="text-xs text-muted-foreground">Mode focus (sons urgents seulement)</Label>
          </div>
          <Switch id="focus-mode" checked={focusMode} onCheckedChange={setFocusMode} />
        </div>
      )}
    </div>
  );
}
