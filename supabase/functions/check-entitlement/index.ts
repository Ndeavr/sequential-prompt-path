/**
 * UNPRO — check-entitlement
 * Server-side truth for contractor plan entitlements, used by the UI before
 * rendering or enabling any gated action. Denials are logged automatically.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkEntitlement } from "../_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await (anon.auth as any).getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const featureKeys: string[] = Array.isArray(body?.feature_keys)
      ? body.feature_keys.filter((k: unknown) => typeof k === "string").slice(0, 25)
      : typeof body?.feature_key === "string"
        ? [body.feature_key]
        : [];

    if (featureKeys.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "feature_key or feature_keys required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: contractor } = await service
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const entitlements: Record<string, unknown> = {};
    for (const key of featureKeys) {
      entitlements[key] = await checkEntitlement(service, {
        userId,
        contractorId: contractor?.id ?? null,
        featureKey: key,
        surface: typeof body?.surface === "string" ? body.surface : "client",
      });
    }

    const { data: planCode } = await service.rpc("contractor_plan_code", { _user_id: userId });

    return new Response(
      JSON.stringify({ ok: true, plan_code: planCode ?? null, entitlements }),
      { status: 200, headers: corsHeaders },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
