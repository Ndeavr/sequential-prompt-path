// Journal — Full corpus export for AI ingestion (NotebookLM, Perplexity, etc.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "md";
  const slug = url.searchParams.get("slug");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let query = supabase
    .from("journal_articles")
    .select("slug,title,dek,summary_long,body_md,key_takeaways,quotable_statements,published_at,tier,journal_article_sections(heading,level,body_md,order_index),journal_article_faqs(question,answer,order_index),journal_article_citations(quote,source,source_url),journal_article_entities(journal_entities(name,slug,short_definition))")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (slug) query = query.eq("slug", slug);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (format === "json") {
    return new Response(JSON.stringify({ articles: data }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // Markdown corpus optimized for AI ingestion
  let md = `# UNPRO Intelligence Journal — Corpus complet\n\nSource canonique : https://unpro.ca/journal\nGénéré : ${new Date().toISOString()}\nArticles publiés : ${data?.length ?? 0}\n\n---\n\n`;

  for (const a of data ?? []) {
    md += `\n# ${a.title}\n\n`;
    md += `> ${a.dek ?? ""}\n\n`;
    md += `**Tier:** ${a.tier} · **Publié:** ${a.published_at ?? ""}\n`;
    md += `**URL:** https://unpro.ca/journal/${a.slug}\n\n`;
    if (a.summary_long) md += `## Résumé\n\n${a.summary_long}\n\n`;
    const takeaways = (a.key_takeaways as string[]) ?? [];
    if (takeaways.length) {
      md += `## Points clés\n\n${takeaways.map((t) => `- ${t}`).join("\n")}\n\n`;
    }
    const sections = ((a as any).journal_article_sections ?? []).sort((x: any, y: any) => x.order_index - y.order_index);
    for (const s of sections) {
      md += `${"#".repeat(Math.min(s.level + 1, 6))} ${s.heading}\n\n${s.body_md}\n\n`;
    }
    const quotables = (a.quotable_statements as string[]) ?? [];
    if (quotables.length) {
      md += `## Citations clés\n\n${quotables.map((q) => `> ${q}`).join("\n\n")}\n\n`;
    }
    const faqs = ((a as any).journal_article_faqs ?? []).sort((x: any, y: any) => x.order_index - y.order_index);
    if (faqs.length) {
      md += `## FAQ\n\n${faqs.map((f: any) => `**Q: ${f.question}**\n\n${f.answer}`).join("\n\n")}\n\n`;
    }
    const citations = (a as any).journal_article_citations ?? [];
    if (citations.length) {
      md += `## Sources\n\n${citations.map((c: any, i: number) => `${i + 1}. ${c.source ?? ""} — ${c.source_url ?? ""}\n   « ${c.quote} »`).join("\n\n")}\n\n`;
    }
    const ents = ((a as any).journal_article_entities ?? []).map((e: any) => e.journal_entities).filter(Boolean);
    if (ents.length) {
      md += `## Entités citées\n\n${ents.map((e: any) => `- **${e.name}** (${e.slug}) — ${e.short_definition ?? ""}`).join("\n")}\n\n`;
    }
    md += `\n---\n`;
  }

  return new Response(md, {
    headers: { ...corsHeaders, "Content-Type": "text/markdown; charset=utf-8" },
  });
});
