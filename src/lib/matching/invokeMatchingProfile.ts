import { supabase } from "@/integrations/supabase/client";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";

/** Drafts the server refused while signed out; kept for the tab so a reload does not re-ask the server. */
const BLOCKED_STORAGE_KEY = "unpro_matching_blocked_drafts";
const blockedDrafts = new Set<string>(readBlocked());

function readBlocked(): string[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(BLOCKED_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : [];
  } catch { return []; }
}
function writeBlocked() {
  try { sessionStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify([...blockedDrafts])); } catch { /* storage unavailable */ }
}

export interface InvokeMatchingProfileOptions {
  /** false for background reads (resume on mount): never open the sign-in overlay unprompted. */
  promptSignIn?: boolean;
}

/** A browser draft key is not authorization to an account-owned profile. */
export async function invokeMatchingProfile(body: Record<string, unknown>, options: InvokeMatchingProfileOptions = {}) {
  const promptSignIn = options.promptSignIn !== false;
  const key = typeof body.session_key === "string" ? body.session_key : "";
  const requireSignIn = () => {
    if (promptSignIn) {
      openAuthOverlay({
        label: "Reprendre votre profil",
        returnPath: window.location.pathname + window.location.search,
      });
    }
    return {
      data: { ok: false, error: "authentication_required" },
      error: new Error("Connectez-vous pour reprendre ce profil. Vos réponses restent conservées."),
    };
  };
  if (key && blockedDrafts.has(key)) {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return requireSignIn();
    blockedDrafts.delete(key);
    writeBlocked();
  }
  const result = await supabase.functions.invoke("matching-profile", { body });
  let reason = result.data?.error;
  if (!reason && result.error?.context instanceof Response) {
    try { reason = (await result.error.context.clone().json()).error; } catch { /* retain original failure */ }
  }
  if (reason === "authentication_required" || reason === "invalid_session") {
    if (key) { blockedDrafts.add(key); writeBlocked(); }
    return requireSignIn();
  }
  return result;
}
