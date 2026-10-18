/** Public browser origins only; CORS is not authentication. */
export function addressCors(origin: string | null): Record<string, string> | null {
  if (!origin) return {}; // Non-browser callers still require session + quota.
  let allowed = false;
  try {
    const url = new URL(origin);
    allowed = ["https://unpro.ca", "https://www.unpro.ca", "https://app.unpro.ca", "http://localhost:8080"].includes(url.origin)
      || (url.protocol === "https:" && (url.hostname === "unpro.lovable.app"
        || url.hostname === "id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app"));
  } catch { return null; }
  if (!allowed) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Expose-Headers": "Retry-After",
  };
}

export function guestAddressSessionAllowed(session: { id?: string; user_id?: string | null } | null, userId: string | null): boolean {
  return !!session?.id && (!session.user_id || session.user_id === userId);
}