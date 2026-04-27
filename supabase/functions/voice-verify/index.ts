import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await (supabase.auth as any).getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const audioBase64 = body?.audioBase64 as string | undefined;
    const profileName = (body?.profileName as string) || "default";

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ ok: false, error: "audioBase64 is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileErr } = await serviceSupabase
      .from("user_voice_profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("profile_name", profileName)
      .eq("is_active", true)
      .maybeSingle();

    if (profileErr) {
      return new Response(
        JSON.stringify({ ok: false, error: profileErr.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          ok: true,
          score: 0,
          accepted: false,
          reason: "no_profile",
        }),
        { headers: corsHeaders }
      );
    }

    // ── Verification placeholder ──
    // In production, send both the stored embedding and the new audioBase64
    // to an external speaker-verification service for cosine similarity.
    // For now, compare placeholder hashes.
    const incomingHash = await hashAudio(audioBase64);
    const storedHash = (profile.embedding_json as any)?.hash;

    const score = storedHash && incomingHash === storedHash ? 1.0 : 0.0;
    const accepted = score >= 0.7;

    return new Response(
      JSON.stringify({
        ok: true,
        score,
        accepted,
        provider: profile.provider,
        profileId: profile.id,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function hashAudio(base64: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64.slice(0, 2048));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
