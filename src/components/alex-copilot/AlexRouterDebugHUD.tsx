/**
 * AlexRouterDebugHUD — Floating dev/admin panel showing live routing decisions.
 *
 * Visible in DEV mode automatically. In production it can be force-shown by
 * setting `localStorage.alexRouterHud = "1"` (admin convenience).
 *
 * Shows for the latest message:
 *   • winning route + confidence
 *   • blocked routes (with reasons)
 *   • current contractor stage
 *   • contact-form / callback lock state
 */

import { useEffect, useState } from "react";
import {
  getLastRouterTrace,
  getRouterLockState,
  type RouterTrace,
} from "@/services/alexMasterRouter";

function shouldShow(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem("alexRouterHud") === "1";
  } catch {
    return false;
  }
}

export default function AlexRouterDebugHUD() {
  const [trace, setTrace] = useState<RouterTrace | null>(getLastRouterTrace());
  const [open, setOpen] = useState(false);
  const visible = shouldShow();

  useEffect(() => {
    if (!visible) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RouterTrace>).detail;
      if (detail) setTrace(detail);
    };
    window.addEventListener("alex:router:trace", handler);
    return () => window.removeEventListener("alex:router:trace", handler);
  }, [visible]);

  if (!visible) return null;
  const lock = getRouterLockState();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[200] rounded-full bg-card/90 backdrop-blur border border-border/40 px-2.5 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground shadow-lg"
        title="Alex Router HUD"
      >
        🧭 {trace?.winningRoute ?? "router"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-72 max-h-[70vh] overflow-y-auto rounded-lg border border-border/40 bg-card/95 backdrop-blur p-3 text-[11px] font-mono text-muted-foreground shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-foreground font-bold">Alex Router</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {!trace && <p className="text-muted-foreground/70">No route yet. Send a message.</p>}

      {trace && (
        <>
          <Row k="route" v={trace.winningRoute} highlight />
          <Row k="confidence" v={trace.confidence.toFixed(2)} />
          <Row k="stage" v={String(trace.stage)} />
          <Row k="contactForm" v={trace.contactFormBlocked ? "BLOCKED 🔒" : "open"} />
          <Row k="callback" v={trace.callbackBlocked ? "BLOCKED 🔒" : "open"} />
          <Row k="msg" v={`"${trace.message.slice(0, 40)}"`} />

          <div className="mt-2 pt-2 border-t border-border/20">
            <div className="text-foreground/80 mb-1">evaluations</div>
            {trace.evaluations.map((e) => (
              <div key={e.route} className="flex justify-between gap-2">
                <span className={e.route === trace.winningRoute ? "text-emerald-500" : trace.blockedRoutes.includes(e) ? "text-amber-500" : "text-muted-foreground/60"}>
                  {e.route === trace.winningRoute ? "✓" : trace.blockedRoutes.includes(e) ? "⊘" : "·"} {e.route}
                </span>
                <span className="text-muted-foreground/70">
                  {e.confidence.toFixed(2)} · {e.reason}
                </span>
              </div>
            ))}
          </div>

          {trace.blockedRoutes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/20 text-amber-500/80">
              blocked: {trace.blockedRoutes.map((b) => b.route).join(", ")}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-border/20 text-muted-foreground/60">
            lock src: {lock.source ?? "—"}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground/70">{k}</span>
      <span className={highlight ? "text-emerald-500 font-bold" : "text-foreground"}>{v}</span>
    </div>
  );
}
