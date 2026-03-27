/**
 * AdminVoiceControlPage — Edit voice profiles, change voice IDs, test voices live, switch providers.
 */
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Mic, Volume2, Play, Save, RefreshCw, Zap, Globe, Settings2,
  ChevronRight, CheckCircle2, AlertTriangle, Radio,
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
  voice_name_primary: string | null;
  voice_name_secondary: string | null;
  speech_rate: number;
  speech_style: string;
  interruptibility_mode: string;
  provider_preference_order: string[];
  prosody_profile: Record<string, number>;
  is_active: boolean;
}

interface ProviderEntry {
  id: string;
  provider_key: string;
  model_name: string;
  is_active: boolean;
  priority_order: number;
  supports_realtime_audio: boolean;
  supports_barge_in: boolean;
  transport_mode: string;
  rollout_percentage: number;
}

const LOCALES = [
  { code: "fr-QC", label: "Français (Québec)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "en-US", label: "English (US)" },
];

const TEST_PHRASES: Record<string, string[]> = {
  fr: [
    "Oui, je vous écoute.",
    "Je peux vous montrer les dispos.",
    "Ok. Je regarde.",
    "J'ai quelque chose pour vous.",
  ],
  en: [
    "Yes, I'm listening.",
    "I can show you the availability.",
    "Okay. Let me check.",
    "I've got something for you.",
  ],
};

export default function AdminVoiceControlPage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [providers, setProviders] = useState<ProviderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeLocale, setActiveLocale] = useState("fr-QC");
  const [editedProfiles, setEditedProfiles] = useState<Record<string, Partial<VoiceProfile>>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [profilesRes, providersRes] = await Promise.all([
      supabase.from("alex_voice_profile_configs" as any).select("*").order("profile_key"),
      supabase.from("alex_voice_provider_registry" as any).select("*").order("priority_order"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as any);
    if (providersRes.data) setProviders(providersRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

    const { error } = await supabase
      .from("alex_voice_profile_configs" as any)
      .update(changes)
      .eq("id", profile.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(`Profil "${profile.profile_key}" mis à jour`);
      setEditedProfiles(prev => { const copy = { ...prev }; delete copy[profile.id]; return copy; });
      fetchData();
    }
    setSaving(false);
  };

  const testVoice = async (phrase: string, profileKey: string) => {
    setTesting(profileKey);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: phrase, voiceId: "JBFqnCBsd6RMkjVDRZzb" }),
        }
      );
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); setTesting(null); };
        await audio.play();
      } else {
        toast.error("Erreur TTS");
        setTesting(null);
      }
    } catch {
      toast.error("Erreur de test vocal");
      setTesting(null);
    }
  };

  const toggleProvider = async (provider: ProviderEntry) => {
    const { error } = await supabase
      .from("alex_voice_provider_registry" as any)
      .update({ is_active: !provider.is_active })
      .eq("id", provider.id);
    if (error) toast.error("Erreur"); else { toast.success(`${provider.provider_key} ${!provider.is_active ? "activé" : "désactivé"}`); fetchData(); }
  };

  const getVal = (profile: VoiceProfile, field: keyof VoiceProfile) => {
    return editedProfiles[profile.id]?.[field] ?? profile[field];
  };

  const filteredProfiles = profiles.filter(p => p.locale_code === activeLocale);

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
              <Mic className="h-6 w-6 text-primary" />
              Voice Control Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez les voix Alex en temps réel. Changements appliqués immédiatement.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>

        {/* Locale Tabs */}
        <Tabs value={activeLocale} onValueChange={setActiveLocale}>
          <TabsList>
            {LOCALES.map(l => (
              <TabsTrigger key={l.code} value={l.code} className="gap-1">
                <Globe className="h-3.5 w-3.5" /> {l.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {LOCALES.map(locale => (
            <TabsContent key={locale.code} value={locale.code} className="space-y-6 mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProfiles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Aucun profil vocal pour {locale.label}. Les profils sont définis dans la table alex_voice_profile_configs.
                  </CardContent>
                </Card>
              ) : (
                filteredProfiles.map(profile => (
                  <VoiceProfileCard
                    key={profile.id}
                    profile={profile}
                    getVal={getVal}
                    updateProfile={updateProfile}
                    saveProfile={saveProfile}
                    testVoice={testVoice}
                    saving={saving}
                    testing={testing}
                    hasChanges={!!editedProfiles[profile.id]}
                    locale={locale}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Providers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" /> Providers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map(p => (
              <motion.div key={p.id} layout>
                <Card className={`transition-all ${p.is_active ? "border-primary/30" : "opacity-60"}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.provider_key}</p>
                        <p className="text-xs text-muted-foreground">{p.model_name}</p>
                      </div>
                      <Switch checked={p.is_active} onCheckedChange={() => toggleProvider(p)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{p.transport_mode}</Badge>
                      {p.supports_realtime_audio && <Badge variant="secondary" className="text-[10px]">Realtime</Badge>}
                      {p.supports_barge_in && <Badge variant="secondary" className="text-[10px]">Barge-in</Badge>}
                      <Badge variant="outline" className="text-[10px]">P{p.priority_order}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Rollout: {p.rollout_percentage}%</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ─── Voice Profile Card ───
function VoiceProfileCard({
  profile, getVal, updateProfile, saveProfile, testVoice, saving, testing, hasChanges, locale,
}: {
  profile: VoiceProfile;
  getVal: (p: VoiceProfile, f: keyof VoiceProfile) => any;
  updateProfile: (id: string, f: string, v: any) => void;
  saveProfile: (p: VoiceProfile) => void;
  testVoice: (phrase: string, key: string) => void;
  saving: boolean;
  testing: string | null;
  hasChanges: boolean;
  locale: { code: string; label: string };
}) {
  const lang = locale.code.startsWith("fr") ? "fr" : "en";
  const phrases = TEST_PHRASES[lang] || TEST_PHRASES.fr;
  const [selectedPhrase, setSelectedPhrase] = useState(phrases[0]);

  return (
    <Card className={`transition-all ${hasChanges ? "ring-2 ring-primary/40" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {profile.profile_key}
              {profile.is_active ? (
                <Badge variant="default" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Actif</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Inactif</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">{profile.speech_style} — {locale.label}</CardDescription>
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
          {/* Voice ID Primary */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Voice ID (Primary)</label>
            <Input
              value={(getVal(profile, "voice_name_primary") as string) || ""}
              onChange={e => updateProfile(profile.id, "voice_name_primary", e.target.value)}
              placeholder="ex: alloy, echo, onyx..."
              className="text-sm"
            />
          </div>

          {/* Voice ID Secondary */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Voice ID (Secondary)</label>
            <Input
              value={(getVal(profile, "voice_name_secondary") as string) || ""}
              onChange={e => updateProfile(profile.id, "voice_name_secondary", e.target.value)}
              placeholder="Fallback voice ID"
              className="text-sm"
            />
          </div>

          {/* Speech Rate */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Vitesse: {(getVal(profile, "speech_rate") as number).toFixed(2)}x
            </label>
            <Slider
              value={[getVal(profile, "speech_rate") as number]}
              onValueChange={([v]) => updateProfile(profile.id, "speech_rate", v)}
              min={0.7}
              max={1.3}
              step={0.05}
            />
          </div>

          {/* Interruptibility */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Interruptibilité</label>
            <Select
              value={getVal(profile, "interruptibility_mode") as string}
              onValueChange={v => updateProfile(profile.id, "interruptibility_mode", v)}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immédiate</SelectItem>
                <SelectItem value="sentence_end">Fin de phrase</SelectItem>
                <SelectItem value="disabled">Désactivée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Speech Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Style vocal</label>
            <Input
              value={(getVal(profile, "speech_style") as string) || ""}
              onChange={e => updateProfile(profile.id, "speech_style", e.target.value)}
              className="text-sm"
            />
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
            <Volume2 className="h-3.5 w-3.5" /> Test vocal
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedPhrase} onValueChange={setSelectedPhrase}>
              <SelectTrigger className="text-xs max-w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {phrases.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testVoice(selectedPhrase, profile.profile_key)}
              disabled={testing === profile.profile_key}
              className="gap-1"
            >
              <Play className={`h-3.5 w-3.5 ${testing === profile.profile_key ? "animate-pulse" : ""}`} />
              {testing === profile.profile_key ? "Lecture…" : "Tester"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
