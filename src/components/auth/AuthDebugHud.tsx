/**
 * UNPRO — Auth Debug HUD (DEV ONLY)
 *
 * Floating chip in the bottom-right that expands into a panel exposing the
 * current state of the auth flow: auth_step, auth_method, session_found,
 * redirect_target, last_error, plus history. Renders null in production.
 */

import { useState } from "react";
import { useAuthDebug, authDebug, type AuthDebugState } from "@/services/auth/authDebugBus";

const IS_DEV = import.meta.env.DEV;

function flag(v: boolean | null | undefined) {
  return v === true ? "✅" : v === false ? "❌" : "⏳";
}

function shortId(id?: string | null) {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function fmtElapsed(s: AuthDebugState) {
  const ms = Math.max(0, s.updated_at - s.started_at);
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AuthDebugHud() {
  const [open, setOpen] = useState(false);
  const s = useAuthDebug();

  if (!IS_DEV) return null;

  const stepColor =
    s.auth_step === "error" ? "text-red-400"
      : s.auth_step === "done" || s.auth_step === "redirecting" ? "text-emerald-400"
        : s.auth_step === "idle" ? "text-muted-foreground"
          : "text-amber-300";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[200] bg-card/90 border border-border/40 rounded-full px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
        title="Auth Debug HUD"
      >
        <span>🔐</span>
        <span className={stepColor}>{s.auth_step}</span>
        {s.last_error ? <span className="text-red-400">!</span> : null}
      </button>
    );
  }

  const rows: [string, React.ReactNode][] = [
    ["auth_step", <span className={stepColor}>{s.auth_step}</span>],
    ["auth_method", s.auth_method ?? "—"],
    ["session_found", `${flag(s.session_found)} ${shortId(s.user_id)}`],
    ["user_email", s.user_email_masked ?? "—"],
    ["redirect_target", s.redirect_target ?? "—"],
    [
      "last_error",
      s.last_error
        ? <span className="text-red-400" title={s.last_error}>{`@${s.last_error_step ?? "?"}: ${s.last_error.slice(0, 60)}`}</span>
        : "—",
    ],
    ["provider", s.provider ?? "—"],
    ["prelogin_role", s.prelogin_role ?? "—"],
    ["roles", s.roles.length ? `[${s.roles.join(", ")}]` : "[]"],
    ["intent_path", s.intent_path ?? "—"],
    ["elapsed", fmtElapsed(s)],
  ];

  const copyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(s, null, 2));
    } catch { /* noop */ }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] bg-card/95 backdrop-blur-sm border border-border/40 rounded-lg p-2 text-[10px] font-mono text-muted-foreground w-72 max-h-[80vh] overflow-y-auto shadow-xl">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-foreground text-[11px]">🔐 Auth Debug</span>
        <div className="flex items-center gap-1">
          <button
            onClick={copyJson}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
            title="Copy state as JSON"
          >
            copy
          </button>
          <button
            onClick={() => authDebug.reset()}
            className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
            title="Reset state"
          >
            reset
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground px-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border/10 align-top">
              <td className="py-0.5 pr-2 text-muted-foreground/70 whitespace-nowrap">{k}</td>
              <td className="py-0.5 text-foreground break-all">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {s.history.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-border/20">
          <div className="text-muted-foreground/70 mb-1">history</div>
          <ol className="space-y-0.5">
            {s.history.slice().reverse().map((h, i) => {
              const dt = new Date(h.ts);
              const t = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
              return (
                <li key={i} className="text-foreground/80">
                  <span className="text-muted-foreground/60">{t}</span>{" "}
                  <span className={h.step === "error" ? "text-red-400" : ""}>{h.step}</span>
                  {h.note ? <span className="text-muted-foreground/70"> — {h.note}</span> : null}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
