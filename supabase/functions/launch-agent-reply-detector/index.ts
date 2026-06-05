/**
 * launch-agent-reply-detector — scans inbound SMS messages, classifies via Lovable AI.
 * DELIVERED/MESSAGED → REPLIED (with classification).
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const CLASSES = ["INTERESTED", "CURIOUS", "NOT_NOW", "REMOVE", "BOOK_CALL"] as const;
type Classification = typeof CLASSES[number];

function classifyHeuristic(text: string): Classification {
  const t = text.toLowerCase();
  if (/\b(stop|arret|remove|retire|d[ée]sabonn)/.test(t)) return "REMOVE";
  if (/\b(appel|call|rendez.?vous|book|demo|d[ée]mo|parler)/.test(t)) return "BOOK_CALL";
  if (/\b(int[ée]ress[ée]|oui|j'aimerais|combien|plus d'info)/.test(t)) return "INTERESTED";
  if (/\b(pas maintenant|plus tard|peut-?[ée]tre|trop occup)/.test(t)) return "NOT_NOW";
  return "CURIOUS";
}

async function classifyAi(text: string): Promise<Classification> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return classifyHeuristic(text);
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Classify a contractor's SMS reply to a cold outreach into exactly ONE label: INTERESTED, CURIOUS, NOT_NOW, REMOVE, BOOK_CALL. Reply with just the label.` },
          { role: "user", content: text },
        ],
        max_completion_tokens: 8,
      }),
    });
    const data = await r.json();
    const label = String(data?.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
    if (CLASSES.includes(label as Classification)) return label as Classification;
  } catch (_) { /* fall through */ }
  return classifyHeuristic(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Pull inbound messages from sms_inbound or evenements_sms (project uses both)
  const { data: inbound } = await sb
    .from("evenements_sms")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  let classified = 0, matched = 0;
  for (const msg of inbound ?? []) {
    const fromPhone = (msg as any).from_number ?? (msg as any).phone ?? (msg as any).from;
    const text = (msg as any).body ?? (msg as any).message ?? (msg as any).text ?? "";
    if (!fromPhone || !text) continue;

    const { data: lead } = await sb
      .from("launch_leads")
      .select("*")
      .eq("phone", fromPhone)
      .in("lead_status", ["MESSAGED", "DELIVERED"])
      .maybeSingle();
    if (!lead) continue;

    const cls = await classifyAi(text);
    classified++;
    matched++;
    try {
      await transitionLead((lead as any).id, "REPLIED", {
        reply_classification: cls,
        payload: {
          ...((lead as any).payload ?? {}),
          reply: { text, classification: cls, received_at: new Date().toISOString() },
        },
      }, "launch-agent-reply-detector");
    } catch (e) {
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-reply-detector",
        event: "transition_failed", success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.reply.run",
    outcome: matched > 0 ? "achieved" : "partial",
    payload: { classified, matched, scanned: inbound?.length ?? 0 },
  });

  return new Response(JSON.stringify({ ok: true, classified, matched }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
