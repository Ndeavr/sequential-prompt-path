// UNPRO — Content Image Generate
// Generates a category-compliant image and stores it in content_image_library
// (status starts pending → validation function decides approved/rejected).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { category_slug, article_id, extra_prompt } = await req.json();
    if (!category_slug) return json({ error: "category_slug required" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: cat } = await sb.from("content_image_categories").select("id, slug").eq("slug", category_slug).maybeSingle();
    if (!cat) return json({ error: "unknown category" }, 404);

    const { data: rule } = await sb.from("content_image_rules").select("*").eq("category_id", cat.id).maybeSingle();
    if (!rule) return json({ error: "no rule" }, 404);

    const prompt = `${rule.style_prompt}${extra_prompt ? ` ${extra_prompt}` : ""}. AVOID: ${rule.negative_prompt}.`;

    const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });

    if (!imgRes.ok) {
      const t = await imgRes.text();
      return json({ error: "image_gen_failed", detail: t }, 502);
    }

    const imgJson = await imgRes.json();
    const b64 = imgJson?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "no_image_returned" }, 502);

    // Upload to storage
    const bucket = "content-images";
    await sb.storage.createBucket(bucket, { public: true }).catch(() => {});
    const path = `${category_slug}/${crypto.randomUUID()}.png`;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { error: upErr } = await sb.storage.from(bucket).upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upErr) return json({ error: "upload_failed", detail: upErr.message }, 500);

    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
    const url = pub.publicUrl;

    const { data: lib, error: libErr } = await sb.from("content_image_library").insert({
      category_id: cat.id,
      url,
      storage_path: path,
      source: "generated",
      status: "pending",
      prompt_used: prompt,
      model_used: "openai/gpt-image-2",
    }).select().single();
    if (libErr) return json({ error: "library_insert_failed", detail: libErr.message }, 500);

    // Validate
    const valRes = await fetch(`${SUPABASE_URL}/functions/v1/content-image-validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ image_url: url, category_slug, image_id: lib.id }),
    });
    const val = await valRes.json();

    // Assign to article if approved
    if (article_id && val.verdict === "approved") {
      await sb.from("content_article_images").upsert({
        article_id,
        category_id: cat.id,
        image_id: lib.id,
        status: "approved",
        last_audited_at: new Date().toISOString(),
      }, { onConflict: "article_id" });
    }

    return json({ image_id: lib.id, url, validation: val });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
