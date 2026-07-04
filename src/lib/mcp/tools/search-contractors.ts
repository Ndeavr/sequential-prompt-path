import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client() {
  // Lazy import — keeps module import-safe (no top-level env reads).
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_contractors",
  title: "Search contractors",
  description:
    "Search UNPRO verified contractors in Québec by city, specialty/trade, or free-text query. Returns business name, city, specialty, AIPP score, rating and slug.",
  inputSchema: {
    query: z.string().optional().describe("Free-text search on business name."),
    city: z.string().optional().describe("City name, e.g. 'Montréal', 'Québec'."),
    specialty: z.string().optional().describe("Trade/specialty, e.g. 'plombier', 'toiture'."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, specialty, limit }) => {
    const supa = client();
    let q = supa
      .from("contractors")
      .select("id, slug, business_name, specialty, city, province, aipp_score, rating, review_count, verification_status")
      .order("aipp_score", { ascending: false, nullsFirst: false })
      .limit(limit ?? 10);
    if (query) q = q.ilike("business_name", `%${query}%`);
    if (city) q = q.ilike("city", `%${city}%`);
    if (specialty) q = q.ilike("specialty", `%${specialty}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
