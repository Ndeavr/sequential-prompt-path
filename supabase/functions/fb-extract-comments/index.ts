// Facebook comment extraction edge function
// Accepts: { campaign_id, text?, screenshots?: string[] (data URLs or public URLs) }
// Returns: { comments: ExtractedComment[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const QC_TRADES = [
  "construction", "rénovation", "renovation", "toiture", "couvreur", "isolation",
  "excavation", "plomberie", "plombier", "électricité", "electricien", "électricien",
  "designer", "finition", "ébéniste", "ebeniste", "peinture", "peintre", "menuiserie",
  "menuisier", "céramique", "ceramique", "drainage", "paysagement", "paysagiste",
  "asphalte", "pavé", "pave", "scellant", "déneigement", "deneigement", "entrepreneur",
];

const SUFFIXES = ["inc", "ltée", "ltee", "ltd", "enr", "senc", "construction", "rénovation"];

function normalizePhone(s: string): string {
  const d = s.replace(/[^\d]/g, "").replace(/^1(\d{10}$)/, "$1");
  if (d.length !== 10) return s.trim();
  return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
}

function parseFromText(raw: string) {
  const phoneMatch = raw.match(/(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/);
  const emailMatch = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
  const lower = raw.toLowerCase();
  const trade = QC_TRADES.find((t) => lower.includes(t)) || null;
  const availabilityHints = ["disponible", "soumission gratuite", "service rapide", "en privé", "contactez-moi", "écrivez-moi", "ecrivez-moi", "appelez"];
  const availability = availabilityHints.find((a) => lower.includes(a)) || null;

  // company guess: line containing a suffix
  let company: string | null = null;
  for (const line of raw.split(/\n+/)) {
    const lo = line.toLowerCase();
    if (SUFFIXES.some((s) => lo.includes(s))) {
      company = line.trim().slice(0, 120);
      break;
    }
  }

  return {
    raw_comment: raw.trim(),
    company_name: company,
    phone: phoneMatch ? normalizePhone(phoneMatch[0]) : null,
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    trade_category: trade,
    availability_text: availability,
    confidence_score: (phoneMatch ? 25 : 0) + (emailMatch ? 25 : 0) + (company ? 30 : 0) + (trade ? 20 : 0),
    extraction_source: "text_paste",
  };
}

async function ocrAndParseScreenshots(imageUrls: string[]) {
  const results: any[] = [];
  for (const url of imageUrls) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You extract Facebook comments from screenshots. Return ONLY a JSON array. Each item: {commenter_name, raw_comment, company_name, phone, email, city, trade_category, availability_text}. Use null when unknown. Quebec context.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract every visible comment from this Facebook screenshot." },
                { type: "image_url", image_url: { url } },
              ],
            },
          ],
        }),
      });
      const data = await resp.json();
      const txt: string = data?.choices?.[0]?.message?.content ?? "[]";
      const jsonText = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const arr = JSON.parse(jsonText);
      if (Array.isArray(arr)) {
        for (const c of arr) {
          const merged = { ...parseFromText(String(c.raw_comment ?? "")), ...c, extraction_source: "screenshot_ocr", screenshot_url: url };
          if (merged.phone) merged.phone = normalizePhone(String(merged.phone));
          if (merged.email) merged.email = String(merged.email).toLowerCase().trim();
          results.push(merged);
        }
      }
    } catch (e) {
      console.error("[fb-extract] OCR failed", e);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { campaign_id, text, screenshots } = body as { campaign_id: string; text?: string; screenshots?: string[] };

    const collected: any[] = [];
    if (text && text.trim()) {
      const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
      for (const b of blocks) collected.push(parseFromText(b));
    }
    if (screenshots?.length) {
      const ocr = await ocrAndParseScreenshots(screenshots);
      collected.push(...ocr);
    }

    const rows = collected.map((c) => ({ campaign_id, ...c, status: "extracted" }));
    let inserted: any[] = [];
    if (rows.length) {
      const { data, error } = await svc.from("facebook_extracted_comments").insert(rows).select();
      if (error) throw error;
      inserted = data ?? [];
    }

    return new Response(JSON.stringify({ comments: inserted, count: inserted.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[fb-extract]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
