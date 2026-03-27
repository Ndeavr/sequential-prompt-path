import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings2 } from 'lucide-react';

interface AlexVoiceSettingsSheetProps {
  isVoiceEnabled: boolean;
  speechRate: number;
  speechStyle: string;
  onToggleVoice: (enabled: boolean) => void;
  onSpeechRateChange: (rate: number) => void;
  onSpeechStyleChange: (style: string) => void;
}

const STYLES = [
  { key: 'natural', label: 'Naturel', desc: 'Ton chaleureux et conversationnel' },
  { key: 'reassuring', label: 'Plus rassurant', desc: 'Calme et posé' },
  { key: 'direct', label: 'Plus direct', desc: 'Efficace et rapide' },
];

export function AlexVoiceSettingsSheet({
  isVoiceEnabled,
  speechRate,
  speechStyle,
  onToggleVoice,
  onSpeechRateChange,
  onSpeechStyleChange,
}: AlexVoiceSettingsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Paramètres vocaux</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Voice toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-toggle" className="text-sm font-medium">
              Activer la voix
            </Label>
            <Switch
              id="voice-toggle"
              checked={isVoiceEnabled}
              onCheckedChange={onToggleVoice}
            />
          </div>

          {/* Speech rate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Vitesse de parole ({Math.round(speechRate * 100)}%)
            </Label>
            <Slider
              value={[speechRate * 100]}
              min={70}
              max={130}
              step={5}
              onValueChange={([v]) => onSpeechRateChange(v / 100)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lent</span>
              <span>Normal</span>
              <span>Rapide</span>
            </div>
          </div>

          {/* Speech style */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Style de voix</Label>
            <div className="grid gap-2">
              {STYLES.map(s => (
                <button
                  key={s.key}
                  onClick={() => onSpeechStyleChange(s.key)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    speechStyle === s.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
