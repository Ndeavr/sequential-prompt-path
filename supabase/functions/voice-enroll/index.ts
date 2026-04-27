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

    // ── Embedding placeholder ──
    // In production, send audioBase64 to an external speaker-verification
    // service (e.g. Resemblyzer, SpeechBrain, Azure Speaker Recognition)
    // and store the returned embedding vector.
    // For now we store a fingerprint hash as a placeholder.
    const placeholderEmbedding = {
      provider: "placeholder",
      hash: await hashAudio(audioBase64),
      sampleLengthBytes: audioBase64.length,
    };

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upsert voice profile
    const { data: existing } = await serviceSupabase
      .from("user_voice_profiles")
      .select("id, sample_count")
      .eq("user_id", userId)
      .eq("profile_name", profileName)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await serviceSupabase
        .from("user_voice_profiles")
        .update({
          embedding_json: placeholderEmbedding,
          sample_count: (existing.sample_count ?? 0) + 1,
          last_sample_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ ok: false, error: updateErr.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          profileId: existing.id,
          sampleCount: (existing.sample_count ?? 0) + 1,
          provider: "placeholder",
        }),
        { headers: corsHeaders }
      );
    }

    const { data: inserted, error: insertErr } = await serviceSupabase
      .from("user_voice_profiles")
      .insert({
        user_id: userId,
        profile_name: profileName,
        embedding_json: placeholderEmbedding,
        provider: "placeholder",
        sample_count: 1,
        last_sample_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ ok: false, error: insertErr.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        profileId: inserted.id,
        sampleCount: 1,
        provider: "placeholder",
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

/** Simple hash for placeholder fingerprint */
async function hashAudio(base64: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64.slice(0, 2048));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
