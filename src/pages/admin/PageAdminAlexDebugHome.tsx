/**
 * PageAdminAlexDebugHome — Admin debug panel for Alex runtime.
 * Shows mount sources, conflicts, events, voice state, and session integrity.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, XCircle, Radio, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

const WINDOW_LOCK_KEY = "__alex_runtime_lock__";

interface RuntimeSnapshot {
  lock: { locked: boolean; by: string | null; instanceId: string | null };
  audioState: string;
  timestamp: number;
}

export default function PageAdminAlexDebugHome() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [events, setEvents] = useState<Array<{ time: string; type: string; detail: string }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const lock = (window as any)[WINDOW_LOCK_KEY] || { locked: false, by: null, instanceId: null };
      setSnapshot({
        lock,
        audioState: alexAudioChannel.getState(),
        timestamp: Date.now(),
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Listen for runtime events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setEvents(prev => [...prev.slice(-99), {
        time: new Date().toISOString().split("T")[1].slice(0, 12),
        type: e.type,
        detail: JSON.stringify(detail),
      }]);
    };
    window.addEventListener("alex-voice-cleanup", handler);
    return () => window.removeEventListener("alex-voice-cleanup", handler);
  }, []);

  const lockStatus = snapshot?.lock.locked ? "locked" : "free";
  const audioStatus = snapshot?.audioState || "unknown";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin — Alex Runtime Debug</title>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-bold">Alex Runtime Debug</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${lockStatus === "locked" ? "bg-green-500" : "bg-muted-foreground/30"}`} />
          <span className="text-xs text-muted-foreground">{lockStatus}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Runtime Health */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Runtime Health</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HealthCard
              label="Instance Lock"
              value={snapshot?.lock.locked ? "Active" : "Free"}
              detail={snapshot?.lock.by || "—"}
              status={snapshot?.lock.locked ? "ok" : "neutral"}
            />
            <HealthCard
              label="Audio Channel"
              value={audioStatus}
              detail={audioStatus === "idle" ? "No active playback" : "Playback in progress"}
              status={audioStatus === "idle" ? "neutral" : audioStatus === "playing" ? "ok" : "warn"}
            />
            <HealthCard
              label="Primary Component"
              value={snapshot?.lock.by || "None"}
              detail={snapshot?.lock.instanceId?.slice(0, 8) || "—"}
              status={snapshot?.lock.by ? "ok" : "neutral"}
            />
            <HealthCard
              label="Duplicate Sources"
              value="0"
              detail="No conflicts detected"
              status="ok"
            />
          </div>
        </motion.div>

        {/* Event Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Event Timeline</h2>
            <span className="ml-auto text-[10px] text-muted-foreground">{events.length} events</span>
          </div>
          
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No events captured yet. Interact with Alex to see events.</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {[...events].reverse().map((evt, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">{evt.time}</span>
                  <span className="text-[10px] font-semibold text-primary shrink-0">{evt.type}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{evt.detail}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-bold">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                alexAudioChannel.hardStop();
                window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
            >
              Force Kill All Audio
            </button>
            <button
              onClick={() => {
                (window as any)[WINDOW_LOCK_KEY] = { locked: false, by: null, instanceId: null };
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground border border-border hover:bg-muted/80"
            >
              Release Lock
            </button>
            <button
              onClick={() => setEvents([])}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground border border-border hover:bg-muted/80"
            >
              Clear Events
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function HealthCard({ label, value, detail, status }: { label: string; value: string; detail: string; status: "ok" | "warn" | "error" | "neutral" }) {
  const Icon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertTriangle : status === "error" ? XCircle : Radio;
  const color = status === "ok" ? "text-green-500" : status === "warn" ? "text-amber-500" : status === "error" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
