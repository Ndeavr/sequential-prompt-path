// sms-curiosity-enroll — inscrit un prospect dans la séquence Curiosité 12.
// Admin only. POST { prospect_id?, slug?, phone?, dry_run? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { TOTAL_STEPS, templateKeyForStep, nextSendDate, renderTemplate } from "../_shared/curiositySchedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const E164 = /^\+[1-9]\d{7,14}$/;

function normalize(phone: string): string {
  const trimmed = phone.replace(/[\s().-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (/^\d{10}$/.test(trimmed)) return `+1${trimmed}`;
  if (/^1\d{10}$/.test(trimmed)) return `+${trimmed}`;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supaAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supaAuth.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const { prospect_id, slug, phone: phoneIn, dry_run } = body ?? {};

    let prospect: any = null;
    if (prospect_id) {
      const { data } = await supabase.from("prospect_pages").select("*").eq("id", prospect_id).maybeSingle();
      prospect = data;
    }
    if (!prospect && slug) {
      const { data } = await supabase.from("prospect_pages").select("*").eq("slug", slug).maybeSingle();
      prospect = data;
    }
    if (!prospect) {
      return new Response(JSON.stringify({ error: "prospect_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phoneRaw = (phoneIn ?? prospect.phone ?? "").trim();
    const phone = normalize(phoneRaw);
    if (!E164.test(phone)) {
      return new Response(JSON.stringify({ error: "invalid_phone", phone }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: optOut } = await supabase.from("sms_opt_outs").select("id").eq("normalized_phone", phone).maybeSingle();
    if (optOut) {
      return new Response(JSON.stringify({ error: "opted_out" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Preview (dry-run): rendre les 12 SMS avec leurs dates planifiées sans persister.
    if (dry_run) {
      const { data: templates } = await supabase
        .from("sms_templates").select("template_key, body_template")
        .in("template_key", Array.from({ length: TOTAL_STEPS }, (_, i) => templateKeyForStep(i + 1)));
      const tplMap = new Map((templates ?? []).map((t: any) => [t.template_key, t.body_template]));
      const enrolledAt = new Date();
      const vars = {
        company: prospect.company_name,
        city: prospect.city ?? "",
        service: prospect.service ?? "",
        link: `https://go.unpro.ca/${prospect.slug}`,
      };
      const preview = Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1;
        const k = templateKeyForStep(step);
        return {
          step,
          template_key: k,
          scheduled_at: nextSendDate(enrolledAt, step).toISOString(),
          body: renderTemplate(tplMap.get(k) ?? "", vars),
        };
      });
      return new Response(JSON.stringify({ ok: true, dry_run: true, preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifie qu'il n'y a pas déjà une séquence active/paused.
    const { data: existing } = await supabase
      .from("contractor_curiosity_sms_sequences")
      .select("id, status, current_step")
      .eq("prospect_id", prospect.id)
      .in("status", ["active", "paused"])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "already_enrolled", sequence_id: existing.id, status: existing.status, current_step: existing.current_step }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrolledAt = new Date();
    const firstSendAt = nextSendDate(enrolledAt, 1);
    const { data: inserted, error } = await supabase
      .from("contractor_curiosity_sms_sequences")
      .insert({
        prospect_id: prospect.id,
        phone,
        status: "active",
        current_step: 0,
        next_send_at: firstSendAt.toISOString(),
        enrolled_by: userId,
        meta: {
          company: prospect.company_name,
          city: prospect.city,
          service: prospect.service,
          link: `https://go.unpro.ca/${prospect.slug}`,
          slug: prospect.slug,
        },
      })
      .select("id")
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, sequence_id: inserted.id, first_send_at: firstSendAt.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
