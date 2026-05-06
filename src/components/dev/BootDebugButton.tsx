/**
 * BootDebugButton — DEV-only floating button to inspect __UNPRO_DEBUG.
 */
import { useState } from "react";
import { useAuthSession } from "@/stores/authSessionStore";

export default function BootDebugButton() {
  const [open, setOpen] = useState(false);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const { session, loading, initialized } = useAuthSession();

  if (!import.meta.env.DEV) return null;

  const dbg = typeof window !== "undefined" ? window.__UNPRO_DEBUG : null;
  const recent = dbg?.bootSteps.slice(-25) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-3 right-3 z-[99998] rounded-full bg-amber-500 text-black text-xs font-mono px-3 py-1.5 shadow-lg"
      >
        Debug
      </button>
      {open && (
        <div className="fixed bottom-14 right-3 z-[99998] w-[320px] max-h-[60vh] overflow-auto rounded-lg bg-black/90 text-white text-[11px] font-mono p-3 shadow-2xl border border-white/10">
          <div className="mb-2 font-bold">UNPRO Boot Debug</div>
          <div>route: {pathname}</div>
          <div>auth: loading={String(loading)} init={String(initialized)} uid={session?.user?.id?.slice(0, 8) ?? "—"}</div>
          <div>last: {dbg?.lastStep ?? "—"}</div>
          <div>elapsed: {dbg ? Date.now() - dbg.startedAt : 0}ms</div>
          <div className="mt-2 border-t border-white/10 pt-2">
            {recent.map((s, i) => (
              <div key={i} className="opacity-80">
                +{s.elapsed}ms {s.step}
              </div>
            ))}
          </div>
          {dbg?.errors?.length ? (
            <div className="mt-2 border-t border-red-500/40 pt-2 text-red-300">
              <div className="font-bold">errors:</div>
              {dbg.errors.slice(-5).map((e, i) => (
                <div key={i}>{e.step}: {e.err}</div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
