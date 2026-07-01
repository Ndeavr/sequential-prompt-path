// revenue-gate-snapshot — captures a "before" or "after" snapshot of the visibility
// fields on a contractor, saves it to revenue_gate_audit_runs, and returns it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIELDS = [
  "id",
  "business_name",
  "slug",
  "account_status",
  "activation_status",
  "onboarding_status",
  "is_published",
  "is_discoverable",
  "is_accepting_appointments",
  "published_at",
  "stripe_customer_id",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const contractorId = body?.contractor_id as string | undefined;
    const phase = (body?.phase as string | undefined) ?? "before";
    const sessionId = (body?.session_id as string | undefined) ?? null;

    if (!contractorId || !["before", "after"].includes(phase)) {
      return new Response(
        JSON.stringify({ error: "contractor_id and phase in [before|after] required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await sb
      .from("contractors")
      .select(FIELDS.join(","))
      .eq("id", contractorId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "contractor not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await sb.from("revenue_gate_audit_runs").insert({
      contractor_id: contractorId,
      phase,
      snapshot: data,
      session_id: sessionId,
    });

    return new Response(JSON.stringify({ ok: true, phase, snapshot: data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
