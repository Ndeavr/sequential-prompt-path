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

const DISTRIBUTION: Record<string, number> = {
  article: 0, linkedin: 0, x_thread: 1, facebook_homeowner: 1,
  facebook_contractor: 1, reddit: 2, short_video_script: 3,
  long_video_script: 3, email_newsletter: 4, press_release: 5,
  backlink_pitch: 5, faq_snippets: 0,
};

const MIN_LENGTHS: Record<string, number> = {
  article: 800, linkedin: 150, x_thread: 100, facebook_homeowner: 100,
  facebook_contractor: 100, reddit: 200, short_video_script: 80,
  long_video_script: 150, email_newsletter: 200, press_release: 300,
  backlink_pitch: 100, faq_snippets: 200,
};

const CHANNEL_INSTRUCTIONS: Record<string, string> = {
  article: "Article long format SEO-optimisé (800+ mots). Structuré avec sous-titres H2/H3, introduction accrocheuse, conclusion avec CTA.",
  linkedin: "Post LinkedIn fondateur (150+ mots). Storytelling personnel, insights marché, ton professionnel mais humain.",
  x_thread: "Thread X/Twitter de 5-8 tweets (100+ mots total). Punchy, chiffres, hooks visuels.",
  facebook_homeowner: "Post Facebook pour propriétaires (100+ mots). Ton empathique, conseil pratique, question d'engagement.",
  facebook_contractor: "Post Facebook pour entrepreneurs (100+ mots). Ton business, opportunité, données marché.",
  reddit: "Post éducatif Reddit (200+ mots). Pas promotionnel, valeur pure, ton communautaire, mention subtile.",
  short_video_script: "Script vidéo 30 secondes (80+ mots). Hook visuel, problème-solution rapide, CTA verbal.",
  long_video_script: "Script vidéo 60 secondes (150+ mots). Narration engageante, exemples concrets, CTA clair.",
  email_newsletter: "Newsletter email (200+ mots). Sujet accrocheur, preview text, contenu scannable, CTA bouton.",
  press_release: "Angle communiqué de presse (300+ mots). Factuel, données, citations, angle médiatique.",
  backlink_pitch: "Pitch outreach pour backlinks (100+ mots). Personnalisé, valeur pour le site cible, proposition concrète.",
  faq_snippets: "5 questions-réponses FAQ (200+ mots total). Questions que les gens posent vraiment, réponses claires.",
};

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${t}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

const SYSTEM_PROMPT = `Tu es un expert en marketing de contenu et relations publiques pour UNPRO, la plateforme québécoise de services résidentiels propulsée par l'IA.

Règles:
- Contenu toujours utile, jamais spam
- Hooks accrocheurs
- Statistiques claires et réalistes
- Conseils pratiques
- Mentions subtiles d'UNPRO (2-3 par asset)
- Ton expert mais accessible
- Français québécois naturel
- Chaque asset doit inclure un CTA vers unpro.ca ou Ask Alex
- Adapter le format au canal`;

// Generate a SINGLE channel asset for a topic
async function generateSingleAsset(
  supabase: ReturnType<typeof createClient>,
  topicId: string,
  channel: string
) {
  const { data: topic, error: topicErr } = await supabase
    .from("pr_topics")
    .select("*")
    .eq("id", topicId)
    .single();

  if (topicErr || !topic) throw new Error(`Topic not found: ${topicId}`);

  // Check if already generated
  const { data: existing } = await supabase
    .from("pr_assets")
    .select("id")
    .eq("topic_id", topicId)
    .eq("channel", channel)
    .maybeSingle();

  if (existing) return { channel, status: "already_exists", id: existing.id };

  const instruction = CHANNEL_INSTRUCTIONS[channel] || channel;
  const prompt = `Génère UN asset de contenu pour le canal "${channel}".

SUJET: "${topic.title}"
CATÉGORIE: ${topic.category}

INSTRUCTIONS: ${instruction}

Retourne UNIQUEMENT un JSON valide:
{
  "hook": "phrase d'accroche courte",
  "content_text": "contenu complet ici",
  "cta": "appel à l'action",
  "brand_mentions": 2
}`;

  const raw = await callAI(prompt, SYSTEM_PROMPT);

  let asset: any;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    asset = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Failed to parse AI response for ${channel}: ${e}`);
  }

  const minLen = MIN_LENGTHS[channel] || 80;
  if ((asset.content_text || "").length < minLen) {
    throw new Error(`Content too short for ${channel}: ${(asset.content_text || "").length} < ${minLen}`);
  }

  const today = new Date();
  const dayOffset = DISTRIBUTION[channel] ?? 0;

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
      scheduled_date: addDays(today, dayOffset),
    })
    .select()
    .single();

  if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);

  return { channel, status: "generated", id: row?.id };
}

// Generate all assets by processing them in small batches of 3
async function generateAllAssets(
  supabase: ReturnType<typeof createClient>,
  topicId: string
) {
  const { data: topic } = await supabase
    .from("pr_topics")
    .select("*")
    .eq("id", topicId)
    .single();

  if (!topic) throw new Error(`Topic not found: ${topicId}`);

  await supabase.from("pr_topics").update({ status: "active" }).eq("id", topicId);

  // Process channels in batches of 3 to avoid timeout
  const results: any[] = [];
  const batches = [];
  for (let i = 0; i < CHANNELS.length; i += 3) {
    batches.push(CHANNELS.slice(i, i + 3));
  }

  for (const batch of batches) {
    const batchResults = await Promise.allSettled(
      batch.map((ch) => generateSingleAsset(supabase, topicId, ch))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({ channel: "unknown", status: "failed", error: r.reason?.message });
      }
    }
  }

  const generated = results.filter((r) => r.status === "generated").length;
  const existing = results.filter((r) => r.status === "already_exists").length;

  if (generated + existing >= 8) {
    await supabase.from("pr_topics").update({ status: "completed" }).eq("id", topicId);
  }

  return { topic: topic.title, assets_generated: generated, already_existed: existing, total: results.length, details: results };
}

// Generate ONE topic's assets but return 202 immediately, process in background
async function generateAllAssetsAsync(
  supabase: ReturnType<typeof createClient>,
  topicId: string
) {
  const { data: topic } = await supabase
    .from("pr_topics")
    .select("id, title")
    .eq("id", topicId)
    .single();

  if (!topic) throw new Error(`Topic not found: ${topicId}`);

  await supabase.from("pr_topics").update({ status: "active" }).eq("id", topicId);

  // Fire and forget via EdgeRuntime.waitUntil
  const bgWork = (async () => {
    try {
      for (const channel of CHANNELS) {
        try {
          await generateSingleAsset(supabase, topicId, channel);
          console.log(`✅ Generated ${channel} for topic ${topicId}`);
        } catch (e) {
          console.error(`❌ Failed ${channel} for topic ${topicId}:`, e);
        }
      }
      // Check completion
      const { count } = await supabase
        .from("pr_assets")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topicId);

      if ((count || 0) >= 8) {
        await supabase.from("pr_topics").update({ status: "completed" }).eq("id", topicId);
      }
    } catch (e) {
      console.error("Background generation failed:", e);
      await supabase.from("pr_topics").update({ status: "draft" }).eq("id", topicId);
    }
  })();

  // @ts-ignore - EdgeRuntime available in Supabase edge
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(bgWork);
  }

  return { message: "Generation started in background", topic: topic.title, topic_id: topicId };
}

async function generateTopicBatch(supabase: ReturnType<typeof createClient>) {
  const { data: topics } = await supabase
    .from("pr_topics")
    .select("id, title")
    .eq("status", "draft")
    .order("priority_score", { ascending: false })
    .order("week_number", { ascending: true })
    .limit(1);

  if (!topics || topics.length === 0)
    return { message: "No draft topics to process" };

  // Process just 1 topic per cron run to stay within limits
  const t = topics[0];
  try {
    // Use sequential single-asset generation
    const results: any[] = [];
    await supabase.from("pr_topics").update({ status: "active" }).eq("id", t.id);
    
    for (const channel of CHANNELS) {
      try {
        const r = await generateSingleAsset(supabase, t.id, channel);
        results.push(r);
        console.log(`✅ Batch: ${channel} for ${t.title}`);
      } catch (e) {
        console.error(`❌ Batch: ${channel} failed:`, e);
        results.push({ channel, status: "failed", error: String(e) });
      }
    }

    const generated = results.filter((r) => r.status === "generated").length;
    if (generated >= 8) {
      await supabase.from("pr_topics").update({ status: "completed" }).eq("id", t.id);
    }

    return { topic: t.title, generated, results };
  } catch (e) {
    return { topic: t.title, error: String(e) };
  }
}

async function getStats(supabase: ReturnType<typeof createClient>) {
  const { data: topics } = await supabase.from("pr_topics").select("status");
  const { data: assets } = await supabase
    .from("pr_assets")
    .select("channel, status, mentions_gained, backlinks_gained, engagement_clicks, engagement_shares");

  const topicCounts: Record<string, number> = {};
  for (const t of topics || []) {
    topicCounts[t.status] = (topicCounts[t.status] || 0) + 1;
  }

  const channelCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  let totalMentions = 0, totalBacklinks = 0, totalClicks = 0, totalShares = 0;

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

// Get progress for a topic
async function getTopicProgress(supabase: ReturnType<typeof createClient>, topicId: string) {
  const { data: assets } = await supabase
    .from("pr_assets")
    .select("channel, status")
    .eq("topic_id", topicId);

  const generated = (assets || []).map(a => a.channel);
  const missing = CHANNELS.filter(ch => !generated.includes(ch));

  return { topic_id: topicId, generated: generated.length, total: CHANNELS.length, missing, channels: assets };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, topic_id, channel } = await req.json();

    let result: any;
    let status = 200;

    switch (action) {
      case "generate_single_asset":
        if (!topic_id || !channel) throw new Error("topic_id and channel required");
        result = await generateSingleAsset(supabase, topic_id, channel);
        break;

      case "generate_all_assets":
        if (!topic_id) throw new Error("topic_id required");
        result = await generateAllAssetsAsync(supabase, topic_id);
        status = 202;
        break;

      case "generate_topic_batch":
        result = await generateTopicBatch(supabase);
        break;

      case "topic_progress":
        if (!topic_id) throw new Error("topic_id required");
        result = await getTopicProgress(supabase, topic_id);
        break;

      case "stats":
        result = await getStats(supabase);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pr-loop-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
