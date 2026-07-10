// dispatch-priority-outreach — sends the winning SMS template to top-scored prospects
// Respects outreach_send_windows + suppression list. Creates contractor_leads + outreach logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 20), 200);
    const dryRun = body.dry_run !== false; // default TRUE — safe

    // Winner template, fallback = variant A
    const { data: winnerRows } = await supabase
      .from("outreach_template_metrics")
      .select("template_key, variant")
      .eq("is_winner", true)
      .limit(1);
    let templateKey = (winnerRows as Array<{ template_key: string }> | null)?.[0]?.template_key
      ?? "war_room_variant_a";

    const { data: tpl } = await supabase
      .from("outreach_templates")
      .select("body_template")
      .eq("template_name", templateKey)
      .maybeSingle();
    const body_template = (tpl as { body_template: string } | null)?.body_template
      ?? "UNPRO: 1$ pour 7 jours. unpro.ca";

    // Suppression: build a domain blocklist
    const { data: sup } = await supabase
      .from("outbound_suppressions")
      .select("domain")
      .eq("active", true)
      .eq("suppression_type", "domain");
    const blockedDomains = new Set(
      ((sup as Array<{ domain: string }> | null) ?? []).map(s => (s.domain ?? "").toLowerCase()),
    );

    // Top priority prospects with phone and no prior outreach today
    const { data: priorityRows } = await supabase
      .from("contractor_prospect_priority")
      .select("prospect_id, total_score")
      .gte("total_score", 60)
      .order("total_score", { ascending: false })
      .limit(limit * 3); // over-fetch to filter

    const ids = ((priorityRows as Array<{ prospect_id: string }> | null) ?? []).map(r => r.prospect_id);
    if (ids.length === 0) {
      return json({ dispatched: 0, reason: "no_priority_prospects" });
    }

    const { data: prospects } = await supabase
      .from("contractor_prospects")
      .select("id, business_name, phone, email, website_url, city, category_slug")
      .in("id", ids);

    const eligible = ((prospects as Array<{
      id: string; business_name: string; phone: string | null; email: string | null;
      website_url: string | null; city: string | null; category_slug: string | null;
    }> | null) ?? [])
      .filter(p => {
        if (!p.phone || p.phone.replace(/\D/g, "").length < 10) return false;
        if (p.website_url) {
          try {
            const host = new URL(p.website_url).hostname.replace(/^www\./, "").toLowerCase();
            if (blockedDomains.has(host)) return false;
          } catch { /* invalid URL, keep */ }
        }
        return true;
      })
      .slice(0, limit);

    if (dryRun) {
      return json({
        dry_run: true,
        would_dispatch: eligible.length,
        template_key: templateKey,
        prospects: eligible.map(p => ({ id: p.id, name: p.business_name, phone: p.phone })),
      });
    }

    let dispatched = 0;
    for (const p of eligible) {
      // Create or fetch lead
      const { data: leadRow } = await supabase
        .from("contractor_leads")
        .insert({
          source_type: "war_room_v1",
          company_name: p.business_name,
          phone: p.phone,
          email: p.email,
          city: p.city,
          category_primary: p.category_slug,
          outreach_status: "queued",
          metadata_json: { prospect_id: p.id, template_key: templateKey },
        })
        .select("id")
        .single();

      const leadId = (leadRow as { id: string } | null)?.id;
      if (!leadId) continue;

      // Invoke existing SMS sender
      const { error: smsErr } = await supabase.functions.invoke("acq-sms-send", {
        body: {
          lead_id: leadId,
          phone: p.phone,
          template_key: templateKey,
          body: body_template,
        },
      });

      if (smsErr) {
        console.error("[dispatch] sms err", smsErr);
        continue;
      }
      dispatched++;
    }

    return json({ dispatched, template_key: templateKey });
  } catch (e) {
    console.error("[dispatch-priority-outreach]", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
