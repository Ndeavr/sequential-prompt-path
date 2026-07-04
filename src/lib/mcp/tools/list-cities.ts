import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_cities",
  title: "List Québec cities",
  description: "List Québec cities served by UNPRO. Optional prefix filter.",
  inputSchema: {
    prefix: z.string().optional().describe("Filter cities starting with this prefix."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ prefix, limit }) => {
    const supa = client();
    let q = supa.from("cities").select("name, slug, region, population").order("population", { ascending: false, nullsFirst: false }).limit(limit ?? 50);
    if (prefix) q = q.ilike("name", `${prefix}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { cities: data ?? [] },
    };
  },
});
