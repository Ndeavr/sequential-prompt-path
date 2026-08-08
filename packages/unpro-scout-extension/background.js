/* UNPRO Scout — background service worker.
   Owns the session token + the single call to the scout-ingest edge function.
   No service-role key ever lives here: only the admin's own Supabase access token. */

const DEFAULTS = {
  supabaseUrl: "https://clmaqdnphbndvmmqvpff.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk",
};

async function cfg() {
  const s = await chrome.storage.local.get(["accessToken", "sessionId", "stats", "paused"]);
  return { ...DEFAULTS, ...s };
}

async function ingest(action, body) {
  const c = await cfg();
  if (!c.accessToken) throw new Error("not_authenticated");
  const res = await fetch(`${c.supabaseUrl}/functions/v1/scout-ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: c.anonKey,
      Authorization: `Bearer ${c.accessToken}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `http_${res.status}`);
  return json;
}

async function bump(field) {
  const { stats } = await chrome.storage.local.get("stats");
  const s = stats || { captured: 0, new: 0, duplicate: 0, error: 0 };
  s.captured += 1;
  s[field] = (s[field] || 0) + 1;
  await chrome.storage.local.set({ stats: s });
  chrome.runtime.sendMessage({ type: "SCOUT_STATS", stats: s }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  (async () => {
    try {
      if (msg.type === "SCOUT_START_SESSION") {
        const r = await ingest("start_session", {
          group_name: msg.group_name,
          group_url: msg.group_url,
        });
        await chrome.storage.local.set({
          sessionId: r.session_id,
          paused: false,
          stats: { captured: 0, new: 0, duplicate: 0, error: 0 },
        });
        respond({ ok: true, session_id: r.session_id });
        return;
      }

      if (msg.type === "SCOUT_END_SESSION") {
        const c = await cfg();
        if (c.sessionId) await ingest("end_session", { session_id: c.sessionId });
        await chrome.storage.local.set({ sessionId: null, paused: true });
        respond({ ok: true });
        return;
      }

      if (msg.type === "SCOUT_CAPTURE") {
        const c = await cfg();
        if (!c.sessionId || c.paused) { respond({ ok: false, reason: "inactive" }); return; }
        const r = await ingest("capture", { session_id: c.sessionId, ...msg.payload });
        await bump(r.status === "new" ? "new" : r.status === "duplicate" ? "duplicate" : "error");
        respond({ ok: true, result: r });
        return;
      }

      respond({ ok: false, reason: "unknown_message" });
    } catch (e) {
      await bump("error").catch(() => {});
      respond({ ok: false, error: String(e.message || e) });
    }
  })();
  return true;
});
