import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { campaign_id, dry_run = false } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from("outbound_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check campaign status
    if (campaign.campaign_status === "paused") {
      return new Response(JSON.stringify({ error: "Campaign is paused" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get mailbox
    const mailboxId = (campaign as any).mailbox_id;
    if (!mailboxId) {
      return new Response(JSON.stringify({ error: "No mailbox assigned to campaign" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mailbox } = await supabase
      .from("outbound_mailboxes")
      .select("*")
      .eq("id", mailboxId)
      .single();

    if (!mailbox || mailbox.mailbox_status !== "active") {
      return new Response(JSON.stringify({ error: "Mailbox not active" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check mailbox daily limit
    const sentToday = (mailbox as any).sent_today || 0;
    const dailyLimit = mailbox.daily_limit || 50;
    if (sentToday >= dailyLimit) {
      return new Response(JSON.stringify({ error: "Mailbox daily limit reached", sent_today: sentToday, limit: dailyLimit }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get global settings
    const { data: settings } = await supabase
      .from("outbound_global_settings")
      .select("*")
      .limit(1)
      .single();

    // Get leads ready to send
    const { data: leads } = await supabase
      .from("outbound_leads")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("sending_status", "queued")
      .order("lead_score", { ascending: false })
      .limit(Math.min((campaign as any).hourly_send_limit || 10, dailyLimit - sentToday));

    if (!leads || leads.length === 0) {
      // Try to queue ready_to_send leads
      const { data: readyLeads } = await supabase
        .from("outbound_leads")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("qualification_status", "ready_to_send")
        .eq("sending_status", "not_started")
        .limit(20);

      if (readyLeads && readyLeads.length > 0) {
        const ids = readyLeads.map(l => l.id);
        await supabase
          .from("outbound_leads")
          .update({ sending_status: "queued" } as any)
          .in("id", ids);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${ids.length} leads queued for next run`,
          queued_count: ids.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "No leads to send", sent_count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sequence
    const seqId = (campaign as any).sequence_id;
    let sequenceStep = null;
    if (seqId) {
      const { data: steps } = await supabase
        .from("outbound_sequence_steps")
        .select("*")
        .eq("sequence_id", seqId)
        .eq("is_active", true)
        .order("step_order")
        .limit(1);
      if (steps && steps.length > 0) sequenceStep = steps[0];
    }

    // Create sending run
    const { data: run, error: runErr } = await supabase
      .from("outbound_sending_runs")
      .insert({
        campaign_id,
        mailbox_id: mailboxId,
        status: "running",
        queued_count: leads.length,
      })
      .select()
      .single();

    if (runErr) throw runErr;

    // Update campaign status
    await supabase
      .from("outbound_campaigns")
      .update({ campaign_status: "sending" } as any)
      .eq("id", campaign_id);

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Check suppressions
    const { data: suppressions } = await supabase
      .from("outbound_suppressions")
      .select("email, domain");

    const suppressedEmails = new Set((suppressions || []).map(s => s.email).filter(Boolean));
    const suppressedDomains = new Set((suppressions || []).map(s => s.domain).filter(Boolean));

    for (const lead of leads) {
      const leadEmail = (lead as any).email;
      const leadDomain = (lead as any).domain;

      // Check suppression
      if ((leadEmail && suppressedEmails.has(leadEmail)) || (leadDomain && suppressedDomains.has(leadDomain))) {
        await supabase.from("outbound_leads").update({ sending_status: "suppressed" } as any).eq("id", lead.id);
        skippedCount++;
        continue;
      }

      if (dry_run) {
        sentCount++;
        continue;
      }

      try {
        // Record sent message
        await supabase.from("outbound_sent_messages").insert({
          lead_id: lead.id,
          campaign_id,
          mailbox_id: mailboxId,
          sequence_id: seqId || null,
          sequence_step_id: sequenceStep?.id || null,
          subject: sequenceStep?.subject_template || `Introduction — ${campaign.campaign_name}`,
          body_preview: sequenceStep?.body_template?.substring(0, 200) || "Bonjour, je me permets de vous contacter...",
          delivery_status: "sent",
        } as any);

        // Update lead
        await supabase.from("outbound_leads").update({
          sending_status: "sent",
          last_contacted_at: new Date().toISOString(),
          crm_status: "in_sequence",
        } as any).eq("id", lead.id);

        sentCount++;
      } catch (err) {
        console.error("Send error for lead:", lead.id, err);
        errorCount++;
      }
    }

    // Update mailbox sent_today
    await supabase
      .from("outbound_mailboxes")
      .update({ sent_today: sentToday + sentCount } as any)
      .eq("id", mailboxId);

    // Finalize sending run
    await supabase
      .from("outbound_sending_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        sent_count: sentCount,
        skipped_count: skippedCount,
        error_count: errorCount,
      })
      .eq("id", run.id);

    // Update campaign status
    await supabase
      .from("outbound_campaigns")
      .update({ campaign_status: "active" } as any)
      .eq("id", campaign_id);

    // Log event
    await supabase.from("outbound_events").insert({
      event_type: "sending_completed",
      entity_type: "sending_run",
      entity_id: run.id,
      campaign_id,
      metadata: { sent: sentCount, skipped: skippedCount, errors: errorCount, dry_run },
    });

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      sent_count: sentCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      dry_run,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("edge-start-sending-run error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
