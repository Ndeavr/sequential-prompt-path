/**
 * alex-voice-save-config — Admin endpoint to update voice profiles.
 * Logs all changes for audit trail.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    const body = await req.json();
    const { profile_id, updates } = body;

    if (!profile_id || !updates) {
      return new Response(JSON.stringify({ error: "profile_id and updates required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current profile for audit log
    const { data: current } = await supabase
      .from("alex_voice_profiles")
      .select("*")
      .eq("id", profile_id)
      .single();

    if (!current) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("alex_voice_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", profile_id);

    if (updateError) throw updateError;

    // Log admin change
    await supabase.from("alex_voice_admin_changes").insert({
      admin_id: user?.id || null,
      profile_key: current.profile_key,
      language: current.language,
      old_voice_id: current.voice_id_primary,
      new_voice_id: updates.voice_id_primary || current.voice_id_primary,
      old_config: current,
      new_config: { ...current, ...updates },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-voice-save-config error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
