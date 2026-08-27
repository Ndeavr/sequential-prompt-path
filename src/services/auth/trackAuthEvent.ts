/**
 * UNPRO — Auth Analytics Tracker
 * Lightweight event logger for auth funnel conversion tracking.
 */

const AUTH_EVENTS = [
  "auth_method_selected",
  "google_success",
  "sms_sent",
  "sms_success",
  "magic_link_selected",
  "dropoff_step",
  "role_selected",
] as const;

type AuthEvent = (typeof AUTH_EVENTS)[number];

export function trackAuthEvent(event: AuthEvent, props?: Record<string, unknown>) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    ...props,
  };

  if (import.meta.env.DEV) {
    console.log("[AUTH_TRACK]", payload);
  }

  // Fire-and-forget to analytics — extend with supabase insert if needed
  try {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", event, props);
    }
  } catch {
    // silent
  }
}
