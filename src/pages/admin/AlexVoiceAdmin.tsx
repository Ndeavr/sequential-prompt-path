import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Volume2, Zap, Languages, Shield, Settings2 } from "lucide-react";

export default function AlexVoiceAdmin() {
  // VAD Settings
  const [silenceDurationMs, setSilenceDurationMs] = useState(180);
  const [prefixPaddingMs, setPrefixPaddingMs] = useState(30);
  const [startSensitivity, setStartSensitivity] = useState("LOW");
  const [endSensitivity, setEndSensitivity] = useState("LOW");

  // Noise Gate
  const [noiseFloorDb, setNoiseFloorDb] = useState(-50);
  const [speechOpenThreshold, setSpeechOpenThreshold] = useState(0.18);
  const [speechCloseThreshold, setSpeechCloseThreshold] = useState(0.08);
  const [minimumOpenMs, setMinimumOpenMs] = useState(180);
  const [trailingCloseMs, setTrailingCloseMs] = useState(450);

  // Phrase Boosts
  const [phraseBoosts, setPhraseBoosts] = useState<any[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [newBoostLevel, setNewBoostLevel] = useState("high");
  const [newCategory, setNewCategory] = useState("trade");

  // Transcript Rules
  const [transcriptRules, setTranscriptRules] = useState<any[]>([]);
  const [newSource, setNewSource] = useState("");
  const [newNormalized, setNewNormalized] = useState("");

  // Voice Turns (logs)
  const [recentTurns, setRecentTurns] = useState<any[]>([]);

  // Active preset
  const [activePreset, setActivePreset] = useState("production_frca");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [boosts, rules, turns] = await Promise.all([
      supabase.from("alex_phrase_boosts").select("*").eq("is_active", true).order("category"),
      supabase.from("alex_transcript_rules").select("*").eq("is_active", true).order("priority", { ascending: false }),
      supabase.from("alex_voice_turns").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (boosts.data) setPhraseBoosts(boosts.data);
    if (rules.data) setTranscriptRules(rules.data);
    if (turns.data) setRecentTurns(turns.data);
  };

  const addPhraseBoost = async () => {
    if (!newPhrase.trim()) return;
    await supabase.from("alex_phrase_boosts").insert({
      phrase: newPhrase.trim(),
      boost_level: newBoostLevel,
      category: newCategory,
      locale: "fr-CA",
    });
    setNewPhrase("");
    loadData();
  };

  const addTranscriptRule = async () => {
    if (!newSource.trim() || !newNormalized.trim()) return;
    await supabase.from("alex_transcript_rules").insert({
      source_text: newSource.trim(),
      normalized_text: newNormalized.trim(),
      locale: "fr-CA",
      rule_type: "replacement",
      priority: 150,
    });
    setNewSource("");
    setNewNormalized("");
    loadData();
  };

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    switch (preset) {
      case "ultra_fast_android":
        setSilenceDurationMs(140);
        setPrefixPaddingMs(20);
        setSpeechOpenThreshold(0.15);
        setTrailingCloseMs(350);
        break;
      case "stable_ios":
        setSilenceDurationMs(200);
        setPrefixPaddingMs(40);
        setSpeechOpenThreshold(0.18);
        setTrailingCloseMs(450);
        break;
      case "desktop_stable":
        setSilenceDurationMs(240);
        setPrefixPaddingMs(40);
        setSpeechOpenThreshold(0.18);
        setTrailingCloseMs(500);
        break;
      default: // production_frca
        setSilenceDurationMs(180);
        setPrefixPaddingMs(30);
        setSpeechOpenThreshold(0.18);
        setTrailingCloseMs(450);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Alex Voice Admin</h1>
        <Badge variant="outline" className="ml-auto">Professional Stack</Badge>
      </div>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Presets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { key: "production_frca", label: "Production FR-CA" },
            { key: "ultra_fast_android", label: "Ultra Fast Android" },
            { key: "stable_ios", label: "Stable iOS" },
            { key: "desktop_stable", label: "Desktop Stable" },
          ].map(p => (
            <Button
              key={p.key}
              variant={activePreset === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="vad" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="vad"><Mic className="h-3 w-3 mr-1" />VAD</TabsTrigger>
          <TabsTrigger value="noise"><Shield className="h-3 w-3 mr-1" />Bruit</TabsTrigger>
          <TabsTrigger value="phrases"><Languages className="h-3 w-3 mr-1" />Phrases</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* VAD Controls */}
        <TabsContent value="vad">
          <Card>
            <CardHeader>
              <CardTitle>Voice Activity Detection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Silence Duration: {silenceDurationMs}ms</Label>
                <Slider
                  value={[silenceDurationMs]}
                  onValueChange={([v]) => setSilenceDurationMs(v)}
                  min={80}
                  max={500}
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  Plus bas = plus rapide mais risque de couper. Plus haut = plus stable.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Prefix Padding: {prefixPaddingMs}ms</Label>
                <Slider
                  value={[prefixPaddingMs]}
                  onValueChange={([v]) => setPrefixPaddingMs(v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Sensitivity</Label>
                  <div className="flex gap-2">
                    {["LOW", "HIGH"].map(s => (
                      <Button
                        key={s}
                        variant={startSensitivity === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStartSensitivity(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Sensitivity</Label>
                  <div className="flex gap-2">
                    {["LOW", "HIGH"].map(s => (
                      <Button
                        key={s}
                        variant={endSensitivity === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEndSensitivity(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Noise Gate */}
        <TabsContent value="noise">
          <Card>
            <CardHeader>
              <CardTitle>Noise Gate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Noise Floor: {noiseFloorDb}dB</Label>
                <Slider value={[noiseFloorDb]} onValueChange={([v]) => setNoiseFloorDb(v)} min={-70} max={-20} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Speech Open Threshold: {speechOpenThreshold}</Label>
                <Slider value={[speechOpenThreshold * 100]} onValueChange={([v]) => setSpeechOpenThreshold(v / 100)} min={5} max={50} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Speech Close Threshold: {speechCloseThreshold}</Label>
                <Slider value={[speechCloseThreshold * 100]} onValueChange={([v]) => setSpeechCloseThreshold(v / 100)} min={2} max={30} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Minimum Open: {minimumOpenMs}ms</Label>
                <Slider value={[minimumOpenMs]} onValueChange={([v]) => setMinimumOpenMs(v)} min={50} max={500} step={10} />
              </div>
              <div className="space-y-2">
                <Label>Trailing Close: {trailingCloseMs}ms</Label>
                <Slider value={[trailingCloseMs]} onValueChange={([v]) => setTrailingCloseMs(v)} min={200} max={800} step={10} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phrase Boosts */}
        <TabsContent value="phrases">
          <Card>
            <CardHeader>
              <CardTitle>Phrase Boosts FR-CA ({phraseBoosts.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nouvelle phrase..."
                  value={newPhrase}
                  onChange={e => setNewPhrase(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="border rounded px-2 text-sm bg-background"
                >
                  <option value="city">Ville</option>
                  <option value="trade">Métier</option>
                  <option value="acronym">Acronyme</option>
                  <option value="brand">Marque</option>
                </select>
                <Button onClick={addPhraseBoost} size="sm">Ajouter</Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {phraseBoosts.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 text-sm">
                    <span className="font-medium">{b.phrase}</span>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">{b.category}</Badge>
                      <Badge variant={b.boost_level === "high" ? "default" : "outline"} className="text-xs">
                        {b.boost_level}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Rules */}
        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Transcript Normalization Rules ({transcriptRules.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Mot source (ex: renoration)"
                  value={newSource}
                  onChange={e => setNewSource(e.target.value)}
                  className="flex-1"
                />
                <span className="flex items-center text-muted-foreground">→</span>
                <Input
                  placeholder="Correction (ex: rénovation)"
                  value={newNormalized}
                  onChange={e => setNewNormalized(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addTranscriptRule} size="sm">+</Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {transcriptRules.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-1 px-2 rounded hover:bg-muted/50 text-sm">
                    <span className="text-destructive line-through">{r.source_text}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary font-medium">{r.normalized_text}</span>
                    <Badge variant="outline" className="text-xs ml-auto">p{r.priority}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Turn Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Voice Turns</span>
                <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTurns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun tour vocal enregistré.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentTurns.map(t => (
                    <div key={t.id} className="border rounded p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">Tour {t.turn_index}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.transcript_confidence ? `${(t.transcript_confidence * 100).toFixed(0)}% conf.` : ""}
                        </span>
                      </div>
                      {t.raw_transcript && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Brut: </span>
                          <span className="text-destructive">{t.raw_transcript}</span>
                        </div>
                      )}
                      {t.cleaned_transcript && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Nettoyé: </span>
                          <span className="text-primary">{t.cleaned_transcript}</span>
                        </div>
                      )}
                      {t.response_text && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Alex: </span>
                          <span>{t.response_text}</span>
                        </div>
                      )}
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {t.interrupted && <Badge variant="destructive" className="text-xs">Interrompu</Badge>}
                        {t.pronunciation_fixes > 0 && (
                          <Badge variant="secondary" className="text-xs">{t.pronunciation_fixes} corrections</Badge>
                        )}
                        <span>{t.detected_language}</span>
                      </div>
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
