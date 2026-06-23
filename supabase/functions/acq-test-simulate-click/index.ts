// UNPRO — Simulate click on a tracking link (server-side, bypasses redirect)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { tracking_id } = await req.json().catch(() => ({ tracking_id: null }));
  if (!tracking_id) return new Response(JSON.stringify({ ok: false, error: "tracking_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: link } = await supa.from("acquisition_tracking_links").select("*").eq("id", tracking_id).maybeSingle();
  if (!link) return new Response(JSON.stringify({ ok: false, error: "tracking_id not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });

  const now = new Date().toISOString();
  await supa.from("acquisition_tracking_links").update({
    click_count: (link.click_count ?? 0) + 1,
    first_click_at: link.first_click_at ?? now,
    last_click_at: now,
  }).eq("id", tracking_id);

  await logAcquisitionEvent({
    prospect_id: link.prospect_id, contractor_id: link.contractor_id, profile_id: link.profile_id,
    tracking_id, channel: "manual", event_type: "clicked", provider: "app",
    provider_event_id: `${tracking_id}:simulated:${now}`,
    metadata: { simulated: true },
  });

  return new Response(JSON.stringify({ ok: true, tracking_id, destination: link.destination_url }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
