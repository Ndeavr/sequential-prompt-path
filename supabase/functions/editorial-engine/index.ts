/**
 * UNPRO — Editorial Engine Edge Function
 * Handles article generation, rewriting, FAQ/schema, internal links, publishing.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function aiCall(systemPrompt: string, userPrompt: string, tools?: any[], toolChoice?: any) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (tools) { body.tools = tools; body.tool_choice = toolChoice; }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    throw new Error(`AI error ${status}: ${status === 429 ? "Rate limited" : status === 402 ? "Payment required" : await res.text()}`);
  }
  return res.json();
}

function extractToolArgs(aiData: any): any {
  const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) throw new Error("No tool call in AI response");
  return JSON.parse(tc.function.arguments);
}

function extractContent(aiData: any): string {
  return aiData.choices?.[0]?.message?.content || "";
}

// ===== ACTION: generate_article_from_topic =====
async function generateArticleFromTopic(topicId: string) {
  const sb = supabaseAdmin();
  const startedAt = new Date().toISOString();

  const { data: topic, error: topicErr } = await sb.from("topic_backlog").select("*").eq("id", topicId).single();
  if (topicErr || !topic) throw new Error("Topic not found: " + topicErr?.message);

  // Create generation run
  const { data: run } = await sb.from("content_generation_runs").insert({
    run_type: "article_generation",
    status: "running",
    topic_id: topicId,
    started_at: startedAt,
    input_json: topic,
  }).select("id").single();

  try {
    // Mark topic in progress
    await sb.from("topic_backlog").update({ status: "in_progress" }).eq("id", topicId);

    const cityContext = topic.city ? `La ville ciblée est ${topic.city}, Québec.` : "Le contenu est générique pour tout le Québec.";
    const audienceLabel = topic.audience_type === "entrepreneur" ? "entrepreneurs en construction/rénovation" : "propriétaires résidentiels québécois";

    const aiData = await aiCall(
      `Tu es un rédacteur SEO expert pour UNPRO, plateforme d'intelligence immobilière au Québec. Génère un article complet en français québécois, professionnel mais accessible. ${cityContext} L'audience cible : ${audienceLabel}. L'article doit faire entre 1500 et 2500 mots, inclure des données concrètes (coûts en CAD, délais, normes québécoises). Catégorie : ${topic.category}. Angle : ${topic.angle || "informatif"}.`,
      `Sujet : "${topic.title_suggestion}"\n\nGénère l'article complet avec toutes les métadonnées SEO.`,
      [{
        type: "function",
        function: {
          name: "create_article",
          description: "Create a complete blog article with SEO metadata",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Titre accrocheur (max 65 chars)" },
              subtitle: { type: "string", description: "Sous-titre complémentaire" },
              slug: { type: "string", description: "URL slug en français" },
              seo_title: { type: "string", description: "SEO title (max 60 chars)" },
              meta_description: { type: "string", description: "Meta description (max 160 chars)" },
              content_markdown: { type: "string", description: "Article complet en Markdown, 1500-2500 mots" },
              tags: { type: "array", items: { type: "string" }, description: "5-8 tags pertinents" },
              cta_variant: { type: "string", description: "Type de CTA: 'verify_contractor', 'get_quote', 'signup_owner', 'signup_contractor', 'home_score'" },
            },
            required: ["title", "subtitle", "slug", "seo_title", "meta_description", "content_markdown", "tags", "cta_variant"],
          },
        },
      }],
      { type: "function", function: { name: "create_article" } }
    );

    const article = extractToolArgs(aiData);
    const wordCount = article.content_markdown.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 250);

    // Simple markdown to HTML
    const contentHtml = article.content_markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>');

    const { data: newArticle, error: insertErr } = await sb.from("blog_articles").insert({
      title: article.title,
      subtitle: article.subtitle,
      slug: article.slug,
      content_markdown: article.content_markdown,
      content_html: contentHtml,
      audience_type: topic.audience_type,
      is_gated: topic.audience_type === "entrepreneur",
      city: topic.city,
      category: topic.category,
      tags: article.tags,
      seo_title: article.seo_title,
      meta_description: article.meta_description,
      word_count: wordCount,
      reading_time_minutes: readingTime,
      cta_variant: article.cta_variant,
      generation_run_id: run?.id,
      status: "review",
    }).select("id").single();

    if (insertErr) throw new Error("Insert error: " + insertErr.message);

    // Mark topic completed
    await sb.from("topic_backlog").update({ status: "completed" }).eq("id", topicId);

    // Update run
    await sb.from("content_generation_runs").update({
      status: "completed",
      article_id: newArticle.id,
      output_json: { word_count: wordCount, slug: article.slug },
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
    }).eq("id", run?.id);

    return { articleId: newArticle.id, slug: article.slug, wordCount };
  } catch (e) {
    await sb.from("content_generation_runs").update({
      status: "failed",
      error_message: e instanceof Error ? e.message : "Unknown",
      completed_at: new Date().toISOString(),
    }).eq("id", run?.id);
    throw e;
  }
}

// ===== ACTION: rewrite_article_magnetic =====
async function rewriteArticleMagnetic(articleId: string) {
  const sb = supabaseAdmin();
  const { data: article } = await sb.from("blog_articles").select("*").eq("id", articleId).single();
  if (!article) throw new Error("Article not found");

  const aiData = await aiCall(
    `Tu es un copywriter magnétique pour UNPRO. Réécris cet article pour le rendre irrésistible : titres percutants, hooks émotionnels, données concrètes, ton conversationnel mais expert. Garde la structure et les faits, mais amplifie l'impact. Français québécois.`,
    `Titre actuel : "${article.title}"\nSous-titre : "${article.subtitle}"\n\nContenu actuel :\n${article.content_markdown}`,
    [{
      type: "function",
      function: {
        name: "rewrite_result",
        description: "Rewritten magnetic article",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            content_markdown: { type: "string" },
          },
          required: ["title", "subtitle", "content_markdown"],
        },
      },
    }],
    { type: "function", function: { name: "rewrite_result" } }
  );

  const rewrite = extractToolArgs(aiData);
  const wordCount = rewrite.content_markdown.split(/\s+/).length;

  await sb.from("blog_articles").update({
    title: rewrite.title,
    subtitle: rewrite.subtitle,
    content_markdown: rewrite.content_markdown,
    word_count: wordCount,
    reading_time_minutes: Math.ceil(wordCount / 250),
  }).eq("id", articleId);

  return { articleId, wordCount };
}

// ===== ACTION: generate_faq_and_schema =====
async function generateFaqAndSchema(articleId: string) {
  const sb = supabaseAdmin();
  const { data: article } = await sb.from("blog_articles").select("*").eq("id", articleId).single();
  if (!article) throw new Error("Article not found");

  const aiData = await aiCall(
    `Tu es un expert SEO pour UNPRO au Québec. Génère des FAQ pertinentes et un JSON-LD valide pour cet article. Les FAQ doivent être naturelles, utiles et cibler des requêtes vocales/IA.`,
    `Titre : "${article.title}"\nCatégorie : ${article.category}\nVille : ${article.city || "Québec général"}\nAudience : ${article.audience_type}\n\nContenu :\n${article.content_markdown?.substring(0, 3000)}`,
    [{
      type: "function",
      function: {
        name: "faq_schema_result",
        description: "FAQ questions and JSON-LD schema",
        parameters: {
          type: "object",
          properties: {
            faq: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
                required: ["question", "answer"],
              },
              description: "5 to 10 FAQ questions",
            },
            schema_json: {
              type: "object",
              description: "Complete JSON-LD with @context, @type Article, FAQPage, and optionally LocalBusiness",
            },
          },
          required: ["faq", "schema_json"],
        },
      },
    }],
    { type: "function", function: { name: "faq_schema_result" } }
  );

  const result = extractToolArgs(aiData);

  await sb.from("blog_articles").update({
    faq_json: result.faq,
    schema_json: result.schema_json,
  }).eq("id", articleId);

  return { articleId, faqCount: result.faq.length };
}

// ===== ACTION: generate_internal_links =====
async function generateInternalLinks(articleId: string) {
  const sb = supabaseAdmin();
  const { data: article } = await sb.from("blog_articles").select("id, title, category, city, audience_type, tags").eq("id", articleId).single();
  if (!article) throw new Error("Article not found");

  // Get existing published articles for linking
  const { data: candidates } = await sb.from("blog_articles")
    .select("id, title, slug, category, city, audience_type")
    .eq("status", "published")
    .neq("id", articleId)
    .limit(50);

  // Get SEO pages for city links
  const { data: seoPages } = await sb.from("seo_pages")
    .select("id, title, slug")
    .eq("is_published", true)
    .limit(20);

  const aiData = await aiCall(
    `Tu es un expert en maillage interne SEO pour UNPRO. Génère des liens internes intelligents pour cet article. Inclus obligatoirement : 3 articles reliés, 1 page ville si applicable, 1 page mission/inscription, 1 article miroir (public↔entrepreneur) si pertinent.`,
    `Article source : "${article.title}" (${article.category}, ${article.city || "général"}, audience: ${article.audience_type})\n\nArticles disponibles :\n${(candidates || []).map(c => `- "${c.title}" → /blog/${c.slug} (${c.category}, ${c.city || "général"})`).join("\n")}\n\nPages SEO :\n${(seoPages || []).map(p => `- "${p.title}" → /services/${p.slug}`).join("\n")}\n\nPages fixes : /a-propos, /inscription, /entrepreneurs, /verifier-entrepreneur`,
    [{
      type: "function",
      function: {
        name: "internal_links_result",
        description: "Internal linking structure",
        parameters: {
          type: "object",
          properties: {
            links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  target_url: { type: "string" },
                  target_type: { type: "string", enum: ["article", "city_page", "mission_page", "signup_page", "mirror_article", "seo_page"] },
                  anchor_text: { type: "string" },
                  relevance_score: { type: "number" },
                  target_article_id: { type: "string", description: "UUID if linking to an article" },
                },
                required: ["target_url", "target_type", "anchor_text", "relevance_score"],
              },
            },
          },
          required: ["links"],
        },
      },
    }],
    { type: "function", function: { name: "internal_links_result" } }
  );

  const result = extractToolArgs(aiData);

  // Insert links
  for (const link of result.links) {
    await sb.from("blog_internal_links").insert({
      source_article_id: articleId,
      target_article_id: link.target_article_id || null,
      target_url: link.target_url,
      target_type: link.target_type,
      anchor_text: link.anchor_text,
      relevance_score: link.relevance_score,
    });
  }

  // Also store in article JSON for quick access
  await sb.from("blog_articles").update({
    internal_linking_json: result.links,
  }).eq("id", articleId);

  return { articleId, linkCount: result.links.length };
}

// ===== ACTION: enqueue_article =====
async function enqueueArticle(articleId: string, scheduledFor: string) {
  const sb = supabaseAdmin();

  // Validate first
  const { data: validation } = await sb.rpc("validate_article_readiness", { _article_id: articleId });
  if (!validation?.valid) {
    return { success: false, errors: validation?.errors };
  }

  await sb.from("blog_articles").update({
    status: "scheduled",
    scheduled_at: scheduledFor,
  }).eq("id", articleId);

  // The trigger will auto-create the queue entry
  return { success: true, scheduledFor };
}

// ===== ACTION: publish_scheduled_articles =====
async function publishScheduledArticles() {
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: pending } = await sb.from("blog_publish_queue")
    .select("*, blog_articles(*)")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .lt("attempts", 3)
    .order("scheduled_for")
    .limit(10);

  if (!pending?.length) return { published: 0 };

  let published = 0;
  for (const item of pending) {
    await sb.from("blog_publish_queue").update({ status: "processing", attempts: item.attempts + 1 }).eq("id", item.id);

    try {
      // Final validation
      const { data: validation } = await sb.rpc("validate_article_readiness", { _article_id: item.article_id });
      if (!validation?.valid) {
        await sb.from("blog_publish_queue").update({ status: "failed", error_message: "Validation failed: " + JSON.stringify(validation?.errors) }).eq("id", item.id);
        continue;
      }

      const pubTime = new Date().toISOString();
      await sb.from("blog_articles").update({ status: "published", published_at: pubTime }).eq("id", item.article_id);
      await sb.from("blog_publish_queue").update({ status: "published", published_at: pubTime }).eq("id", item.id);

      // Create analytics entry
      await sb.from("blog_analytics").insert({ article_id: item.article_id });

      published++;
    } catch (e) {
      await sb.from("blog_publish_queue").update({
        status: "failed",
        error_message: e instanceof Error ? e.message : "Unknown error",
      }).eq("id", item.id);
    }
  }

  return { published, total: pending.length };
}

// ===== ACTION: get_article_with_gated_view =====
async function getArticleWithGatedView(slug: string, userId: string | null, userRole: string | null) {
  const sb = supabaseAdmin();

  const { data: article } = await sb.from("blog_articles")
    .select("*, blog_article_images(*), blog_internal_links(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!article) return null;

  const isAdmin = userRole === "admin";
  const isContractor = userRole === "contractor" || userRole === "entrepreneur";
  const isGated = article.is_gated;
  const hasFullAccess = !isGated || isAdmin || (isGated && isContractor && userId);

  // Always return full HTML for SSR/SEO, but mark gating status
  return {
    ...article,
    gating: {
      is_gated: isGated,
      has_full_access: hasFullAccess,
      visible_percentage: hasFullAccess ? 100 : 50,
      show_overlay: !hasFullAccess,
    },
  };
}

// ===== ACTION: get_admin_editorial_dashboard =====
async function getAdminEditorialDashboard() {
  const sb = supabaseAdmin();

  const [articles, queue, backlog, analytics] = await Promise.all([
    sb.from("blog_articles").select("id, title, status, audience_type, city, category, scheduled_at, published_at, word_count, created_at").order("created_at", { ascending: false }).limit(50),
    sb.from("blog_publish_queue").select("*").in("status", ["pending", "processing"]).order("scheduled_for"),
    sb.from("topic_backlog").select("*").eq("status", "pending").order("priority", { ascending: false }).limit(30),
    sb.from("blog_analytics").select("*").order("date", { ascending: false }).limit(100),
  ]);

  const publishedCount = (articles.data || []).filter(a => a.status === "published").length;
  const scheduledCount = (articles.data || []).filter(a => a.status === "scheduled").length;
  const draftCount = (articles.data || []).filter(a => a.status === "draft" || a.status === "review").length;

  return {
    counts: { published: publishedCount, scheduled: scheduledCount, drafts: draftCount, backlog: backlog.data?.length || 0, queue: queue.data?.length || 0 },
    articles: articles.data || [],
    queue: queue.data || [],
    backlog: backlog.data || [],
    recentAnalytics: analytics.data || [],
  };
}

// ===== ACTION: run_full_pipeline =====
async function runFullPipeline(topicId: string, scheduledFor?: string) {
  const steps: string[] = [];
  
  // Step 1: Generate article
  const genResult = await generateArticleFromTopic(topicId);
  steps.push(`generated: ${genResult.slug} (${genResult.wordCount} words)`);
  const articleId = genResult.articleId;

  // Step 2: Magnetic rewrite
  try {
    const rewriteResult = await rewriteArticleMagnetic(articleId);
    steps.push(`rewritten: ${rewriteResult.wordCount} words`);
  } catch (e) { steps.push(`rewrite skipped: ${e}`); }

  // Step 3: FAQ + JSON-LD
  try {
    const faqResult = await generateFaqAndSchema(articleId);
    steps.push(`faq: ${faqResult.faqCount} questions`);
  } catch (e) { steps.push(`faq skipped: ${e}`); }

  // Step 4: Internal links
  try {
    const linkResult = await generateInternalLinks(articleId);
    steps.push(`links: ${linkResult.linkCount}`);
  } catch (e) { steps.push(`links skipped: ${e}`); }

  // Step 5: Add placeholder images (metadata)
  const sb = supabaseAdmin();
  const { data: article } = await sb.from("blog_articles").select("title, city, category").eq("id", articleId).single();
  if (article) {
    const imgAlts = [
      `entrepreneur ${article.category} ${article.city || "québec"} professionnel vérifié`,
      `rénovation ${article.category} ${article.city || "québec"} résidentielle`,
    ];
    for (const alt of imgAlts) {
      await sb.from("blog_article_images").insert({
        article_id: articleId,
        image_url: `https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800`,
        alt_text: alt,
        display_order: imgAlts.indexOf(alt),
      });
    }
    steps.push(`images: 2 placeholders`);
  }

  // Step 6: Update content_html with CTA injections
  const { data: fullArticle } = await sb.from("blog_articles").select("content_html, content_markdown").eq("id", articleId).single();
  if (fullArticle?.content_html) {
    const ctaBlock = `<div class="cta-block"><h3>Besoin d'un entrepreneur fiable?</h3><p>UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur.</p><a href="/alex" class="cta-primary">Obtenir mon rendez-vous</a> <a href="/comment-ca-marche" class="cta-secondary">Comment ça fonctionne</a></div>`;
    const paragraphs = fullArticle.content_html.split('</p>');
    if (paragraphs.length > 4) {
      paragraphs.splice(2, 0, `</p>${ctaBlock}`);
      paragraphs.splice(Math.floor(paragraphs.length / 2), 0, ctaBlock);
    }
    const htmlWithCta = paragraphs.join('</p>') + ctaBlock;
    await sb.from("blog_articles").update({ content_html: htmlWithCta }).eq("id", articleId);
    steps.push(`cta: injected`);
  }

  // Step 7: Enqueue if scheduled
  if (scheduledFor) {
    const enqResult = await enqueueArticle(articleId, scheduledFor);
    steps.push(`enqueue: ${enqResult.success ? 'ok' : JSON.stringify(enqResult.errors)}`);
  }

  return { articleId, steps };
}

// ===== ACTION: run_daily_batch =====
async function runDailyBatch() {
  const sb = supabaseAdmin();
  const publishTimes = ["08:30", "13:00", "19:30"];
  const results: any[] = [];

  // Get 3 pending topics
  const { data: topics } = await sb.from("topic_backlog")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at")
    .limit(3);

  if (!topics?.length) {
    return { generated: 0, message: "No topics in backlog" };
  }

  // Schedule each at different times tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  for (let i = 0; i < Math.min(topics.length, 3); i++) {
    const scheduledFor = `${dateStr}T${publishTimes[i]}:00.000Z`;
    try {
      const result = await runFullPipeline(topics[i].id, scheduledFor);
      results.push({ topicId: topics[i].id, ...result });
    } catch (e) {
      results.push({ topicId: topics[i].id, error: e instanceof Error ? e.message : "Unknown" });
    }
  }

  // Also publish any pending scheduled articles
  const publishResult = await publishScheduledArticles();

  return { generated: results.length, results, published: publishResult };
}

// ===== ACTION: generate_social_posts =====
async function generateSocialPosts(articleId: string) {
  const sb = supabaseAdmin();
  const { data: article } = await sb.from("blog_articles").select("title, subtitle, slug, category, city").eq("id", articleId).single();
  if (!article) throw new Error("Article not found");

  const aiData = await aiCall(
    `Tu es un community manager pour UNPRO, plateforme de jumelage intelligent entre propriétaires et entrepreneurs au Québec. Génère des posts sociaux accrocheurs en français.`,
    `Article : "${article.title}"\nSous-titre : "${article.subtitle}"\nURL : https://unpro.ca/blog/${article.slug}\n\nGénère un post Facebook, une caption Instagram et un post LinkedIn court.`,
    [{
      type: "function",
      function: {
        name: "social_posts",
        description: "Social media posts",
        parameters: {
          type: "object",
          properties: {
            facebook: { type: "string" },
            instagram: { type: "string" },
            linkedin: { type: "string" },
            video_script_30s: { type: "string", description: "30-second video script" },
          },
          required: ["facebook", "instagram", "linkedin", "video_script_30s"],
        },
      },
    }],
    { type: "function", function: { name: "social_posts" } }
  );

  return extractToolArgs(aiData);
}

// ===== ROUTER =====
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    let result: any;

    switch (action) {
      case "generate_article_from_topic":
        result = await generateArticleFromTopic(body.topic_id);
        break;
      case "rewrite_article_magnetic":
        result = await rewriteArticleMagnetic(body.article_id);
        break;
      case "generate_faq_and_schema":
        result = await generateFaqAndSchema(body.article_id);
        break;
      case "generate_internal_links":
        result = await generateInternalLinks(body.article_id);
        break;
      case "enqueue_article":
        result = await enqueueArticle(body.article_id, body.scheduled_for);
        break;
      case "publish_scheduled_articles":
        result = await publishScheduledArticles();
        break;
      case "get_article_with_gated_view":
        result = await getArticleWithGatedView(body.slug, body.user_id, body.user_role);
        break;
      case "get_admin_editorial_dashboard":
        result = await getAdminEditorialDashboard();
        break;
      case "run_full_pipeline":
        result = await runFullPipeline(body.topic_id, body.scheduled_for);
        break;
      case "run_daily_batch":
        result = await runDailyBatch();
        break;
      case "generate_social_posts":
        result = await generateSocialPosts(body.article_id);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("editorial-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
