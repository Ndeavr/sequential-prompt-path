// Generate outreach scripts (SMS, email, FB DM, call opener) for a lead via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Tu es Alex d'UNPRO. Tu écris des messages d'approche en français québécois pour entrepreneurs détectés sur Facebook.
Ton: confiant, court, respectueux, jamais agressif. Tutoiement.
Angle UNPRO: au lieu de compétitionner avec 30 entrepreneurs dans les commentaires, UNPRO recommande directement le bon pro avant que le client publie sa demande.
Retourne STRICTEMENT un JSON: {"sms": "...", "email_subject": "...", "email_body": "...", "facebook_dm": "...", "call_opener": "...", "aipp_hook": "..."}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const { lead_id } = (await req.json()) as { lead_id: string };
    const { data: lead, error } = await svc.from("fb_contractor_leads").select("*").eq("id", lead_id).single();
    if (error || !lead) throw new Error("lead not found");

    const userPrompt = `Entrepreneur:
- Nom: ${lead.company_name ?? "—"}
- Contact: ${lead.contact_name ?? "—"}
- Ville: ${lead.city ?? "—"}
- Spécialité: ${lead.trade_category ?? "—"}
- AIPP score: ${lead.aipp_score ?? 0}/100
- Source: commentaire Facebook
Génère les 6 scripts.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
      }),
    });
    const j = await r.json();
    let txt: string = j?.choices?.[0]?.message?.content ?? "{}";
    txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let scripts: any = {};
    try { scripts = JSON.parse(txt); } catch { scripts = { error: "parse failed", raw: txt }; }

    // Persist as drafts
    const rows: any[] = [];
    for (const [channel, content] of [
      ["sms", scripts.sms],
      ["email", scripts.email_body],
      ["facebook_dm", scripts.facebook_dm],
      ["call", scripts.call_opener],
      ["aipp_hook", scripts.aipp_hook],
    ] as const) {
      if (content) rows.push({
        contractor_lead_id: lead_id,
        channel,
        subject: channel === "email" ? scripts.email_subject ?? null : null,
        body: content,
        tone: "concierge_decisif",
        status: "draft",
      });
    }
    if (rows.length) await svc.from("fb_contractor_outreach_messages").insert(rows);

    return new Response(JSON.stringify({ scripts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[fb-generate-outreach]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
