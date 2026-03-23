import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get articles missing content
    const { data: articles, error } = await supabase
      .from("blog_articles")
      .select("id, title, category, city, slug, subtitle")
      .eq("status", "published")
      .or("content_html.is.null,content_html.eq.")
      .limit(5);

    if (error) throw error;
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ message: "No articles need content", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const article of articles) {
      try {
        const prompt = `Tu es un rédacteur SEO expert en services résidentiels au Québec. Rédige un article complet en HTML (sans balises <html>, <head>, <body> — seulement le contenu).

Titre: ${article.title}
Catégorie: ${article.category || "services résidentiels"}
Ville: ${article.city || "Québec"}
${article.subtitle ? `Sous-titre: ${article.subtitle}` : ""}

Exigences:
- 800 à 1200 mots
- Français naturel du Québec
- Structure: H2 et H3 pour les sections
- Inclure des paragraphes informatifs, conseils pratiques, et coûts estimés quand pertinent
- Inclure une section "Quand faire appel à un professionnel"
- Ton professionnel mais accessible
- Optimisé SEO avec mots-clés naturels
- Utiliser des listes <ul>/<ol> quand approprié
- Ne PAS inclure de titre H1 (il est déjà affiché séparément)
- Format: HTML pur, pas de markdown`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un rédacteur SEO spécialisé en services résidentiels au Québec. Retourne uniquement du HTML, sans bloc de code markdown." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${article.id}:`, aiResponse.status, errText);
          results.push({ id: article.id, status: "error", error: `AI ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        let content = aiData.choices?.[0]?.message?.content || "";

        // Strip markdown code fences if present
        content = content.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

        // Count words
        const wordCount = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

        const { error: updateError } = await supabase
          .from("blog_articles")
          .update({
            content_html: content,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", article.id);

        if (updateError) {
          console.error(`Update error for ${article.id}:`, updateError);
          results.push({ id: article.id, status: "error", error: updateError.message });
        } else {
          results.push({ id: article.id, status: "success", wordCount });
        }

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Error processing ${article.id}:`, e);
        results.push({ id: article.id, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("blog-content-generator error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
