import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const CHANNELS = [
  "article",
  "linkedin",
  "x_thread",
  "facebook_homeowner",
  "facebook_contractor",
  "reddit",
  "short_video_script",
  "long_video_script",
  "email_newsletter",
  "press_release",
  "backlink_pitch",
  "faq_snippets",
] as const;

// Distribution calendar: channel -> day offset from topic start
const DISTRIBUTION: Record<string, number> = {
  article: 0,
  linkedin: 0,
  x_thread: 1,
  facebook_homeowner: 1,
  facebook_contractor: 1,
  reddit: 2,
  short_video_script: 3,
  long_video_script: 3,
  email_newsletter: 4,
  press_release: 5,
  backlink_pitch: 5,
  faq_snippets: 0,
};

const MIN_LENGTHS: Record<string, number> = {
  article: 800,
  linkedin: 150,
  x_thread: 100,
  facebook_homeowner: 100,
  facebook_contractor: 100,
  reddit: 200,
  short_video_script: 80,
  long_video_script: 150,
  email_newsletter: 200,
  press_release: 300,
  backlink_pitch: 100,
  faq_snippets: 200,
};

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function generateAllAssets(
  supabase: ReturnType<typeof createClient>,
  topicId: string
) {
  // Get topic
  const { data: topic, error: topicErr } = await supabase
    .from("pr_topics")
    .select("*")
    .eq("id", topicId)
    .single();

  if (topicErr || !topic) throw new Error(`Topic not found: ${topicId}`);

  // Update status
  await supabase
    .from("pr_topics")
    .update({ status: "active" })
    .eq("id", topicId);

  const systemPrompt = `Tu es un expert en marketing de contenu et relations publiques pour UNPRO, la plateforme québécoise de services résidentiels propulsée par l'IA.

Règles:
- Contenu toujours utile, jamais spam
- Hooks accrocheurs
- Statistiques claires et réalistes
- Conseils pratiques
- Mentions subtiles d'UNPRO (2-3 par asset)
- Ton expert mais accessible
- Français québécois naturel
- Chaque asset doit inclure un CTA vers unpro.ca ou Ask Alex
- Adapter le format au canal (LinkedIn = professionnel, Reddit = éducatif, X = punchy)`;

  const prompt = `Génère 12 assets de contenu pour le sujet suivant:

SUJET: "${topic.title}"
CATÉGORIE: ${topic.category}

Pour CHAQUE canal ci-dessous, génère un JSON avec: hook, content_text, cta, brand_mentions (nombre)

Canaux:
1. article — Article long format (800+ mots), SEO-optimisé
2. linkedin — Post LinkedIn fondateur (150+ mots), storytelling
3. x_thread — Thread X/Twitter (5-8 tweets, 100+ mots total)
4. facebook_homeowner — Post Facebook pour propriétaires (100+ mots)
5. facebook_contractor — Post Facebook pour entrepreneurs (100+ mots)
6. reddit — Post éducatif Reddit (200+ mots), pas promotionnel
7. short_video_script — Script vidéo 30s (80+ mots)
8. long_video_script — Script vidéo 60s (150+ mots)
9. email_newsletter — Newsletter email (200+ mots)
10. press_release — Angle communiqué de presse (300+ mots)
11. backlink_pitch — Pitch outreach pour backlinks (100+ mots)
12. faq_snippets — 5 questions-réponses FAQ (200+ mots)

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{
  "assets": [
    {
      "channel": "article",
      "hook": "...",
      "content_text": "...",
      "cta": "...",
      "brand_mentions": 3
    },
    ...
  ]
}`;

  const raw = await callAI(prompt, systemPrompt);

  // Parse JSON from response
  let assets: any[];
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    assets = parsed.assets;
    if (!Array.isArray(assets)) throw new Error("assets not array");
  } catch (e) {
    await supabase
      .from("pr_topics")
      .update({ status: "draft" })
      .eq("id", topicId);
    throw new Error(`Failed to parse AI response: ${e}`);
  }

  const today = new Date();
  const inserted: any[] = [];

  for (const asset of assets) {
    const channel = asset.channel;
    if (!CHANNELS.includes(channel)) continue;

    const minLen = MIN_LENGTHS[channel] || 80;
    const contentLen = (asset.content_text || "").length;

    if (contentLen < minLen) {
      console.warn(
        `Skipping ${channel}: content too short (${contentLen} < ${minLen})`
      );
      continue;
    }

    const dayOffset = DISTRIBUTION[channel] ?? 0;
    const scheduledDate = addDays(today, dayOffset);

    const { data: row, error: insertErr } = await supabase
      .from("pr_assets")
      .insert({
        topic_id: topicId,
        channel,
        content_text: asset.content_text,
        hook: asset.hook,
        cta: asset.cta,
        brand_mentions: asset.brand_mentions || 0,
        status: "generated",
        scheduled_date: scheduledDate,
      })
      .select()
      .single();

    if (!insertErr && row) inserted.push(row);
  }

  // Mark completed if enough assets generated
  if (inserted.length >= 8) {
    await supabase
      .from("pr_topics")
      .update({ status: "completed" })
      .eq("id", topicId);
  }

  return { topic: topic.title, assets_generated: inserted.length };
}

async function generateTopicBatch(
  supabase: ReturnType<typeof createClient>
) {
  // Get next 3 draft topics by priority
  const { data: topics } = await supabase
    .from("pr_topics")
    .select("id, title")
    .eq("status", "draft")
    .order("priority_score", { ascending: false })
    .order("week_number", { ascending: true })
    .limit(3);

  if (!topics || topics.length === 0)
    return { message: "No draft topics to process" };

  const results = [];
  for (const t of topics) {
    try {
      const r = await generateAllAssets(supabase, t.id);
      results.push(r);
    } catch (e) {
      results.push({ topic: t.title, error: String(e) });
    }
  }

  return { processed: results.length, results };
}

async function getStats(supabase: ReturnType<typeof createClient>) {
  const { data: topics } = await supabase
    .from("pr_topics")
    .select("status");

  const { data: assets } = await supabase
    .from("pr_assets")
    .select("channel, status, mentions_gained, backlinks_gained, engagement_clicks, engagement_shares");

  const topicCounts: Record<string, number> = {};
  for (const t of topics || []) {
    topicCounts[t.status] = (topicCounts[t.status] || 0) + 1;
  }

  const channelCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  let totalMentions = 0;
  let totalBacklinks = 0;
  let totalClicks = 0;
  let totalShares = 0;

  for (const a of assets || []) {
    channelCounts[a.channel] = (channelCounts[a.channel] || 0) + 1;
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    totalMentions += a.mentions_gained || 0;
    totalBacklinks += a.backlinks_gained || 0;
    totalClicks += a.engagement_clicks || 0;
    totalShares += a.engagement_shares || 0;
  }

  return {
    topics: topicCounts,
    assets_by_channel: channelCounts,
    assets_by_status: statusCounts,
    total_mentions: totalMentions,
    total_backlinks: totalBacklinks,
    total_clicks: totalClicks,
    total_shares: totalShares,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, topic_id } = await req.json();

    let result: any;

    switch (action) {
      case "generate_all_assets":
        if (!topic_id) throw new Error("topic_id required");
        result = await generateAllAssets(supabase, topic_id);
        break;

      case "generate_topic_batch":
        result = await generateTopicBatch(supabase);
        break;

      case "stats":
        result = await getStats(supabase);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pr-loop-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
