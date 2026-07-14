/**
 * Conversion truth tracker — emits contractor_funnel_events (link_clicked, landing_view)
 * and manages a lead_funnel_sessions row for the current landing visit.
 *
 * Best-effort, non-blocking, resilient to network failures.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "unpro_ftruth_session";
const CONSUMED_KEY = "unpro_ftruth_arrival";

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

async function resolvePhoneFromSlug(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  try {
    const { data } = await supabase
      .from("launch_leads")
      .select("phone,id")
      .eq("id", slug)
      .maybeSingle();
    if (data?.phone) return data.phone;
  } catch { /* ignore */ }
  return null;
}

/** Emit link_clicked + landing_view (once per page load) + create session row */
export async function trackLandingArrival(opts: { slug: string | null; source: string }) {
  try {
    if (sessionStorage.getItem(CONSUMED_KEY)) return;
    sessionStorage.setItem(CONSUMED_KEY, "1");
  } catch { /* ignore */ }

  const sessionId = getOrCreateSessionId();
  const url = new URL(window.location.href);
  const leadIdParam = url.searchParams.get("lead") || url.searchParams.get("l");
  const phone = await resolvePhoneFromSlug(leadIdParam ?? opts.slug);

  // 1. Emit funnel events (best-effort)
  if (phone) {
    try {
      await supabase.from("contractor_funnel_events").insert([
        { phone, event_type: "link_clicked", metadata: { source: opts.source, session_id: sessionId } },
        { phone, event_type: "landing_view", metadata: { source: opts.source, session_id: sessionId } },
      ]);
    } catch { /* ignore */ }
  }

  // 2. Create session row
  try {
    await supabase.from("lead_funnel_sessions").insert({
      lead_id: leadIdParam,
      session_id: sessionId,
      user_agent: navigator.userAgent.slice(0, 500),
      device_type: detectDevice(),
      source: opts.source,
      metadata: { url: url.pathname, slug: opts.slug, phone },
    });
  } catch { /* ignore */ }

  // 3. Time on page / scroll tracking
  const startedAt = Date.now();
  let maxScroll = 0;
  const onScroll = () => {
    const doc = document.documentElement;
    const pct = Math.round(((doc.scrollTop + window.innerHeight) / doc.scrollHeight) * 100);
    if (pct > maxScroll) maxScroll = pct;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const flush = async (extra: Record<string, unknown> = {}) => {
    const timeOnPage = Math.round((Date.now() - startedAt) / 1000);
    try {
      await supabase
        .from("lead_funnel_sessions")
        .update({ time_on_page: timeOnPage, scroll_depth: maxScroll, last_seen_at: new Date().toISOString(), ...extra })
        .eq("session_id", sessionId);
    } catch { /* ignore */ }
  };

  // Periodic flush every 15s
  const iv = setInterval(() => { flush(); }, 15000);

  // Flush on unload
  const onUnload = () => { flush(); };
  window.addEventListener("beforeunload", onUnload);
  window.addEventListener("pagehide", onUnload);

  return () => {
    clearInterval(iv);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("beforeunload", onUnload);
    window.removeEventListener("pagehide", onUnload);
  };
}

export async function trackCtaClicked() {
  try {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) return;
    await supabase
      .from("lead_funnel_sessions")
      .update({ cta_clicked: true, cta_clicked_at: new Date().toISOString() })
      .eq("session_id", sid);
  } catch { /* ignore */ }
}

export async function trackAlexStarted() {
  try {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) return;
    await supabase
      .from("lead_funnel_sessions")
      .update({ alex_started: true, alex_started_at: new Date().toISOString() })
      .eq("session_id", sid);
  } catch { /* ignore */ }
}

export async function trackSignupStarted() {
  try {
    const sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) return;
    await supabase
      .from("lead_funnel_sessions")
      .update({ signup_started: true, signup_started_at: new Date().toISOString() })
      .eq("session_id", sid);
  } catch { /* ignore */ }
}
