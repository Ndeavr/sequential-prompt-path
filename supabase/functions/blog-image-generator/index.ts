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

    // Get articles missing featured image
    const { data: articles, error } = await supabase
      .from("blog_articles")
      .select("id, title, category, city, slug")
      .eq("status", "published")
      .is("featured_image_url", null)
      .limit(3);

    if (error) throw error;
    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ message: "No articles need images", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const article of articles) {
      try {
        const imagePrompt = `Professional, high-quality photograph for a home services blog article. Topic: "${article.title}". Category: ${article.category || "home services"}. Location context: ${article.city || "Quebec"}, Canada. Style: clean, modern, realistic editorial photography. No text overlay. Bright natural lighting. 16:9 landscape format.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI image error for ${article.id}:`, aiResponse.status, errText);
          results.push({ id: article.id, status: "error", error: `AI ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl || !imageUrl.startsWith("data:image")) {
          results.push({ id: article.id, status: "error", error: "No image in AI response" });
          continue;
        }

        // Decode base64
        const base64Data = imageUrl.split(",")[1];
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const filePath = `blog/${article.slug}-hero.png`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("blog-images")
          .upload(filePath, binaryData, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${article.id}:`, uploadError);
          results.push({ id: article.id, status: "error", error: uploadError.message });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(filePath);

        // Update article
        const { error: updateError } = await supabase
          .from("blog_articles")
          .update({
            featured_image_url: urlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", article.id);

        if (updateError) {
          results.push({ id: article.id, status: "error", error: updateError.message });
        } else {
          results.push({ id: article.id, status: "success", url: urlData.publicUrl });
        }

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 3000));
      } catch (e) {
        console.error(`Error processing ${article.id}:`, e);
        results.push({ id: article.id, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("blog-image-generator error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
