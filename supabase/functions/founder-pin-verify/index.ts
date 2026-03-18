import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referral_code, pin } = await req.json();

    if (!referral_code || !pin || typeof pin !== "string" || pin.length !== 4) {
      return new Response(
        JSON.stringify({ success: false, error: "Code PIN invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: check recent failed attempts for this invite
    const { data: invite } = await supabase
      .from("founder_invites")
      .select("*")
      .eq("referral_code", referral_code)
      .eq("status", "active")
      .single();

    if (!invite) {
      return new Response(
        JSON.stringify({ success: false, error: "Invitation introuvable ou expirée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supabase.from("founder_invites").update({ status: "expired" }).eq("id", invite.id);
      return new Response(
        JSON.stringify({ success: false, error: "Cette invitation a expiré" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max uses
    if (invite.used_count >= invite.max_uses) {
      return new Response(
        JSON.stringify({ success: false, error: "Cette invitation a atteint sa limite d'utilisation" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 5 failed attempts in last 15 min
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentFails } = await supabase
      .from("founder_invite_access_logs")
      .select("id", { count: "exact", head: true })
      .eq("founder_invite_id", invite.id)
      .eq("success", false)
      .gte("created_at", fifteenMinAgo);

    if ((recentFails ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: "Trop de tentatives. Réessayez dans 15 minutes.", locked: true }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userAgent = req.headers.get("user-agent")?.substring(0, 200) ?? "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

    const isValid = invite.access_pin === pin;

    // Log attempt
    await supabase.from("founder_invite_access_logs").insert({
      founder_invite_id: invite.id,
      entered_pin: pin,
      success: isValid,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (!isValid) {
      const remaining = 5 - ((recentFails ?? 0) + 1);
      return new Response(
        JSON.stringify({ success: false, error: "Code incorrect", remaining_attempts: Math.max(remaining, 0) }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success: increment used_count
    await supabase
      .from("founder_invites")
      .update({ used_count: invite.used_count + 1 })
      .eq("id", invite.id);

    // Generate a simple access token (timestamp-based, expires in 4 hours)
    const accessToken = btoa(JSON.stringify({
      invite_id: invite.id,
      ref: referral_code,
      exp: Date.now() + 4 * 60 * 60 * 1000,
    }));

    return new Response(
      JSON.stringify({ success: true, access_token: accessToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
