/**
 * UNPRO — Broken Link Event Logger
 * Logs navigation guard events to Supabase for admin analytics.
 */
import { supabase } from "@/integrations/supabase/client";
import { isGoogleEntry } from "./routeIntentResolver";

export async function logBrokenLinkEvent(params: {
  sourcePath?: string;
  attemptedPath: string;
  resolvedPath?: string;
  userRole?: string;
  resolutionType: string;
}) {
  try {
    await (supabase as any).from("broken_link_events").insert({
      source_path: params.sourcePath || null,
      attempted_path: params.attemptedPath,
      resolved_path: params.resolvedPath || null,
      user_role: params.userRole || null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      resolution_type: params.resolutionType,
      was_google_entry: isGoogleEntry(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn("[UNPRO] Failed to log broken link event:", e);
  }
}
