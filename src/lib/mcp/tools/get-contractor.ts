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
  name: "get_contractor",
  title: "Get contractor",
  description: "Fetch a UNPRO contractor's public profile by slug.",
  inputSchema: {
    slug: z.string().min(1).describe("Contractor slug, e.g. 'plomberie-tremblay-montreal'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supa = client();
    const { data, error } = await supa
      .from("contractors")
      .select(
        "id, slug, business_name, legal_name, specialty, description, city, province, postal_code, website, aipp_score, rating, review_count, years_experience, rbq_number, neq, verification_status, logo_url",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: `Erreur: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: `Aucun entrepreneur trouvé pour '${slug}'.` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { contractor: data },
    };
  },
});
