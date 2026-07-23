/**
 * PageShortLinkRedirect — /r/:token
 *
 * Resolves an outreach short link (acquisition_tracking_links or legacy
 * outreach_messages.short_link_token) and redirects to the destination.
 *
 * Contract:
 *  - GET-only: never consumes/invalidates the token.
 *  - Bot/prefetch hint is sent so the edge function can skip side-effects.
 *  - On failure, offers a real recovery path (retry + regenerate + support).
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "redirecting" | "not_found" | "error";

function isLikelyPrefetch(): boolean {
  try {
    // Chrome/Edge speculative prefetch expose Purpose header only server-side,
    // but the visibility/prerender API is a decent client-side hint.
    // @ts-ignore — prerendering is only on Chromium canaries
    if (typeof document !== "undefined" && (document as any).prerendering) return true;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return true;
  } catch { /* noop */ }
  return false;
}

export default function PageShortLinkRedirect() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!token) { setStatus("not_found"); return; }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("outreach-shortlink-resolve", {
          body: { token, prefetch: isLikelyPrefetch() },
        });
        if (cancelled) return;

        const dest: string | null = data?.redirect_url ?? null;
        if (error || !dest) {
          setStatus("not_found");
          return;
        }
        setStatus("redirecting");
        // Absolute → full nav. Relative (e.g. /invitation/...) → SPA-friendly.
        if (/^https?:\/\//i.test(dest)) {
          window.location.replace(dest);
        } else {
          window.location.replace(dest);
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [token, attempts]);

  const supportHref = "mailto:allo@unpro.ca?subject=" + encodeURIComponent(`Lien SMS introuvable (${token ?? ""})`);

  return (
    <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" aria-hidden />
            <p className="text-white/70">Ouverture de votre aperçu UNPRO…</p>
          </>
        )}
        {status === "redirecting" && (
          <p className="text-white/70">Redirection…</p>
        )}
        {(status === "not_found" || status === "error") && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Ce lien n'est pas accessible</h1>
            <p className="text-white/70 leading-relaxed">
              Nous n'avons pas pu retrouver votre aperçu. Vous pouvez réessayer,
              ouvrir UNPRO directement, ou nous écrire pour recevoir un nouveau lien.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setStatus("loading"); setAttempts((n) => n + 1); }}
                className="w-full rounded-2xl bg-white text-[#050816] font-medium py-3 px-4 hover:bg-white/90 transition"
              >
                Réessayer
              </button>
              <a
                href="https://unpro.ca"
                className="w-full rounded-2xl border border-white/20 text-white font-medium py-3 px-4 hover:bg-white/5 transition"
              >
                Aller à UNPRO.ca
              </a>
              <a
                href={supportHref}
                className="text-white/60 text-sm hover:text-white/80 transition"
              >
                Écrire à UNPRO pour un nouveau lien
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
