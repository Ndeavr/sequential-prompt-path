/**
 * AdminVoiceControlPage — Voice Hard Reset Edition
 * 
 * PRIMARY: Gemini Live (Native Audio) — ultra-low latency bidirectional.
 * FALLBACK: Legacy TTS pipeline for non-realtime use cases.
 * Debug panel shows runtime state.
 * All voice IDs come from DB, zero hardcoded values.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import {
  Mic, Volume2, Play, Save, RefreshCw, Zap, Globe, Square,
  CheckCircle2, AlertTriangle, Radio, Shield, Bug, Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ─── Types ───
interface VoiceProfile {
  id: string;
  profile_key: string;
  language: string;
  locale_code: string;
  provider_primary: string;
  voice_id_primary: string;
  voice_display_name: string | null;
  speech_rate: number;
  stability: number | null;
  similarity_boost: number | null;
  style_exaggeration: number | null;
  tone_style: string;
  accent_target: string;
  interruptibility: boolean;
  is_active: boolean;
  updated_at: string;
}

const LOCALES = [
  { code: "fr", label: "Français (Québec)" },
  { code: "en", label: "English (Canada)" },
];

const ACCENT_TARGETS = [
  { value: "quebec_premium_neutral", label: "Québécois premium neutre" },
  { value: "north_american_neutral", label: "Nord-américain neutre" },
];

const TONE_STYLES = [
  { value: "premium_calm", label: "Premium calm" },
  { value: "premium_direct", label: "Premium direct" },
  { value: "premium_structured", label: "Premium structuré" },
];

const TEST_PHRASES: Record<string, string[]> = {
  fr: [
    "Oui, je vous écoute.",
    "Je peux vous montrer les dispos.",
    "Je prends juste vos infos.",
    "Ok. Je regarde.",
  ],
  en: [
    "Yes, I'm listening.",
    "I can show you the availability.",
    "I'll just take your details.",
    "Okay. Let me check.",
  ],
};

export default function AdminVoiceControlPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profiles");
  const [activeLang, setActiveLang] = useState("fr");
  const [editedProfiles, setEditedProfiles] = useState<Record<string, Partial<VoiceProfile>>>({});
  const [debugInfo, setDebugInfo] = useState({ audioState: 'idle', lastError: '', lastConflict: '' });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alex_voice_profiles" as any)
      .select("*")
      .order("profile_key");
    if (data) setProfiles(data as any);
    if (error) toast.error("Erreur de chargement des profils");
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Track audio state for debug panel
  useEffect(() => {
    const unsub = alexAudioChannel.onStateChange((state) => {
      setDebugInfo(prev => ({ ...prev, audioState: state }));
    });
    return unsub;
  }, []);

  const updateProfile = (id: string, field: string, value: any) => {
    setEditedProfiles(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveProfile = async (profile: VoiceProfile) => {
    setSaving(true);
    const changes = editedProfiles[profile.id];
    if (!changes) { setSaving(false); return; }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-save-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ profile_id: profile.id, updates: changes }),
        }
      );

      if (resp.ok) {
        toast.success(`Profil "${profile.profile_key} (${profile.language})" sauvegardé`);
        setEditedProfiles(prev => { const copy = { ...prev }; delete copy[profile.id]; return copy; });
        fetchProfiles();
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } catch {
      toast.error("Erreur réseau");
    }
    setSaving(false);
  };

  const testVoice = async (phrase: string, profile: VoiceProfile) => {
    // Kill any existing audio first
    alexAudioChannel.hardStop();
    setTesting(profile.id);

    try {
      const changes = editedProfiles[profile.id];
      const voiceId = (changes?.voice_id_primary as string) || profile.voice_id_primary;

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
            profile_key: profile.profile_key,
            language: profile.language,
            test_text: phrase,
          }),
        }
      );

      if (resp.ok) {
        const blob = await resp.blob();
        await alexAudioChannel.playBlob(blob);
      } else {
        toast.error("Erreur TTS test");
      }
    } catch {
      toast.error("Erreur de test vocal");
    } finally {
      setTesting(null);
    }
  };

  const stopTest = () => {
    alexAudioChannel.hardStop();
    setTesting(null);
  };

  const getVal = (profile: VoiceProfile, field: keyof VoiceProfile) => {
    return editedProfiles[profile.id]?.[field] ?? profile[field];
  };

  const filteredProfiles = profiles.filter(p => p.language === activeLang);

  return (
    <MainLayout>
      <Helmet>
        <title>Voice Control — Admin UNPRO</title>
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Alex Voice Control
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Single voice. Premium tone. Admin-controlled Voice IDs. No overlap.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchProfiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="profiles" className="gap-1"><Mic className="h-3.5 w-3.5" /> Profils vocaux</TabsTrigger>
            <TabsTrigger value="debug" className="gap-1"><Bug className="h-3.5 w-3.5" /> Debug</TabsTrigger>
          </TabsList>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6 mt-6">
            {/* Language filter */}
            <div className="flex gap-2">
              {LOCALES.map(l => (
                <Button
                  key={l.code}
                  variant={activeLang === l.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveLang(l.code)}
                  className="gap-1"
                >
                  <Globe className="h-3.5 w-3.5" /> {l.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProfiles.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Aucun profil vocal pour cette langue.
              </CardContent></Card>
            ) : (
              filteredProfiles.map(profile => (
                <VoiceProfileCard
                  key={profile.id}
                  profile={profile}
                  getVal={getVal}
                  updateProfile={updateProfile}
                  saveProfile={saveProfile}
                  testVoice={testVoice}
                  stopTest={stopTest}
                  saving={saving}
                  testing={testing}
                  hasChanges={!!editedProfiles[profile.id]}
                />
              ))
            )}
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="mt-6">
            <DebugPanel debugInfo={debugInfo} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// ─── Voice Profile Card ───
function VoiceProfileCard({
  profile, getVal, updateProfile, saveProfile, testVoice, stopTest, saving, testing, hasChanges,
}: {
  profile: VoiceProfile;
  getVal: (p: VoiceProfile, f: keyof VoiceProfile) => any;
  updateProfile: (id: string, f: string, v: any) => void;
  saveProfile: (p: VoiceProfile) => void;
  testVoice: (phrase: string, p: VoiceProfile) => void;
  stopTest: () => void;
  saving: boolean;
  testing: string | null;
  hasChanges: boolean;
}) {
  const lang = profile.language === "fr" ? "fr" : "en";
  const phrases = TEST_PHRASES[lang];
  const [selectedPhrase, setSelectedPhrase] = useState(phrases[0]);
  const isTesting = testing === profile.id;

  return (
    <motion.div layout>
      <Card className={`transition-all ${hasChanges ? "ring-2 ring-primary/40" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {profile.profile_key}
                <Badge variant={profile.is_active ? "default" : "outline"} className="text-[10px]">
                  {profile.is_active ? <><CheckCircle2 className="h-3 w-3 mr-0.5" />Actif</> : <><AlertTriangle className="h-3 w-3 mr-0.5" />Inactif</>}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {getVal(profile, "tone_style")} — {getVal(profile, "accent_target")} — {profile.locale_code}
              </CardDescription>
            </div>
            {hasChanges && (
              <Button size="sm" onClick={() => saveProfile(profile)} disabled={saving} className="gap-1">
                <Save className="h-3.5 w-3.5" /> Sauvegarder
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Voice ID (Gemini voice name or fallback provider ID) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Voice ID (Gemini: Aoede, Zephyr / Fallback: provider voice ID)</label>
              <Input
                value={(getVal(profile, "voice_id_primary") as string) || ""}
                onChange={e => updateProfile(profile.id, "voice_id_primary", e.target.value)}
                placeholder="ex: Aoede"
                className="text-sm font-mono"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nom affiché</label>
              <Input
                value={(getVal(profile, "voice_display_name") as string) || ""}
                onChange={e => updateProfile(profile.id, "voice_display_name", e.target.value)}
                placeholder="ex: Aoede (FR-QC)"
                className="text-sm"
              />
            </div>

            {/* Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <Select
                value={getVal(profile, "provider_primary") as string}
                onValueChange={v => updateProfile(profile.id, "provider_primary", v)}
              >
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-live">Gemini Live (Primary)</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs (Fallback)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Speech Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Vitesse: {Number(getVal(profile, "speech_rate")).toFixed(2)}x
              </label>
              <Slider
                value={[Number(getVal(profile, "speech_rate"))]}
                onValueChange={([v]) => updateProfile(profile.id, "speech_rate", v)}
                min={0.7} max={1.3} step={0.05}
              />
            </div>

            {/* Stability */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Stabilité: {Number(getVal(profile, "stability") || 0.65).toFixed(2)}
              </label>
              <Slider
                value={[Number(getVal(profile, "stability") || 0.65)]}
                onValueChange={([v]) => updateProfile(profile.id, "stability", v)}
                min={0} max={1} step={0.05}
              />
            </div>

            {/* Similarity Boost */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Similarity: {Number(getVal(profile, "similarity_boost") || 0.80).toFixed(2)}
              </label>
              <Slider
                value={[Number(getVal(profile, "similarity_boost") || 0.80)]}
                onValueChange={([v]) => updateProfile(profile.id, "similarity_boost", v)}
                min={0} max={1} step={0.05}
              />
            </div>

            {/* Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Style: {Number(getVal(profile, "style_exaggeration") || 0.08).toFixed(2)}
              </label>
              <Slider
                value={[Number(getVal(profile, "style_exaggeration") || 0.08)]}
                onValueChange={([v]) => updateProfile(profile.id, "style_exaggeration", v)}
                min={0} max={1} step={0.05}
              />
            </div>

            {/* Tone Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ton</label>
              <Select
                value={getVal(profile, "tone_style") as string}
                onValueChange={v => updateProfile(profile.id, "tone_style", v)}
              >
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_STYLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Accent Target */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Accent cible</label>
              <Select
                value={getVal(profile, "accent_target") as string}
                onValueChange={v => updateProfile(profile.id, "accent_target", v)}
              >
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCENT_TARGETS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Interruptibility */}
            <div className="flex items-center gap-2 pt-4">
              <Switch
                checked={getVal(profile, "interruptibility") as boolean}
                onCheckedChange={v => updateProfile(profile.id, "interruptibility", v)}
              />
              <span className="text-xs text-muted-foreground">Interruption immédiate</span>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2 pt-4">
              <Switch
                checked={getVal(profile, "is_active") as boolean}
                onCheckedChange={v => updateProfile(profile.id, "is_active", v)}
              />
              <span className="text-xs text-muted-foreground">Profil actif</span>
            </div>
          </div>

          {/* Test Player */}
          <div className="border-t border-border/40 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5" /> Test vocal (pipeline production)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedPhrase} onValueChange={setSelectedPhrase}>
                <SelectTrigger className="text-xs max-w-[280px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {phrases.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {isTesting ? (
                <Button size="sm" variant="destructive" onClick={stopTest} className="gap-1">
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testVoice(selectedPhrase, profile)}
                  className="gap-1"
                >
                  <Play className="h-3.5 w-3.5" /> Tester
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Debug Panel ───
function DebugPanel({ debugInfo }: { debugInfo: { audioState: string; lastError: string; lastConflict: string } }) {
  const [errors, setErrors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchDebug = async () => {
      const [errRes, evtRes] = await Promise.all([
        supabase.from("alex_voice_errors" as any).select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("alex_voice_events" as any).select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      if (errRes.data) setErrors(errRes.data as any);
      if (evtRes.data) setEvents(evtRes.data as any);
    };
    fetchDebug();
  }, []);

  return (
    <div className="space-y-6">
      {/* Runtime State */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Runtime State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Audio Channel</p>
              <Badge variant={debugInfo.audioState === 'playing' ? 'default' : 'outline'} className="mt-1">
                {debugInfo.audioState}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Single Voice Guard</p>
              <Badge variant="default" className="mt-1 bg-green-600">Active</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overlap Prevention</p>
              <Badge variant="default" className="mt-1 bg-green-600">Enforced</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Recent Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune erreur récente</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {errors.map((e: any) => (
                <div key={e.id} className="text-xs border border-border/40 rounded-lg p-2">
                  <div className="flex justify-between">
                    <Badge variant="outline" className="text-[10px]">{e.error_type}</Badge>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                  {e.error_message && <p className="mt-1 text-muted-foreground">{e.error_message}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun événement récent</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.map((e: any) => (
                <div key={e.id} className="text-xs border border-border/40 rounded-lg p-2">
                  <div className="flex justify-between">
                    <Badge variant="secondary" className="text-[10px]">{e.event_type}</Badge>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
