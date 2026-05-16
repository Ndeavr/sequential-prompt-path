// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
/**
 * PageVoiceHealth — Admin > System Health > Alex Voice
 *
 * Aggregates the Voice Health Contract:
 *  - Current voice ID + backup voice ID
 *  - ElevenLabs endpoint status
 *  - Last successful / failed TTS
 *  - Mic permission state
 *  - Audio playback state
 *  - Test Speak / Test Listen / Reset Voice Session
 */
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Loader2, Volume2, Mic, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { voice_smoke_test, type SmokeReport } from "@/lib/voiceSmokeTest";
import { ALEX_VOICE_BASE, ALEX_VOICE_BACKUP } from "@/config/alexVoiceConfig";
import { toast } from "sonner";

type HealthSnapshot = {
  status: string;
  checks: Record<string, { status: string; detail?: string }>;
  metrics_24h?: Record<string, unknown>;
  checked_at?: string;
};

export default function PageVoiceHealth() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [smoke, setSmoke] = useState<SmokeReport | null>(null);
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [micState, setMicState] = useState<string>("unknown");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastSpokenAt, setLastSpokenAt] = useState<string | null>(null);
  const [lastFailureAt, setLastFailureAt] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-voice-health");
      if (error) throw error;
      setHealth(data as HealthSnapshot);
    } catch (e) {
      toast.error("Health check failed", { description: (e as Error).message });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const refreshMic = useCallback(async () => {
    try {
      const anyNav = navigator as unknown as {
        permissions?: { query: (q: { name: PermissionName }) => Promise<{ state: string }> };
      };
      if (anyNav.permissions?.query) {
        const status = await anyNav.permissions.query({ name: "microphone" as PermissionName });
        setMicState(status.state);
      } else {
        setMicState("unknown");
      }
    } catch {
      setMicState("unknown");
    }
  }, []);

  const refreshPings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("voice_health_pings")
        .select("kind, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []) as Array<{ kind: string; created_at: string }>;
      const success = rows.find((r) => r.kind === "success");
      const failure = rows.find((r) => r.kind === "failure");
      if (success) setLastSpokenAt(success.created_at);
      if (failure) setLastFailureAt(failure.created_at);
    } catch {
      /* admin-only — silently skip when not allowed */
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    refreshMic();
    refreshPings();
  }, [refreshHealth, refreshMic, refreshPings]);

  const runSmoke = useCallback(async () => {
    setSmokeLoading(true);
    try {
      const report = await voice_smoke_test();
      setSmoke(report);
      if (report.ok) {
        setLastSpokenAt(report.finishedAt);
        toast.success("Voice smoke test passed");
      } else {
        setLastFailureAt(report.finishedAt);
        toast.error("Voice smoke test failed", {
          description: report.checks.filter((c) => !c.pass).map((c) => c.name).join(", "),
        });
      }
    } finally {
      setSmokeLoading(false);
    }
  }, []);

  const testSpeak = useCallback(async (voiceId: string, label: string) => {
    setSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-voice-test", {
        body: { voice_id: voiceId, test_text: "Bonjour. Ceci est un test de la voix d'Alex.", language: "fr" },
      });
      if (error) throw error;
      let buf: ArrayBuffer;
      if (data instanceof ArrayBuffer) buf = data;
      else if (data instanceof Blob) buf = await data.arrayBuffer();
      else throw new Error("invalid tts response");
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      setLastSpokenAt(new Date().toISOString());
      toast.success(`${label} a parlé`);
    } catch (e) {
      setLastFailureAt(new Date().toISOString());
      toast.error(`${label} a échoué`, { description: (e as Error).message });
    } finally {
      setSpeaking(false);
    }
  }, []);

  const testListen = useCallback(async () => {
    setListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refreshMic();
      toast.success("Microphone OK");
    } catch (e) {
      toast.error("Microphone bloqué", { description: (e as Error).message });
    } finally {
      setListening(false);
    }
  }, [refreshMic]);

  const resetSession = useCallback(() => {
    try {
      sessionStorage.removeItem("alex.session.v1");
      sessionStorage.removeItem("alex.hasGreeted");
      sessionStorage.removeItem("alex.voiceStarted");
      toast.success("Session voix réinitialisée");
    } catch (e) {
      toast.error("Reset failed", { description: (e as Error).message });
    }
  }, []);

  const statusBadge = (ok: boolean | undefined) =>
    ok === undefined ? (
      <Badge variant="secondary">—</Badge>
    ) : ok ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">healthy</Badge>
    ) : (
      <Badge variant="destructive">failing</Badge>
    );

  const overallOk = health?.status === "healthy" && (smoke?.ok ?? true);

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin · System Health · Alex Voice</h1>
          <p className="text-muted-foreground mt-1">
            Voice Health Contract. Block deploys whenever a check fails.
          </p>
        </div>
        {statusBadge(overallOk)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice configuration</CardTitle>
          <CardDescription>Single source of truth: <code>src/config/alexVoiceConfig.ts</code></CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Primary voice ID</div>
            <div className="font-mono">{ALEX_VOICE_BASE.voiceId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Backup voice ID</div>
            <div className="font-mono">{ALEX_VOICE_BACKUP.voiceId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Model</div>
            <div className="font-mono">{ALEX_VOICE_BASE.modelId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Output format</div>
            <div className="font-mono">{ALEX_VOICE_BASE.outputFormat}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>ElevenLabs endpoint</CardTitle>
            <CardDescription>Live status from <code>alex-voice-health</code></CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshHealth} disabled={healthLoading}>
            {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {health ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Overall:</span>
                <Badge variant={health.status === "healthy" ? "default" : "destructive"}>{health.status}</Badge>
              </div>
              {Object.entries(health.checks ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="font-mono text-xs">{k}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{v.status}</Badge>
                    {v.detail && <span className="text-xs text-muted-foreground">{v.detail}</span>}
                  </span>
                </div>
              ))}
              {health.metrics_24h && (
                <>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {Object.entries(health.metrics_24h).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-muted-foreground">{k}</div>
                        <div className="font-mono">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">Loading…</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser state</CardTitle>
          <CardDescription>Mic permission and last playback</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Mic permission</div>
            <div className="font-mono">{micState}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last successful TTS</div>
            <div className="font-mono text-xs">{lastSpokenAt ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last failed TTS</div>
            <div className="font-mono text-xs">{lastFailureAt ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Audio playback</div>
            <div className="font-mono">{speaking ? "playing" : "idle"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual controls</CardTitle>
          <CardDescription>Run smoke test, speak, listen, reset session</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={runSmoke} disabled={smokeLoading}>
            {smokeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Run voice_smoke_test
          </Button>
          <Button variant="outline" onClick={() => testSpeak(ALEX_VOICE_BASE.voiceId, "Voix principale")} disabled={speaking}>
            <Volume2 className="h-4 w-4 mr-2" /> Test Speak (primary)
          </Button>
          <Button variant="outline" onClick={() => testSpeak(ALEX_VOICE_BACKUP.voiceId, "Voix de secours")} disabled={speaking}>
            <Volume2 className="h-4 w-4 mr-2" /> Test Speak (backup)
          </Button>
          <Button variant="outline" onClick={testListen} disabled={listening}>
            <Mic className="h-4 w-4 mr-2" /> Test Listen
          </Button>
          <Button variant="ghost" onClick={resetSession}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Voice Session
          </Button>
        </CardContent>
      </Card>

      {smoke && (
        <Card>
          <CardHeader>
            <CardTitle>Smoke test report</CardTitle>
            <CardDescription>
              {smoke.startedAt} → {smoke.finishedAt}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {smoke.checks.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {c.pass ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-mono">{c.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.detail}
                  {c.durationMs ? ` · ${c.durationMs}ms` : ""}
                </span>
              </div>
            ))}
            <Separator />
            <div className="text-xs text-muted-foreground">
              Primary audio: {smoke.lastPrimaryAudioBytes ?? 0} B · Fallback audio: {smoke.lastFallbackAudioBytes ?? 0} B
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
