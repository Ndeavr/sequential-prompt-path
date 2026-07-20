/**
 * PageAdminBrandPronunciation — Focused, brand-centric pronunciation cockpit.
 *
 * Edits `alex_brand_phonetic_lock` (source of truth) for UNPRO
 * across FR-CA and EN. Provides one-click Listen previews via
 * the elevenlabs-tts edge function (which itself runs the brand
 * phonetic lock server-side).
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Volume2, Save, Loader2, ShieldCheck } from "lucide-react";
import { clearPhoneticLockCache } from "@/services/alex/brandPhoneticLock";
import { getSpeechText } from "@/lib/brand/getSpeechText";

interface LockRow {
  id: string;
  brand_key: string;
  language_code: string;
  speech_text: string;
  context_type: string;
  is_active: boolean;
  is_forced: boolean;
  notes: string | null;
}

const LANGUAGES: Array<{ code: "fr" | "en"; label: string; sample: string }> = [
  { code: "fr", label: "Français (Canada)", sample: "Bienvenue chez UNPRO. Je suis Alex, votre concierge." },
  { code: "en", label: "English", sample: "Welcome to UNPRO. I am Alex, your concierge." },
];

const FORBIDDEN = ["U N Pro", "You N Pro", "You En Pro", "Une Pro", "Un-PRO", "U-N-P-R-O"];

export default function PageAdminBrandPronunciation() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [playingLang, setPlayingLang] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["brand-pronunciation-lock", "unpro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alex_brand_phonetic_lock")
        .select("*")
        .eq("brand_key", "unpro")
        .eq("context_type", "global")
        .order("language_code");
      if (error) throw error;
      return (data ?? []) as LockRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, speech_text }: { id: string; speech_text: string }) => {
      const { error } = await supabase
        .from("alex_brand_phonetic_lock")
        .update({ speech_text, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      clearPhoneticLockCache();
      qc.invalidateQueries({ queryKey: ["brand-pronunciation-lock"] });
      toast.success("Prononciation mise à jour");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la mise à jour"),
  });

  const playPreview = async (lang: "fr" | "en", text: string) => {
    setPlayingLang(lang);
    let objectUrl: string | null = null;
    try {
      const { speechText } = getSpeechText(text, lang === "fr" ? "fr-CA" : "en");
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: speechText, language: lang }),
        },
      );
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(errText || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      if (!blob.size) throw new Error("Aucun audio retourné");
      objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      const cleanup = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setPlayingLang(null);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch (e: any) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      toast.error(`Prévisualisation impossible : ${e?.message ?? e}`);
      setPlayingLang(null);
    }
  };

  const rowByLang = (lang: string) =>
    rows.find((r) => r.language_code === lang);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Helmet>
        <title>Prononciation de marque — UNPRO Admin</title>
      </Helmet>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prononciation de marque</h1>
            <p className="text-sm text-muted-foreground">
              Source de vérité pour toutes les voix IA, TTS, vidéos et exports.
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-[-0.04em]">UNPRO</span>
            <Badge variant="secondary">Affiché partout</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          L'utilisateur voit toujours <strong>UNPRO</strong>. L'IA lit toujours la version
          phonétique ci-dessous. Aucun système ne doit épeler U-N-P-R-O.
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {LANGUAGES.map(({ code, label, sample }) => {
            const row = rowByLang(code);
            const currentValue = drafts[code] ?? row?.speech_text ?? "";
            const dirty = row && currentValue !== row.speech_text;

            return (
              <Card key={code}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{label}</span>
                    <Badge variant={code === "fr" ? "default" : "outline"}>{code.toUpperCase()}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Texte affiché
                    </Label>
                    <div className="font-bold text-lg">UNPRO</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`speech-${code}`} className="text-xs uppercase tracking-wider text-muted-foreground">
                      Version prononcée
                    </Label>
                    <Input
                      id={`speech-${code}`}
                      value={currentValue}
                      onChange={(e) => setDrafts((d) => ({ ...d, [code]: e.target.value }))}
                      disabled={!row}
                      placeholder={code === "fr" ? "un pro" : "Hun-pro"}
                    />
                    {dirty && (
                      <Button
                        size="sm"
                        onClick={() => row && updateMutation.mutate({ id: row.id, speech_text: currentValue })}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Enregistrer
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Aperçu vocal
                    </Label>
                    <p className="text-xs text-muted-foreground italic">"{sample}"</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playPreview(code, sample)}
                      disabled={playingLang === code}
                    >
                      {playingLang === code ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Écouter {code.toUpperCase()}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-sm">Ne jamais prononcer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {FORBIDDEN.map((f) => (
            <Badge key={f} variant="destructive" className="font-mono">
              {f}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Pour les règles avancées (contextes multiples, produits, priorités), voir{" "}
        <a href="/admin/voice-pronunciation" className="underline">/admin/voice-pronunciation</a>.
      </p>
    </div>
  );
}
