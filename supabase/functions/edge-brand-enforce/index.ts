import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, supabaseKey);

const BLOCKED_PATTERNS = ["lovable", "Lovable", "powered by", "Made with", "built with"];

interface BrandAsset {
  id: string;
  asset_type: string;
  theme: string;
  url: string;
  is_default: boolean;
}

interface BrandRule {
  id: string;
  placement: string;
  size_ratio: number;
  padding_px: number;
  enforce_override: boolean;
  blocked_patterns: string[];
}

async function getDefaultAsset(theme: string): Promise<BrandAsset | null> {
  const { data } = await sb
    .from("brand_assets")
    .select("*")
    .eq("asset_type", "logo")
    .eq("theme", theme)
    .eq("is_default", true)
    .eq("is_active", true)
    .limit(1)
    .single();
  return data;
}

async function getActiveRule(): Promise<BrandRule | null> {
  const { data } = await sb
    .from("brand_rules")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data;
}

function detectForeignBrand(text: string, patterns: string[]): string | null {
  const lower = text.toLowerCase();
  for (const p of patterns) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

async function logEnforcement(params: {
  image_ref?: string;
  template_id?: string;
  override_applied: boolean;
  previous_brand_detected?: string;
  asset_used_id?: string;
  rule_used_id?: string;
  channel?: string;
}) {
  await sb.from("brand_logs").insert({
    image_ref: params.image_ref ?? null,
    template_id: params.template_id ?? null,
    override_applied: params.override_applied,
    previous_brand_detected: params.previous_brand_detected ?? null,
    asset_used_id: params.asset_used_id ?? null,
    rule_used_id: params.rule_used_id ?? null,
    channel: params.channel ?? "sms",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    // ── GET active logo ──
    if (action === "get_active_logo") {
      const theme = body.theme ?? "light";
      const asset = await getDefaultAsset(theme);
      if (!asset) {
        return new Response(JSON.stringify({ error: "No default asset found", fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      return new Response(JSON.stringify({ asset }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ENFORCE branding on content ──
    if (action === "enforce") {
      const { image_ref, template_id, text_content, theme, channel } = body;
      const rule = await getActiveRule();
      const patterns = rule?.blocked_patterns?.length ? rule.blocked_patterns : BLOCKED_PATTERNS;

      // Detect foreign brand in text
      const detected = text_content ? detectForeignBrand(text_content, patterns) : null;
      const override_applied = !!detected || rule?.enforce_override === true;

      // Get correct logo
      const asset = await getDefaultAsset(theme ?? "light");

      // Log
      await logEnforcement({
        image_ref,
        template_id,
        override_applied,
        previous_brand_detected: detected ?? undefined,
        asset_used_id: asset?.id,
        rule_used_id: rule?.id,
        channel: channel ?? "sms",
      });

      return new Response(
        JSON.stringify({
          enforced: true,
          override_applied,
          previous_brand_detected: detected,
          logo: asset
            ? { url: asset.url, theme: asset.theme, id: asset.id }
            : { url: "/brand/unpro-logo-white.svg", theme: "light", id: null },
          placement: rule
            ? { position: rule.placement, size_ratio: rule.size_ratio, padding_px: rule.padding_px }
            : { position: "top-left", size_ratio: 0.15, padding_px: 12 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST assets ──
    if (action === "list_assets") {
      const { data } = await sb.from("brand_assets").select("*").eq("is_active", true).order("created_at");
      return new Response(JSON.stringify({ assets: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST rules ──
    if (action === "list_rules") {
      const { data } = await sb.from("brand_rules").select("*").order("created_at");
      return new Response(JSON.stringify({ rules: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST logs ──
    if (action === "list_logs") {
      const limit = body.limit ?? 50;
      const { data } = await sb.from("brand_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      return new Response(JSON.stringify({ logs: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STATS ──
    if (action === "stats") {
      const { data: logs } = await sb.from("brand_logs").select("override_applied, previous_brand_detected, created_at");
      const total = logs?.length ?? 0;
      const overrides = logs?.filter((l) => l.override_applied).length ?? 0;
      const foreignDetected = logs?.filter((l) => l.previous_brand_detected).length ?? 0;
      return new Response(
        JSON.stringify({ total, overrides, foreign_detected: foreignDetected, compliance_rate: total ? ((total - foreignDetected) / total) * 100 : 100 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
