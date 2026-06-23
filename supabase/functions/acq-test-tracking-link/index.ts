// UNPRO — Generate test tracking link
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function shortId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const body = await req.json().catch(() => ({}));
  const destination = body?.destination_url || "https://unpro.ca";

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const id = body?.id || shortId();
  const { error } = await supa.from("acquisition_tracking_links").insert({
    id,
    destination_url: destination,
    campaign: body?.campaign || "admin_test",
    channel: body?.channel || "manual",
    metadata: { test: true, ...(body?.metadata || {}) },
  });
  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https?:\/\/([^.]+)/)?.[1] || "";
  const trackingUrl = `https://${projectRef}.functions.supabase.co/r-redirect/${id}`;
  const publicUrl = `https://unpro.ca/r/${id}`;

  return new Response(JSON.stringify({ ok: true, id, tracking_url: trackingUrl, public_url: publicUrl, destination }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
