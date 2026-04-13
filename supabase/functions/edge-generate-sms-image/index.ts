import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "match") return handleMatch(body);
    if (action === "log_click") return handleLogClick(body);
    if (action === "list_templates") return handleListTemplates();
    if (action === "list_rules") return handleListRules();
    if (action === "list_logs") return handleListLogs(body);
    if (action === "create_template") return handleCreateTemplate(body);
    if (action === "update_template") return handleUpdateTemplate(body);
    if (action === "delete_template") return handleDeleteTemplate(body);
    if (action === "create_rule") return handleCreateRule(body);
    if (action === "delete_rule") return handleDeleteRule(body);

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

// ─── Match template for SMS ───
async function handleMatch(body: any) {
  const { service_slug, city_slug, user_type, intent } = body;

  // 1. Try exact rules by priority
  const { data: rules } = await sb
    .from("sms_image_rules")
    .select("*, template:template_id(*)")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (rules?.length) {
    for (const rule of rules) {
      const sMatch = !rule.service_match || rule.service_match === service_slug;
      const cMatch = !rule.city_match || rule.city_match === city_slug;
      const uMatch = !rule.user_type_match || rule.user_type_match === user_type;
      const iMatch = !rule.intent_match || rule.intent_match === intent;
      if (sMatch && cMatch && uMatch && iMatch && rule.template) {
        await logUsage(rule.template.id, rule.template.name, body, false, rule.fallback_type);
        return json({ template: rule.template, fallback: false, match_type: "rule" });
      }
    }
  }

  // 2. Try direct template match (service + city)
  let query = sb.from("sms_image_templates").select("*").eq("is_active", true);
  if (service_slug) query = query.eq("service_slug", service_slug);
  if (city_slug) query = query.eq("city_slug", city_slug);
  const { data: exact } = await query.limit(1).maybeSingle();
  if (exact) {
    await logUsage(exact.id, exact.name, body, false, "specific");
    return json({ template: exact, fallback: false, match_type: "specific" });
  }

  // 3. Fallback: service-only
  if (service_slug) {
    const { data: serviceFb } = await sb
      .from("sms_image_templates")
      .select("*")
      .eq("is_active", true)
      .eq("service_slug", service_slug)
      .is("city_slug", null)
      .limit(1)
      .maybeSingle();
    if (serviceFb) {
      await logUsage(serviceFb.id, serviceFb.name, body, true, "service");
      return json({ template: serviceFb, fallback: true, match_type: "service" });
    }
  }

  // 4. Generic fallback
  const { data: generic } = await sb
    .from("sms_image_templates")
    .select("*")
    .eq("is_active", true)
    .is("service_slug", null)
    .is("city_slug", null)
    .limit(1)
    .maybeSingle();

  if (generic) {
    await logUsage(generic.id, generic.name, body, true, "generic");
    return json({ template: generic, fallback: true, match_type: "generic" });
  }

  // 5. No template at all — return dynamic placeholder
  const fallbackTemplate = {
    id: null,
    name: "auto-generated",
    title_text: service_slug
      ? `Besoin d'un expert en ${service_slug.replace(/-/g, " ")}?`
      : "Trouvez le bon professionnel",
    subtitle_text: city_slug
      ? `Service rapide à ${city_slug.replace(/-/g, " ")}`
      : "Partout au Québec",
    cta_text: "Voir mon estimation →",
    image_url: null,
  };
  await logUsage(null, "auto-generated", body, true, "none");
  return json({ template: fallbackTemplate, fallback: true, match_type: "none" });
}

async function logUsage(templateId: string | null, templateName: string, body: any, fallback: boolean, fallbackType: string) {
  await sb.from("sms_image_logs").insert({
    template_id: templateId,
    template_name: templateName,
    phone_number: body.phone_number ?? null,
    fallback_used: fallback,
    fallback_type: fallbackType,
    service_slug: body.service_slug ?? null,
    city_slug: body.city_slug ?? null,
    metadata_json: { user_type: body.user_type, intent: body.intent },
  });
}

async function handleLogClick(body: any) {
  const { log_id } = body;
  if (!log_id) return json({ error: "log_id required" }, 400);
  await sb.from("sms_image_logs").update({ click: true, clicked_at: new Date().toISOString() }).eq("id", log_id);
  return json({ success: true });
}

async function handleListTemplates() {
  const { data } = await sb.from("sms_image_templates").select("*").order("created_at", { ascending: false });
  return json({ templates: data ?? [] });
}

async function handleListRules() {
  const { data } = await sb.from("sms_image_rules").select("*, template:template_id(id,name)").order("priority", { ascending: false });
  return json({ rules: data ?? [] });
}

async function handleListLogs(body: any) {
  const limit = body.limit ?? 100;
  const { data } = await sb.from("sms_image_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  return json({ logs: data ?? [] });
}

async function handleCreateTemplate(body: any) {
  const { template } = body;
  const { data, error } = await sb.from("sms_image_templates").insert(template).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ template: data });
}

async function handleUpdateTemplate(body: any) {
  const { id, updates } = body;
  const { data, error } = await sb.from("sms_image_templates").update(updates).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ template: data });
}

async function handleDeleteTemplate(body: any) {
  const { id } = body;
  await sb.from("sms_image_templates").delete().eq("id", id);
  return json({ success: true });
}

async function handleCreateRule(body: any) {
  const { rule } = body;
  const { data, error } = await sb.from("sms_image_rules").insert(rule).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ rule: data });
}

async function handleDeleteRule(body: any) {
  const { id } = body;
  await sb.from("sms_image_rules").delete().eq("id", id);
  return json({ success: true });
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
