import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Save, Loader2 } from "lucide-react";
import { useVoiceTestPhrases, useVoiceProfiles, useSaveVoiceTest } from "@/hooks/useAlexVoiceEngine";
import { useAlexVoicePreview } from "@/hooks/useAlexVoicePreview";
import { useToast } from "@/hooks/use-toast";

interface Props {
  selectedVoiceProfileId?: string;
}

const SCORE_LABELS = [
  { key: "clarity_score", label: "Clarté" },
  { key: "french_accent_score", label: "Accent français" },
  { key: "no_english_accent_score", label: "Sans accent anglais" },
  { key: "warmth_score", label: "Chaleur" },
  { key: "trust_score", label: "Crédibilité" },
  { key: "construction_vocab_score", label: "Vocabulaire métier" },
  { key: "naturalness_score", label: "Naturel" },
];

export default function PanelFrenchPronunciationBench({ selectedVoiceProfileId }: Props) {
  const { data: phrases = [], isLoading } = useVoiceTestPhrases();
  const { data: profiles = [] } = useVoiceProfiles();
  const saveTest = useSaveVoiceTest();
  const { toast } = useToast();
  const { loadingId, playingId, play, stop } = useAlexVoicePreview();
  const [activePhraseId, setActivePhraseId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const selectedProfile = profiles.find((p: any) => p.id === selectedVoiceProfileId);

  const handlePlayPhrase = (phrase: any) => {
    if (!selectedProfile) return;
    const playId = `phrase-${phrase.id}`;
    play(playId, selectedProfile.profile_key, selectedProfile.language, phrase.phrase_text);
  };

  const handleScore = (key: string, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!selectedVoiceProfileId || !activePhraseId) return;
    try {
      await saveTest.mutateAsync({
        voice_profile_id: selectedVoiceProfileId,
        test_phrase_id: activePhraseId,
        ...Object.fromEntries(SCORE_LABELS.map(({ key }) => [key, scores[key] ?? 5])),
      } as any);
      toast({ title: "Test sauvegardé" });
      setScores({});
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const categoryColor: Record<string, string> = {
    greeting: "bg-blue-500/20 text-blue-400",
    homeowner_discovery: "bg-purple-500/20 text-purple-400",
    construction_terms: "bg-amber-500/20 text-amber-400",
    booking: "bg-emerald-500/20 text-emerald-400",
    brand_pronunciation: "bg-pink-500/20 text-pink-400",
  };

  if (isLoading) return <div className="animate-pulse h-40 rounded-lg bg-muted" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          🎙️ Banc de test — Prononciation française
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selectedVoiceProfileId && (
          <p className="text-sm text-muted-foreground">Sélectionnez un profil de voix pour commencer les tests.</p>
        )}

        <div className="grid gap-2">
          {phrases.map((p: any) => {
            const isActive = activePhraseId === p.id;
            const phrasePlayId = `phrase-${p.id}`;
            const isPhraseLoading = loadingId === phrasePlayId;
            const isPhrasePlaying = playingId === phrasePlayId;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setActivePhraseId(p.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge className={`text-xs shrink-0 ${categoryColor[p.category] ?? "bg-muted"}`}>
                      {p.category}
                    </Badge>
                    <span className="text-sm font-medium truncate">{p.phrase_text}</span>
                  </div>
                  {isPhrasePlaying ? (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={(e) => { e.stopPropagation(); stop(); }}>
                      <Square className="w-3 h-3 text-destructive" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={!selectedVoiceProfileId || isPhraseLoading}
                      onClick={(e) => { e.stopPropagation(); handlePlayPhrase(p); }}
                    >
                      {isPhraseLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    </Button>
                  )}
                </div>

                {isActive && selectedVoiceProfileId && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    {SCORE_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
                        <Slider
                          value={[scores[key] ?? 5]}
                          min={0}
                          max={10}
                          step={1}
                          onValueChange={([v]) => handleScore(key, v)}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono w-6 text-right">{scores[key] ?? 5}</span>
                      </div>
                    ))}
                    <Button size="sm" onClick={handleSave} disabled={saveTest.isPending} className="w-full">
                      {saveTest.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                      Sauvegarder les scores
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
