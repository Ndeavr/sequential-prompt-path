import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Create notification digests for users with unread notifications.
 * Groups unread notifications from the last 24h into a single digest notification.
 * Designed to be called via cron (daily).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Find profiles with unread notifications from last 24h
    const { data: unreadGroups, error } = await svc
      .from("notifications")
      .select("profile_id, id")
      .eq("status", "unread")
      .gte("created_at", oneDayAgo);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!unreadGroups || unreadGroups.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, digests: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by profile
    const byProfile = new Map<string, string[]>();
    for (const n of unreadGroups) {
      const ids = byProfile.get(n.profile_id) || [];
      ids.push(n.id);
      byProfile.set(n.profile_id, ids);
    }

    let digestCount = 0;

    for (const [profileId, notifIds] of byProfile) {
      if (notifIds.length < 2) continue; // Only create digest for 2+ unread

      // Check user preference for digest
      const { data: pref } = await svc
        .from("notification_preferences")
        .select("is_enabled")
        .eq("profile_id", profileId)
        .eq("channel", "in_app")
        .eq("notification_type", "digest")
        .maybeSingle();

      // Skip if explicitly disabled
      if (pref && !pref.is_enabled) continue;

      // Create digest record
      await svc.from("notification_digests").insert({
        profile_id: profileId,
        digest_type: "daily",
        notification_ids: notifIds,
        channel: "in_app",
        status: "created",
        sent_at: now.toISOString(),
      });

      // Create a summary notification
      await svc.from("notifications").insert({
        profile_id: profileId,
        type: "digest",
        title: `${notifIds.length} notifications en attente`,
        body: `Vous avez ${notifIds.length} notifications non lues. Consultez votre centre de notifications.`,
        channel: "in_app",
        entity_type: "digest",
        metadata: { count: notifIds.length, period: "24h" },
      });

      digestCount++;
    }

    return new Response(
      JSON.stringify({ ok: true, digests: digestCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
