// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Rule {
  pattern: string;
  match_type: "plain" | "regex";
  severity: "block" | "warn";
  category: string;
  description: string | null;
  enabled: boolean;
}

interface Violation {
  source: string;
  record_id: string | null;
  field: string;
  snippet: string;
  pattern: string;
  severity: string;
  category: string;
}

function compile(rule: Rule): RegExp {
  if (rule.match_type === "regex") return new RegExp(rule.pattern, "gi");
  const esc = rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(esc, "gi");
}

function scanText(text: string | null | undefined, rules: { rule: Rule; re: RegExp }[]) {
  if (!text) return [] as { rule: Rule; snippet: string }[];
  const hits: { rule: Rule; snippet: string }[] = [];
  for (const { rule, re } of rules) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) hits.push({ rule, snippet: text.slice(Math.max(0, m.index - 30), m.index + 120) });
  }
  return hits;
}

// CMS-ish tables we scan if present. Missing tables are skipped silently.
const SOURCES: Array<{ table: string; fields: string[] }> = [
  { table: "faq_entries", fields: ["question", "answer", "question_fr", "answer_fr"] },
  { table: "blog_posts", fields: ["title", "excerpt", "body", "content"] },
  { table: "landing_copy", fields: ["headline", "subhead", "body"] },
  { table: "email_templates", fields: ["subject", "body_html", "body_text"] },
  { table: "sms_templates", fields: ["body", "message"] },
  { table: "alex_prompts", fields: ["prompt", "system_prompt", "content"] },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: ruleRows, error: rulesErr } = await supabase
      .from("content_visibility_rules")
      .select("*")
      .eq("enabled", true);
    if (rulesErr) throw rulesErr;

    const rules = (ruleRows ?? []) as Rule[];
    const compiled = rules.map((r) => ({ rule: r, re: compile(r) }));

    const violations: Violation[] = [];

    for (const src of SOURCES) {
      const { data, error } = await supabase.from(src.table).select("*").limit(2000);
      if (error || !data) continue; // table likely missing — skip
      for (const row of data as Record<string, unknown>[]) {
        for (const f of src.fields) {
          const v = row[f];
          if (typeof v !== "string") continue;
          for (const hit of scanText(v, compiled)) {
            violations.push({
              source: src.table,
              record_id: (row.id as string) ?? null,
              field: f,
              snippet: hit.snippet,
              pattern: hit.rule.pattern,
              severity: hit.rule.severity,
              category: hit.rule.category,
            });
          }
        }
      }
    }

    const blockingCount = violations.filter((v) => v.severity === "block").length;
    const status = blockingCount > 0 ? "fail" : violations.length > 0 ? "warn" : "ok";

    const { data: run, error: insErr } = await supabase
      .from("content_audit_runs")
      .insert({
        violations_count: violations.length,
        blocking_count: blockingCount,
        status,
        source: "edge:content-audit-run",
        report: { violations, scanned_sources: SOURCES.map((s) => s.table) },
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, run_id: run.id, status, violations_count: violations.length, blocking_count: blockingCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
