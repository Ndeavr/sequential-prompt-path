/**
 * PageAdminAlexSpeechTuning — Admin calibration panel for Alex voice.
 * View/edit pronunciation rules, voice settings, greeting rules, and turn logs.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Volume2, Globe, Clock, BookOpen, Activity, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PronunciationRule {
  id: string;
  language_code: string;
  source_text: string;
  normalized_text: string;
  phonetic_hint: string | null;
  priority: number;
  active: boolean;
}

interface VoiceSetting {
  id: string;
  profile_name: string;
  device_type: string;
  language_default: string;
  start_speech_threshold: number;
  end_speech_threshold: number;
  min_speech_ms: number;
  max_silence_gap_ms: number;
  interrupt_threshold_ms: number;
  first_reply_boost: boolean;
  tts_voice_name: string;
  active: boolean;
}

interface GreetingRule {
  id: string;
  start_hour: number;
  end_hour: number;
  greeting_text_fr: string;
  greeting_text_en: string;
  active: boolean;
}

export default function PageAdminAlexSpeechTuning() {
  const [rules, setRules] = useState<PronunciationRule[]>([]);
  const [settings, setSettings] = useState<VoiceSetting[]>([]);
  const [greetings, setGreetings] = useState<GreetingRule[]>([]);
  const [newRule, setNewRule] = useState({ source: "", normalized: "", hint: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [rulesRes, settingsRes, greetingsRes] = await Promise.all([
      supabase.from("alex_pronunciation_rules").select("*").order("priority", { ascending: false }),
      supabase.from("alex_voice_settings").select("*").order("created_at"),
      supabase.from("alex_greeting_rules").select("*").order("start_hour"),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as PronunciationRule[]);
    if (settingsRes.data) setSettings(settingsRes.data as VoiceSetting[]);
    if (greetingsRes.data) setGreetings(greetingsRes.data as GreetingRule[]);
    setLoading(false);
  }

  async function addRule() {
    if (!newRule.source || !newRule.normalized) return;
    const { error } = await supabase.from("alex_pronunciation_rules").insert({
      source_text: newRule.source,
      normalized_text: newRule.normalized,
      phonetic_hint: newRule.hint || null,
      language_code: "fr-CA",
      priority: 50,
    });
    if (error) {
      toast.error("Erreur ajout règle");
    } else {
      toast.success("Règle ajoutée");
      setNewRule({ source: "", normalized: "", hint: "" });
      loadAll();
    }
  }

  async function toggleRule(id: string, active: boolean) {
    await supabase.from("alex_pronunciation_rules").update({ active }).eq("id", id);
    setRules(prev => prev.map(r => r.id === id ? { ...r, active } : r));
  }

  async function deleteRule(id: string) {
    await supabase.from("alex_pronunciation_rules").delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success("Règle supprimée");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alex Speech Tuning</h1>
        <p className="text-sm text-muted-foreground">Calibration voix, prononciation, salutations et seuils</p>
      </div>

      <Tabs defaultValue="pronunciation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pronunciation" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" /> Diction
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Mic className="h-3 w-3 mr-1" /> Seuils
          </TabsTrigger>
          <TabsTrigger value="greetings" className="text-xs">
            <Clock className="h-3 w-3 mr-1" /> Salutations
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">
            <Volume2 className="h-3 w-3 mr-1" /> Presets
          </TabsTrigger>
        </TabsList>

        {/* Pronunciation Rules */}
        <TabsContent value="pronunciation" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ajouter une règle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Mot source (ex: renoration)"
                  value={newRule.source}
                  onChange={e => setNewRule(p => ({ ...p, source: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  placeholder="Correction (ex: rénovation)"
                  value={newRule.normalized}
                  onChange={e => setNewRule(p => ({ ...p, normalized: e.target.value }))}
                  className="text-sm"
                />
                <div className="flex gap-1">
                  <Input
                    placeholder="Phonétique"
                    value={newRule.hint}
                    onChange={e => setNewRule(p => ({ ...p, hint: e.target.value }))}
                    className="text-sm"
                  />
                  <Button size="sm" onClick={addRule}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50 text-sm">
                  <Switch checked={rule.active} onCheckedChange={v => toggleRule(rule.id, v)} />
                  <span className="text-destructive line-through font-mono">{rule.source_text}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary font-semibold">{rule.normalized_text}</span>
                  {rule.phonetic_hint && (
                    <Badge variant="outline" className="text-[10px]">{rule.phonetic_hint}</Badge>
                  )}
                  <span className="ml-auto text-muted-foreground text-[10px]">p{rule.priority}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="h-6 w-6 p-0">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Voice Settings */}
        <TabsContent value="settings" className="space-y-4">
          {settings.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{s.profile_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.active ? "default" : "secondary"}>
                      {s.active ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge variant="outline">{s.device_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Start Speech</span>
                    <span className="font-mono">{s.start_speech_threshold}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>End Speech</span>
                    <span className="font-mono">{s.end_speech_threshold}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Min Speech</span>
                    <span className="font-mono">{s.min_speech_ms}ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Max Silence</span>
                    <span className="font-mono">{s.max_silence_gap_ms}ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Interrupt</span>
                    <span className="font-mono">{s.interrupt_threshold_ms}ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Voix TTS</span>
                    <span className="font-mono">{s.tts_voice_name}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>Langue</span>
                    <span className="font-mono">{s.language_default}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/50 rounded">
                    <span>1st Reply Boost</span>
                    <span className="font-mono">{s.first_reply_boost ? "✓" : "✗"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Greeting Rules */}
        <TabsContent value="greetings" className="space-y-4">
          {greetings.map(g => (
            <Card key={g.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{g.greeting_text_fr}</p>
                      <p className="text-xs text-muted-foreground">{g.greeting_text_en}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {g.start_hour}h — {g.end_hour}h
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="text-center text-xs text-muted-foreground">
                <Globe className="h-5 w-5 mx-auto mb-1 text-muted-foreground/50" />
                Les salutations sont automatiques selon l'heure locale de l'utilisateur.
                <br />Actuellement : <strong>{new Date().getHours() >= 18 || new Date().getHours() < 5 ? "Bonsoir" : new Date().getHours() >= 12 ? "Bon après-midi" : "Bonjour"}</strong>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presets */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid gap-3">
            {settings.map(s => (
              <Card key={s.id} className={s.active ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{s.profile_name}</p>
                      <p className="text-xs text-muted-foreground">{s.device_type} • {s.language_default} • Silence: {s.max_silence_gap_ms}ms</p>
                    </div>
                    <Badge variant={s.active ? "default" : "secondary"}>
                      {s.active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
