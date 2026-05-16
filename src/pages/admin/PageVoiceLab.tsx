/**
 * PageVoiceLab — Admin → Alex AI → Voice Lab
 *
 * Live-test 6 candidate voices (5 personas + new YxrwjAKoUKULGd0g8K9Y) through
 * the production TTS pipeline. No page refresh, instant switching.
 *
 * Uses the existing `alex-voice-test` edge function with `voice_id` override.
 */
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Square, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type VoiceCard = {
  id: string;
  name: string;
  voice_id: string;
  gender: "female" | "male";
  accent: string;
  tone: string;
  languages: string[];
  description: string;
};

const VOICES: VoiceCard[] = [
  {
    id: "sophia-new",
    name: "Sophia (Nouvelle voix premium)",
    voice_id: "YxrwjAKoUKULGd0g8K9Y",
    gender: "female",
    accent: "Neutre international",
    tone: "Premium chaleureux",
    languages: ["fr", "en"],
    description: "Concierge premium — chaleur intelligente, énergie stable.",
  },
  {
    id: "clara",
    name: "Clara",
    voice_id: "XB0fDUnXU5powFXDhCwa",
    gender: "female",
    accent: "International",
    tone: "Startup concierge énergique",
    languages: ["fr", "en"],
    description: "Plus dynamique, vibe startup concierge.",
  },
  {
    id: "emma",
    name: "Emma",
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    gender: "female",
    accent: "Neutre",
    tone: "Calme intelligente luxe",
    languages: ["fr", "en"],
    description: "Calme, intelligente, ton luxe assuré.",
  },
  {
    id: "alex-prod",
    name: "Alex (Production actuelle)",
    voice_id: "or4EV8aZq78KWcXw48wd",
    gender: "female",
    accent: "Québec premium",
    tone: "Concierge décisive",
    languages: ["fr", "en"],
    description: "Voix de production verrouillée.",
  },
  {
    id: "daniel",
    name: "Daniel",
    voice_id: "onwK4e9ZLuTAKqWW03F9",
    gender: "male",
    accent: "International",
    tone: "Consultant confiant",
    languages: ["fr", "en"],
    description: "Voix masculine confiante, ton consultant.",
  },
  {
    id: "marc",
    name: "Marc",
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    gender: "male",
    accent: "International",
    tone: "Conseiller amical premium",
    languages: ["fr", "en"],
    description: "Conseiller amical, accessible, premium.",
  },
];

const SAMPLE_FR = "Bonjour, je suis Alex de Un Pro. Décrivez votre problème ou votre projet.";
const SAMPLE_EN = "Hi, I'm Alex from Un Pro. Tell me about your project.";

export default function PageVoiceLab() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voice settings panel
  const [stability, setStability] = useState(0.52);
  const [similarity, setSimilarity] = useState(0.78);
  const [style, setStyle] = useState(0.30);
  const [speed, setSpeed] = useState(1.0);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  };

  const test = async (voice: VoiceCard, language: "fr" | "en") => {
    try {
      stop();
      setLoadingId(voice.id + ":" + language);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            voice_id: voice.voice_id,
            language,
            test_text: language === "fr" ? SAMPLE_FR : SAMPLE_EN,
            stability,
            similarity_boost: similarity,
            style,
            speed,
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`TTS ${resp.status} ${errText.slice(0, 200)}`);
      }

      const blob = await resp.blob();
      if (!blob.size) throw new Error("Audio vide");

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(voice.id + ":" + language);
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        console.error("[VoiceLab] audio.onerror", { voiceId: voice.voice_id, language });
        toast.error("Lecture impossible — fallback voix par défaut.");
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (e: any) {
      console.error("[VoiceLab] test failed", e);
      toast.error("Test voix échoué", { description: e?.message || "Erreur inconnue" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Voice Lab</h1>
        <p className="text-muted-foreground">
          Tester en direct les voix candidates avant activation en production. Les réglages
          ci-dessous sont appliqués au test seulement.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Réglages de test</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SliderField label="Stabilité" value={stability} min={0.30} max={0.80} step={0.01} onChange={setStability} />
          <SliderField label="Similarité" value={similarity} min={0.50} max={1.00} step={0.01} onChange={setSimilarity} />
          <SliderField label="Style" value={style} min={0} max={0.60} step={0.01} onChange={setStyle} />
          <SliderField label="Vitesse" value={speed} min={0.98} max={1.03} step={0.01} onChange={setSpeed} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {VOICES.map((v) => {
          const isPlayingFr = playingId === v.id + ":fr";
          const isPlayingEn = playingId === v.id + ":en";
          const isLoadingFr = loadingId === v.id + ":fr";
          const isLoadingEn = loadingId === v.id + ":en";
          return (
            <Card key={v.id} className={isPlayingFr || isPlayingEn ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" />
                      {v.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{v.description}</p>
                  </div>
                  <Badge variant={v.gender === "female" ? "secondary" : "outline"} className="text-xs">
                    {v.gender === "female" ? "F" : "M"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">{v.accent}</Badge>
                  <Badge variant="outline" className="text-xs">{v.tone}</Badge>
                  {v.languages.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs uppercase">{l}</Badge>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground truncate" title={v.voice_id}>
                  {v.voice_id}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {isPlayingFr ? (
                    <Button size="sm" variant="destructive" onClick={stop}>
                      <Square className="w-3 h-3 mr-1" /> Stop FR
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => test(v, "fr")} disabled={!!loadingId}>
                      {isLoadingFr ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                      Test FR
                    </Button>
                  )}
                  {isPlayingEn ? (
                    <Button size="sm" variant="destructive" onClick={stop}>
                      <Square className="w-3 h-3 mr-1" /> Stop EN
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => test(v, "en")} disabled={!!loadingId}>
                      {isLoadingEn ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                      Test EN
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value.toFixed(2)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
