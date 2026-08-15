/**
 * UNPRO — Edge function publique : formulaire "Analyse de visibilité IA"
 * (/visibilite-ia-entrepreneurs).
 *
 * - Pas de JWT (formulaire public), validation Zod côté serveur.
 * - Insertion dans la table canonique `leads` (lead_type = 'contractor').
 * - Garde anti-doublon 24 h sur (téléphone + source).
 * - Notification interne Resend — un échec de notification ne perd jamais le prospect.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCE = "visibilite_ia_entrepreneurs";

const Body = z.object({
  company_name: z.string().trim().min(2).max(150),
  contact_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  primary_service: z.string().trim().min(2).max(120),
  landing_page: z.string().trim().max(300).optional().or(z.literal("")),
  referrer: z.string().trim().max(500).optional().or(z.literal("")),
  utm_source: z.string().trim().max(120).optional().or(z.literal("")),
  utm_medium: z.string().trim().max(120).optional().or(z.literal("")),
  utm_campaign: z.string().trim().max(160).optional().or(z.literal("")),
  utm_content: z.string().trim().max(160).optional().or(z.literal("")),
  utm_term: z.string().trim().max(160).optional().or(z.literal("")),
  /** Honeypot — doit rester vide. */
  company_website_confirm: z.string().max(200).optional().or(z.literal("")),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normalise un numéro canadien en E.164 (+1XXXXXXXXXX). */
function toE164(raw: string): string | null {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

/** Accepte un site avec ou sans protocole. */
function normalizeWebsite(raw?: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }, 400);
  }
  const data = parsed.data;

  // Honeypot — on répond 200 sans rien enregistrer.
  if (data.company_website_confirm && data.company_website_confirm.trim() !== "") {
    console.log("[visibilite-ia-lead] honeypot_blocked");
    return json({ ok: true, duplicate: false });
  }

  const phone = toE164(data.phone);
  if (!phone) return json({ error: "invalid_input", details: { phone: ["Numéro de téléphone invalide"] } }, 400);

  const website = normalizeWebsite(data.website);
  if (data.website && data.website.trim() !== "" && !website) {
    return json({ error: "invalid_input", details: { website: ["Adresse de site Web invalide"] } }, 400);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  console.log("[visibilite-ia-lead] submission_received", { source: SOURCE, phone_suffix: phone.slice(-4) });

  // Garde anti-doublon 24 h (téléphone + source)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dupes, error: dupeErr } = await sb
    .from("leads")
    .select("id")
    .eq("intent", "ai_visibility_audit")
    .gte("created_at", since)
    .contains("payload", { phone, source: SOURCE })
    .limit(1);

  if (dupeErr) console.error("[visibilite-ia-lead] duplicate_check_failed", dupeErr.message);
  if (dupes && dupes.length > 0) {
    console.log("[visibilite-ia-lead] duplicate_blocked", { lead_id: dupes[0].id });
    return json({ ok: true, duplicate: true });
  }

  const payload = {
    source: SOURCE,
    company_name: data.company_name,
    contact_name: data.contact_name,
    phone,
    website,
    primary_service: data.primary_service,
    landing_page: data.landing_page || "/visibilite-ia-entrepreneurs",
    referrer: data.referrer || null,
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
    utm_content: data.utm_content || null,
    utm_term: data.utm_term || null,
    consent_context: "Formulaire public — demande d'analyse de visibilité IA. Consentement au contact au sujet de cette demande.",
    submitted_at: new Date().toISOString(),
    ip: req.headers.get("x-forwarded-for") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  };

  const { data: inserted, error } = await sb
    .from("leads")
    .insert({
      lead_type: "contractor",
      intent: "ai_visibility_audit",
      language: "fr",
      status: "new",
      matching_status: "manual",
      specialty_needed: data.primary_service,
      payload,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[visibilite-ia-lead] insert_failed", error.message);
    return json({ error: "insert_failed" }, 500);
  }

  console.log("[visibilite-ia-lead] lead_created", { lead_id: inserted.id });

  // Notification interne (best-effort)
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const notifyTo = Deno.env.get("ADMIN_NOTIFY_EMAIL") || "notify@unpro.ca";
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "UNPRO <notify@unpro.ca>",
          to: [notifyTo],
          subject: `Nouvelle demande — Analyse visibilité IA : ${data.company_name}`,
          html: `
            <h2>Nouvelle demande d'analyse de visibilité IA</h2>
            <ul>
              <li><strong>Entreprise :</strong> ${data.company_name}</li>
              <li><strong>Contact :</strong> ${data.contact_name}</li>
              <li><strong>Téléphone :</strong> ${phone}</li>
              <li><strong>Site Web :</strong> ${website ?? "—"}</li>
              <li><strong>Service principal :</strong> ${data.primary_service}</li>
              <li><strong>Page source :</strong> ${payload.landing_page}</li>
              <li><strong>UTM :</strong> ${payload.utm_source ?? "—"} / ${payload.utm_medium ?? "—"} / ${payload.utm_campaign ?? "—"}</li>
              <li><strong>Lead ID :</strong> ${inserted.id}</li>
            </ul>`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`[visibilite-ia-lead] notification_failed [${res.status}]: ${body}`);
      } else {
        console.log("[visibilite-ia-lead] notification_sent", { lead_id: inserted.id });
      }
    } catch (e) {
      console.error("[visibilite-ia-lead] notification_failed", (e as Error).message);
    }
  } else {
    console.error("[visibilite-ia-lead] notification_skipped_missing_resend_key");
  }

  return json({ ok: true, duplicate: false, lead_id: inserted.id });
});
