/**
 * PanelVoiceToneControl
 * Admin panel for voice tone standardization — accent, pacing, Quebec flavor.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Volume2, Play, Shield, Gauge, Globe, Sparkles, Mic } from "lucide-react";
import {
  preprocessTextForTone,
  buildToneSystemPrompt,
  getDefaultToneConfig,
  type VoiceToneConfig,
} from "@/services/alex/alexVoiceToneService";

const FLAVOR_LABELS = ["International pur", "Neutre + QC subtil", "Québécois léger"];

const TEST_SENTENCES_FR = [
  "Bonjour. Je suis Alex, votre assistant UNPRO.",
  "Je peux vous aider à trouver le bon entrepreneur pour votre projet.",
  "Bienvenue sur UNPRO. Décrivez-moi votre problème.",
  "Votre copropriété nécessite une inspection complète.",
  "Le fonds de prévoyance est à jour. Aucune action urgente.",
  "Nous avons trouvé trois entrepreneurs qualifiés dans votre secteur.",
];

const TEST_SENTENCES_EN = [
  "Hello. I'm Alex, your UNPRO assistant.",
  "I can help you find the right contractor for your project.",
  "Welcome to UNPRO. Tell me about your issue.",
];

export default function PanelVoiceToneControl() {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [testText, setTestText] = useState(TEST_SENTENCES_FR[0]);
  const [testLang, setTestLang] = useState("fr");
  const [previewResult, setPreviewResult] = useState("");
  const [toneConfig, setToneConfig] = useState<VoiceToneConfig>(getDefaultToneConfig("fr"));

  // Load profiles
  const { data: profiles } = useQuery({
    queryKey: ["voice-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("alex_voice_profiles").select("*").eq("is_active", true).order("profile_key");
      return data ?? [];
    },
  });

  // Load tone settings for selected profile
  const { data: toneSettings } = useQuery({
    queryKey: ["voice-tone-settings", selectedProfile],
    queryFn: async () => {
      if (!selectedProfile) return null;
      const { data } = await supabase
        .from("alex_voice_tone_settings")
        .select("*")
        .eq("voice_profile_id", selectedProfile)
        .eq("is_active", true)
        .limit(1)
        .single();
      return data;
    },
    enabled: !!selectedProfile,
  });

  // Load render logs
  const { data: renderLogs } = useQuery({
    queryKey: ["voice-render-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alex_voice_render_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (toneSettings) {
      setToneConfig({
        speechRate: Number(toneSettings.speech_rate),
        pitch: Number(toneSettings.pitch),
        quebecFlavorLevel: toneSettings.quebec_flavor_level,
        neutralAccentEnabled: toneSettings.neutral_accent_enabled,
        warmth: Number(toneSettings.warmth),
        energy: Number(toneSettings.energy),
        formality: Number(toneSettings.formality),
        pacingStyle: toneSettings.pacing_style,
      });
    }
  }, [toneSettings]);

  useEffect(() => {
    if (profiles?.length && !selectedProfile) {
      const defaultP = profiles.find((p: any) => p.accent_target === "quebec_premium_neutral" && p.language === "fr");
      if (defaultP) setSelectedProfile(defaultP.id);
    }
  }, [profiles, selectedProfile]);

  // Save tone settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfile) return;
      const existing = toneSettings?.id;
      if (existing) {
        await supabase.from("alex_voice_tone_settings").update({
          speech_rate: toneConfig.speechRate,
          pitch: toneConfig.pitch,
          quebec_flavor_level: toneConfig.quebecFlavorLevel,
          neutral_accent_enabled: toneConfig.neutralAccentEnabled,
          warmth: toneConfig.warmth,
          energy: toneConfig.energy,
          formality: toneConfig.formality,
          pacing_style: toneConfig.pacingStyle,
          updated_at: new Date().toISOString(),
        }).eq("id", existing);
      } else {
        await supabase.from("alex_voice_tone_settings").insert({
          voice_profile_id: selectedProfile,
          speech_rate: toneConfig.speechRate,
          pitch: toneConfig.pitch,
          quebec_flavor_level: toneConfig.quebecFlavorLevel,
          neutral_accent_enabled: toneConfig.neutralAccentEnabled,
          warmth: toneConfig.warmth,
          energy: toneConfig.energy,
          formality: toneConfig.formality,
          pacing_style: toneConfig.pacingStyle,
        });
      }
    },
    onSuccess: () => {
      toast.success("Configuration de ton sauvegardée");
      queryClient.invalidateQueries({ queryKey: ["voice-tone-settings"] });
    },
    onError: () => toast.error("Erreur de sauvegarde"),
  });

  // Update profile neutral accent mode
  const updateProfileMutation = useMutation({
    mutationFn: async (params: { profileId: string; quebecFlavor: number; neutralAccent: boolean }) => {
      await supabase.from("alex_voice_profiles").update({
        quebec_flavor_level: params.quebecFlavor,
        neutral_accent_mode: params.neutralAccent,
      }).eq("id", params.profileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-profiles"] });
      toast.success("Profil mis à jour");
    },
  });

  const handlePreview = () => {
    const processed = preprocessTextForTone(testText, testLang, toneConfig);
    setPreviewResult(processed);
  };

  const handleTestSentence = (sentence: string) => {
    setTestText(sentence);
    const processed = preprocessTextForTone(sentence, testLang, toneConfig);
    setPreviewResult(processed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Standardisation du ton vocal</h2>
            <p className="text-sm text-muted-foreground">Contrôle d'accent, rythme et diction premium</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Shield className="h-3 w-3" /> Accent neutre actif
        </Badge>
      </div>

      <Tabs defaultValue="control" className="space-y-4">
        <TabsList>
          <TabsTrigger value="control">Contrôle</TabsTrigger>
          <TabsTrigger value="testing">Test vocal</TabsTrigger>
          <TabsTrigger value="profiles">Profils</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* ─── CONTROL TAB ─── */}
        <TabsContent value="control" className="space-y-4">
          {/* Profile selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Profil vocal actif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un profil" /></SelectTrigger>
                <SelectContent>
                  {profiles?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.voice_display_name || p.profile_key} — {p.language?.toUpperCase()} ({p.accent_target})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Accent control */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Contrôle d'accent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Mode accent neutre</p>
                  <p className="text-xs text-muted-foreground">Supprime les marqueurs régionaux automatiquement</p>
                </div>
                <Switch
                  checked={toneConfig.neutralAccentEnabled}
                  onCheckedChange={(v) => setToneConfig((c) => ({ ...c, neutralAccentEnabled: v }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Niveau Québec</p>
                  <Badge variant="outline" className="text-xs">
                    {FLAVOR_LABELS[toneConfig.quebecFlavorLevel]}
                  </Badge>
                </div>
                <Slider
                  value={[toneConfig.quebecFlavorLevel]}
                  onValueChange={([v]) => setToneConfig((c) => ({ ...c, quebecFlavorLevel: v }))}
                  min={0}
                  max={2}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>International</span>
                  <span>Subtil</span>
                  <span>Léger</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Speech pacing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" /> Rythme et diction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">Vitesse de parole</p>
                  <span className="text-xs text-muted-foreground">{toneConfig.speechRate.toFixed(2)}x</span>
                </div>
                <Slider
                  value={[toneConfig.speechRate * 100]}
                  onValueChange={([v]) => setToneConfig((c) => ({ ...c, speechRate: v / 100 }))}
                  min={85}
                  max={110}
                  step={1}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "warmth", label: "Chaleur", icon: "🔥" },
                  { key: "energy", label: "Énergie", icon: "⚡" },
                  { key: "formality", label: "Formalité", icon: "🎯" },
                ].map(({ key, label, icon }) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{icon} {label}</p>
                    <Slider
                      value={[(toneConfig as any)[key] * 100]}
                      onValueChange={([v]) => setToneConfig((c) => ({ ...c, [key]: v / 100 }))}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <span className="text-[10px] text-muted-foreground">{((toneConfig as any)[key] * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? "Sauvegarde…" : "Sauvegarder la configuration"}
          </Button>
        </TabsContent>

        {/* ─── TESTING TAB ─── */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" /> Test de tonalité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={testLang === "fr" ? "default" : "outline"}
                  onClick={() => { setTestLang("fr"); setTestText(TEST_SENTENCES_FR[0]); }}
                >
                  Français
                </Button>
                <Button
                  size="sm"
                  variant={testLang === "en" ? "default" : "outline"}
                  onClick={() => { setTestLang("en"); setTestText(TEST_SENTENCES_EN[0]); }}
                >
                  English
                </Button>
              </div>

              <Textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Entrez du texte à tester…"
                rows={3}
              />

              <Button onClick={handlePreview} className="gap-2 w-full">
                <Play className="h-4 w-4" /> Prévisualiser le preprocessing
              </Button>

              {previewResult && (
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Texte original</p>
                    <p className="text-sm text-foreground">{testText}</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-primary">Texte envoyé au TTS</p>
                    <p className="text-sm text-foreground">{previewResult}</p>
                  </div>
                </div>
              )}

              {/* System prompt preview */}
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Instructions ton (system prompt)</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {buildToneSystemPrompt(testLang, toneConfig)}
                </pre>
              </div>

              {/* Quick test sentences */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Phrases de test rapide :</p>
                <div className="flex flex-wrap gap-1.5">
                  {(testLang === "fr" ? TEST_SENTENCES_FR : TEST_SENTENCES_EN).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleTestSentence(s)}
                      className="text-xs border border-border/40 rounded-full px-3 py-1 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {s.slice(0, 40)}…
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PROFILES TAB ─── */}
        <TabsContent value="profiles" className="space-y-4">
          {profiles?.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.voice_display_name || p.profile_key}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.language?.toUpperCase()} · {p.accent_target} · {p.tone_style}
                    </p>
                  </div>
                  <Badge variant={p.neutral_accent_mode ? "default" : "outline"} className="text-xs">
                    {p.neutral_accent_mode ? "Neutre ✓" : "Standard"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Niveau QC: {FLAVOR_LABELS[p.quebec_flavor_level ?? 1]}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => updateProfileMutation.mutate({
                      profileId: p.id,
                      quebecFlavor: Math.min((p.quebec_flavor_level ?? 1) === 0 ? 1 : 0, 2),
                      neutralAccent: true,
                    })}
                  >
                    Basculer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── LOGS TAB ─── */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Logs de rendu vocal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!renderLogs?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun log de rendu vocal</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {renderLogs.map((log: any) => (
                    <div key={log.id} className="rounded-lg bg-muted/20 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={log.success ? "default" : "destructive"} className="text-[10px]">
                          {log.success ? "OK" : "Erreur"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {log.language_code?.toUpperCase()} · {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground line-clamp-1">{log.text_input}</p>
                      {log.text_preprocessed !== log.text_input && (
                        <p className="text-xs text-primary/70 line-clamp-1">→ {log.text_preprocessed}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
