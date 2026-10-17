import { supabase } from "@/integrations/supabase/client";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";

const blockedDrafts = new Set<string>();

/** A browser draft key is not authorization to an account-owned profile. */
export async function invokeMatchingProfile(body: Record<string, unknown>) {
  const key = typeof body.session_key === "string" ? body.session_key : "";
  const requireSignIn = () => {
    openAuthOverlay({
      label: "Reprendre votre profil",
      returnPath: window.location.pathname + window.location.search,
    });
    return {
      data: { ok: false, error: "authentication_required" },
      error: new Error("Connectez-vous pour reprendre ce profil. Vos réponses restent conservées."),
    };
  };
  if (key && blockedDrafts.has(key)) {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return requireSignIn();
    blockedDrafts.delete(key);
  }
  const result = await supabase.functions.invoke("matching-profile", { body });
  let reason = result.data?.error;
  if (!reason && result.error?.context instanceof Response) {
    try { reason = (await result.error.context.clone().json()).error; } catch { /* retain original failure */ }
  }
  if (reason === "authentication_required" || reason === "invalid_session") {
    if (key) blockedDrafts.add(key);
    return requireSignIn();
  }
  return result;
}