import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const slug = url.searchParams.get("slug");

    let query = supabase
      .from("guides_content")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (slug) query = query.eq("slug", slug);

    const { data, error } = await query.limit(50);
    if (error) throw error;

    return new Response(JSON.stringify({ guides: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
