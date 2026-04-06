/**
 * PageAdminAlexDebugHome — Admin debug dashboard for Alex runtime health.
 * Shows mounted sources, lock state, events timeline, and conflict detection.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { alexRuntime, type AlexRuntimeEvent } from "@/services/alexRuntimeSingleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, AlertTriangle, CheckCircle2, Lock, Unlock, RefreshCw, Trash2, Cpu, Volume2, Eye } from "lucide-react";

export default function PageAdminAlexDebugHome() {
  const [state, setState] = useState(alexRuntime.getState());
  const [events, setEvents] = useState<AlexRuntimeEvent[]>(alexRuntime.getEvents());

  useEffect(() => {
    const unsub = alexRuntime.subscribe((s) => {
      setState(s);
      setEvents(alexRuntime.getEvents());
    });

    // Poll for updates
    const interval = setInterval(() => {
      setState(alexRuntime.getState());
      setEvents(alexRuntime.getEvents());
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const statusColor: Record<string, string> = {
    idle: 'bg-muted text-muted-foreground',
    booting: 'bg-yellow-500/10 text-yellow-600',
    active: 'bg-green-500/10 text-green-600',
    paused: 'bg-blue-500/10 text-blue-600',
    ended: 'bg-muted text-muted-foreground',
    conflict: 'bg-destructive/10 text-destructive',
    failed: 'bg-destructive/10 text-destructive',
  };

  const resultColor: Record<string, string> = {
    accepted: 'text-green-600',
    blocked: 'text-destructive',
    ignored: 'text-muted-foreground',
    cancelled: 'text-yellow-600',
    completed: 'text-green-600',
    failed: 'text-destructive',
  };

  const mountedSources = Array.from(state.mountedSources.entries());

  return (
    <MainLayout>
      <Helmet>
        <title>Alex Runtime Debug | Admin</title>
      </Helmet>

      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alex Runtime Debug</h1>
            <p className="text-sm text-muted-foreground">Diagnostic temps réel du singleton Alex sur la home page</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => alexRuntime.hardReset()}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Hard Reset
          </Button>
        </div>

        {/* ── Health Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Session Status */}
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Session</span>
              </div>
              <Badge className={statusColor[state.sessionStatus] || 'bg-muted'}>
                {state.sessionStatus}
              </Badge>
            </CardContent>
          </Card>

          {/* Lock State */}
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1.5">
                {alexRuntime.isLocked() ? <Lock className="h-4 w-4 text-yellow-600" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground font-medium">Lock</span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {alexRuntime.getLockOwner() || 'Libre'}
              </p>
            </CardContent>
          </Card>

          {/* Voice ID */}
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Voice</span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {state.voiceId || '—'}
              </p>
            </CardContent>
          </Card>

          {/* Duplicate Attempts */}
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Doublons</span>
              </div>
              <p className={`text-lg font-bold ${state.duplicateAttempts > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {state.duplicateAttempts}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Mounted Sources ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Sources montées ({mountedSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mountedSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source Alex montée</p>
            ) : (
              <div className="space-y-2">
                {mountedSources.map(([name, role]) => (
                  <div key={name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {role === 'primary' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                    <Badge variant={role === 'primary' ? 'default' : 'secondary'}>
                      {role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Autostart Status ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Autostart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Triggered:</span>
              <Badge variant={state.autostartTriggered ? 'default' : 'secondary'}>
                {state.autostartTriggered ? 'Oui' : 'Non'}
              </Badge>
              <span className="text-muted-foreground">Completed:</span>
              <Badge variant={state.autostartCompleted ? 'default' : 'secondary'}>
                {state.autostartCompleted ? 'Oui' : 'Non'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* ── Events Timeline ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Événements ({events.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement enregistré</p>
              ) : (
                <div className="space-y-1.5">
                  {[...events].reverse().map((evt, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/30 text-xs">
                      <span className="text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString('fr-CA')}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {evt.eventType}
                      </Badge>
                      <span className="font-medium text-foreground truncate">{evt.componentName}</span>
                      <span className={`ml-auto font-semibold shrink-0 ${resultColor[evt.resultStatus] || ''}`}>
                        {evt.resultStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
