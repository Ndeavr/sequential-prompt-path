/**
 * UNPRO — AuthErrorCatcher
 * Reads OAuth/auth failures returned by the auth server in the URL hash or
 * query (`error`, `error_code`, `error_description`) on ANY route, logs them,
 * then routes the user to /login with the exact server message visible.
 *
 * Without this, a failed provider handshake lands on `/#error=server_error…`
 * and the user sees a normal page with no explanation.
 */
import { useEffect } from "react";
import { authDebug } from "@/services/auth/authDebugBus";

function readParams(source: string): URLSearchParams | null {
  const cleaned = source.startsWith("#") || source.startsWith("?") ? source.slice(1) : source;
  if (!cleaned) return null;
  const params = new URLSearchParams(cleaned);
  return params.get("error") || params.get("error_code") || params.get("error_description")
    ? params
    : null;
}

export default function AuthErrorCatcher() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = readParams(window.location.hash) ?? readParams(window.location.search);
    if (!params) return;

    const code = params.get("error_code") || params.get("error") || "auth_error";
    const description = (params.get("error_description") || "").replace(/\+/g, " ").trim();

    // eslint-disable-next-line no-console
    console.error("[AUTH_RETURN_ERROR]", { code, description, url: window.location.href });
    try {
      authDebug.set({
        auth_step: "error",
        last_error: description || code,
        last_error_step: "callback_processing",
      });
    } catch {
      /* debug bus is best-effort */
    }

    // Strip the error fragment so a refresh doesn't re-trigger it.
    const target = new URL(window.location.origin + "/login");
    target.searchParams.set("auth_error", code);
    if (description) target.searchParams.set("auth_error_description", description);

    window.location.replace(target.toString());
  }, []);

  return null;
}
