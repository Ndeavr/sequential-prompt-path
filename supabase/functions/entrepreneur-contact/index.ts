/**
 * UNPRO — Edge function : reçoit une demande de soumission depuis une page entrepreneur publique.
 * Public (pas de JWT requis). Validation Zod, insertion dans `leads`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  contractor_id: z.string().uuid(),
  contractor_slug: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  description: z.string().trim().min(10).max(1000),
  preferred_date: z.string().max(50).optional().or(z.literal("")),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_input", details: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const data = parsed.data;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { error } = await sb.from("leads").insert({
    lead_type: "contractor_inquiry",
    intent: "contact_from_profile",
    language: "fr",
    status: "new",
    matching_status: "manual",
    assigned_contractor_id: data.contractor_id,
    payload: {
      source: "entrepreneur_profile",
      contractor_slug: data.contractor_slug,
      name: data.name,
      email: data.email,
      description: data.description,
      preferred_date: data.preferred_date || null,
      submitted_at: new Date().toISOString(),
      ip: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    },
  });

  if (error) {
    console.error("leads insert failed:", error);
    return new Response(JSON.stringify({ error: "insert_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
