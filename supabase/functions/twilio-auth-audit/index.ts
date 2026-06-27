// Live, uncached Twilio authentication audit.
// Issues real authenticated calls and names the exact failing secret.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_FROM = "+14503286776";

type Probe = {
  status: number;
  ok: boolean;
  twilio_code?: number | null;
  twilio_message?: string | null;
  body_excerpt?: string;
  latency_ms: number;
  error?: string;
};

async function probe(url: string, basic?: { sid: string; token: string }, extraHeaders?: Record<string, string>): Promise<Probe> {
  const t0 = Date.now();
  const headers: Record<string, string> = { Accept: "application/json", ...(extraHeaders ?? {}) };
  if (basic) headers["Authorization"] = "Basic " + btoa(`${basic.sid}:${basic.token}`);
  try {
    const r = await fetch(url, { method: "GET", headers });
    const text = await r.text();
    let twilio_code: number | null = null;
    let twilio_message: string | null = null;
    try {
      const j = JSON.parse(text);
      twilio_code = j?.code ?? null;
      twilio_message = j?.message ?? null;
    } catch { /* ignore */ }
    return {
      status: r.status,
      ok: r.ok,
      twilio_code,
      twilio_message,
      body_excerpt: text.slice(0, 400),
      latency_ms: Date.now() - t0,
    };
  } catch (e) {
    return { status: 0, ok: false, latency_ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

function mask(s?: string | null) {
  if (!s) return null;
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const PHONE = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
  const FROM = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";
  const MSG_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";
  const VERIFY_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") ?? "";
  const API_KEY = Deno.env.get("TWILIO_API_KEY") ?? "";
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    presence: {
      TWILIO_ACCOUNT_SID: { present: !!SID, masked: mask(SID), format_ok: /^AC[0-9a-f]{32}$/i.test(SID) },
      TWILIO_AUTH_TOKEN: { present: !!TOKEN, length: TOKEN.length },
      TWILIO_PHONE_NUMBER: { present: !!PHONE, value: PHONE },
      TWILIO_FROM_NUMBER: { present: !!FROM, value: FROM },
      TWILIO_MESSAGING_SERVICE_SID: { present: !!MSG_SID, masked: mask(MSG_SID) },
      TWILIO_VERIFY_SERVICE_SID: { present: !!VERIFY_SID, masked: mask(VERIFY_SID) },
      TWILIO_API_KEY_connector: { present: !!API_KEY },
    },
  };

  // ---- Mode A: Account SID + Auth Token (the failing path)
  let accountValid = false;
  if (SID && TOKEN) {
    const p = await probe(`https://api.twilio.com/2010-04-01/Accounts/${SID}.json`, { sid: SID, token: TOKEN });
    accountValid = p.ok;
    result.account = p;
  } else {
    result.account = { skipped: true, reason: "missing SID or TOKEN" };
  }

  // ---- Mode C: Phone number lookups (only if account auth worked)
  if (accountValid) {
    if (PHONE) {
      const p = await probe(
        `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(PHONE)}`,
        { sid: SID, token: TOKEN }
      );
      let count = 0;
      let first: any = null;
      try { const j = JSON.parse(p.body_excerpt ?? "{}"); count = j?.incoming_phone_numbers?.length ?? 0; first = j?.incoming_phone_numbers?.[0] ?? null; } catch {}
      result.phone_number = { ...p, exists_in_account: count > 0, sid: first?.sid ?? null, capabilities: first?.capabilities ?? null, friendly_name: first?.friendly_name ?? null };
    }
    if (FROM && FROM !== PHONE) {
      const p = await probe(
        `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(FROM)}`,
        { sid: SID, token: TOKEN }
      );
      let count = 0; let first: any = null;
      try { const j = JSON.parse(p.body_excerpt ?? "{}"); count = j?.incoming_phone_numbers?.length ?? 0; first = j?.incoming_phone_numbers?.[0] ?? null; } catch {}
      result.from_number = { ...p, exists_in_account: count > 0, sid: first?.sid ?? null, capabilities: first?.capabilities ?? null, friendly_name: first?.friendly_name ?? null };
    }
    if (MSG_SID) {
      result.messaging_service = await probe(`https://messaging.twilio.com/v1/Services/${MSG_SID}`, { sid: SID, token: TOKEN });
    }
    if (VERIFY_SID) {
      result.verify_service = await probe(`https://verify.twilio.com/v2/Services/${VERIFY_SID}`, { sid: SID, token: TOKEN });
    }
  }

  // ---- Mode B: connector gateway (TWILIO_API_KEY)
  if (API_KEY && LOVABLE_KEY) {
    result.connector_gateway = await probe(
      "https://connector-gateway.lovable.dev/twilio/Accounts.json",
      undefined,
      { Authorization: `Bearer ${LOVABLE_KEY}`, "X-Connection-Api-Key": API_KEY }
    );
  } else {
    result.connector_gateway = { skipped: true, reason: "missing TWILIO_API_KEY or LOVABLE_API_KEY" };
  }

  // ---- Verdict
  let failing_secret: string | null = null;
  let next_action = "Système Twilio OK.";

  if (!SID) { failing_secret = "TWILIO_ACCOUNT_SID"; next_action = "Ajouter TWILIO_ACCOUNT_SID."; }
  else if (!TOKEN) { failing_secret = "TWILIO_AUTH_TOKEN"; next_action = "Ajouter TWILIO_AUTH_TOKEN."; }
  else if (!result.account?.ok) {
    const code = result.account?.twilio_code;
    const status = result.account?.status;
    if (status === 401 || code === 20003) {
      failing_secret = "TWILIO_AUTH_TOKEN";
      next_action = "Auth Token invalide. Régénérer dans Twilio Console → Account → API keys & tokens, puis mettre à jour le secret TWILIO_AUTH_TOKEN.";
    } else if (status === 404 || code === 20404) {
      failing_secret = "TWILIO_ACCOUNT_SID";
      next_action = "Account SID introuvable. Vérifier la valeur de TWILIO_ACCOUNT_SID dans Twilio Console.";
    } else {
      failing_secret = "TWILIO_AUTH_TOKEN";
      next_action = `Échec auth Twilio (HTTP ${status}, code ${code ?? "?"}): ${result.account?.twilio_message ?? result.account?.error ?? "inconnu"}`;
    }
  } else if (PHONE && result.phone_number && !result.phone_number.exists_in_account) {
    failing_secret = "TWILIO_PHONE_NUMBER";
    next_action = `Le numéro ${PHONE} n'existe pas dans ce compte Twilio. Acheter/transférer le numéro ou corriger TWILIO_PHONE_NUMBER.`;
  } else if (FROM && result.from_number && !result.from_number.exists_in_account) {
    failing_secret = "TWILIO_FROM_NUMBER";
    next_action = `Le numéro expéditeur ${FROM} n'existe pas dans ce compte Twilio.`;
  }

  result.verdict = {
    failing_secret,
    next_action,
    account_auth_valid: !!result.account?.ok,
    canonical_from: CANONICAL_FROM,
    from_matches_canonical: FROM === CANONICAL_FROM,
  };

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    status: 200,
  });
});
