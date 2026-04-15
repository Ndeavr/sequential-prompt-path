import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const WARMUP_PLAN: Record<number, number> = {
  1: 10, 2: 10, 3: 25, 4: 25, 5: 50, 6: 50, 7: 75, 8: 100, 9: 100, 10: 150,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { domain = "mail.unpro.ca", action = "status" } = await req.json().catch(() => ({}));
    const today = new Date().toISOString().split("T")[0];

    if (action === "init") {
      // Create warmup schedule for 10 days
      const rows = Object.entries(WARMUP_PLAN).map(([day, max]) => ({
        domain,
        day_number: Number(day),
        max_emails: max,
        sent_count: 0,
        status: "pending",
        scheduled_date: new Date(Date.now() + (Number(day) - 1) * 86400000).toISOString().split("T")[0],
      }));

      await supabase.from("email_warmup_schedule").delete().eq("domain", domain);
      await supabase.from("email_warmup_schedule").insert(rows);

      return new Response(JSON.stringify({ success: true, days: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get today's schedule
    const { data: todaySchedule } = await supabase
      .from("email_warmup_schedule")
      .select("*")
      .eq("domain", domain)
      .eq("scheduled_date", today)
      .maybeSingle();

    // Get full schedule
    const { data: fullSchedule } = await supabase
      .from("email_warmup_schedule")
      .select("*")
      .eq("domain", domain)
      .order("day_number");

    if (action === "increment") {
      if (todaySchedule) {
        await supabase
          .from("email_warmup_schedule")
          .update({ sent_count: (todaySchedule.sent_count || 0) + 1, status: "active", updated_at: new Date().toISOString() })
          .eq("id", todaySchedule.id);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if sending is allowed
    const canSend = todaySchedule ? todaySchedule.sent_count < todaySchedule.max_emails : false;

    return new Response(JSON.stringify({
      domain,
      today: todaySchedule || null,
      can_send: canSend,
      schedule: fullSchedule || [],
      current_day: todaySchedule?.day_number || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
