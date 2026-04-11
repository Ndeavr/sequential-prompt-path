import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_PROMPT = `Tu es un extracteur de données d'entreprise québécoise.
Analyse le contenu suivant et extrais les informations d'un entrepreneur/entreprise en construction ou rénovation.

Retourne UNIQUEMENT un JSON valide avec ces champs (null si non trouvé) :
{
  "company_name": "string",
  "contact_name": "string", 
  "phone": "string (format: 514-XXX-XXXX)",
  "email": "string",
  "website": "string",
  "address": "string",
  "city": "string",
  "province": "string",
  "category": "string (ex: toiture, plomberie, isolation, etc.)",
  "services": ["liste de services détectés"],
  "rbq_license": "string",
  "neq_number": "string",
  "description": "string (courte description)",
  "review_count": number,
  "average_rating": number,
  "confidence": number (0-100, confiance dans l'extraction)
}

Si ce n'est PAS une entreprise de services résidentiels/construction, retourne: {"skip": true, "reason": "..."}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { url, title, markdown, job_id, query_id } = await req.json();
    if (!url || !markdown) {
      return new Response(JSON.stringify({ error: "url, markdown required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Extracting business data from: ${url}`);

    // Call Gemini directly
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!geminiKey) {
      console.error("GEMINI_API_KEY not available, using basic extraction");
      return await basicExtraction(supabase, { url, title, markdown, job_id, query_id });
    }

    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${GEMINI_PROMPT}\n\nURL: ${url}\nTitre: ${title}\n\nContenu:\n${markdown}`,
            }],
          }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("Gemini API error:", errText);
      return await basicExtraction(supabase, { url, title, markdown, job_id, query_id });
    }

    const aiData = await aiResp.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Parse JSON from response
    let extracted: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 200));
      return new Response(JSON.stringify({ success: false, reason: "parse_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!extracted || extracted.skip) {
      console.log(`Skipped: ${extracted?.reason || "not a business"}`);
      return new Response(JSON.stringify({ success: false, reason: extracted?.reason || "not_business" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!extracted.company_name && !extracted.phone) {
      return new Response(JSON.stringify({ success: false, reason: "insufficient_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplication check
    const isDuplicate = await checkDuplicate(supabase, extracted);
    if (isDuplicate) {
      console.log(`Duplicate detected: ${extracted.company_name}`);
      return new Response(JSON.stringify({ success: false, reason: "duplicate", company: extracted.company_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create contractor_lead
    const { data: lead, error: leadErr } = await supabase
      .from("contractor_leads")
      .insert({
        company_name: extracted.company_name,
        contact_name: extracted.contact_name,
        phone: extracted.phone,
        email: extracted.email,
        website_url: extracted.website || url,
        city: extracted.city,
        category: extracted.category,
        status: "new",
        source_type: "prospection_engine",
        source_job_id: job_id,
        source_query_id: query_id,
        notes: extracted.description,
      })
      .select()
      .single();

    if (leadErr) {
      console.error("Lead insert error:", leadErr);
      throw leadErr;
    }

    // Create dedup index
    const fingerprint = generateFingerprint(extracted);
    await supabase.from("lead_deduplication_index").insert({
      lead_id: lead.id,
      fingerprint_hash: fingerprint,
    });

    // Create source link
    await supabase.from("lead_source_links").insert({
      lead_id: lead.id,
      source_type: "firecrawl_search",
      source_url: url,
    });

    // Create enrichment data
    await supabase.from("lead_enrichment_data").insert({
      lead_id: lead.id,
      services_detected_json: extracted.services || [],
      review_analysis_json: {
        count: extracted.review_count,
        average: extracted.average_rating,
      },
      data_confidence_score: (extracted.confidence || 50) / 100,
    });

    // Calculate priority score
    const priority = calculatePriority(extracted);
    await supabase.from("lead_priority_scores").insert({
      lead_id: lead.id,
      priority_score: priority.score,
      priority_level: priority.level,
      scoring_breakdown_json: priority.breakdown,
    });

    // Update lead with priority
    await supabase
      .from("contractor_leads")
      .update({ priority_score: priority.score, priority_level: priority.level })
      .eq("id", lead.id);

    // Increment job counter
    await supabase.rpc("increment_prospection_leads_count", { p_job_id: job_id }).catch(() => {
      // RPC may not exist yet, update directly
      supabase
        .from("prospection_jobs")
        .update({ leads_generated_count: supabase.rpc ? undefined : 1 })
        .eq("id", job_id);
    });

    console.log(`Lead created: ${extracted.company_name} (${priority.level})`);

    return new Response(JSON.stringify({
      success: true,
      lead_id: lead.id,
      company: extracted.company_name,
      priority: priority.level,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fn-extract-business-data error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helpers ───

async function checkDuplicate(supabase: any, data: any): Promise<boolean> {
  const fingerprint = generateFingerprint(data);
  const { data: existing } = await supabase
    .from("lead_deduplication_index")
    .select("id")
    .eq("fingerprint_hash", fingerprint)
    .limit(1);
  return (existing?.length || 0) > 0;
}

function generateFingerprint(data: any): string {
  const parts = [
    data.phone?.replace(/\D/g, ""),
    data.company_name?.toLowerCase().trim(),
    data.city?.toLowerCase().trim(),
  ].filter(Boolean);
  // Simple hash
  let hash = 0;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function calculatePriority(data: any): { score: number; level: string; breakdown: any } {
  let score = 0;
  const breakdown: any = {};

  // Phone presence (+20)
  if (data.phone) { score += 20; breakdown.phone = 20; }
  // Email presence (+15)
  if (data.email) { score += 15; breakdown.email = 15; }
  // Website (+15)
  if (data.website) { score += 15; breakdown.website = 15; }
  // Reviews (+20 max)
  if (data.review_count > 10) { score += 20; breakdown.reviews = 20; }
  else if (data.review_count > 0) { score += 10; breakdown.reviews = 10; }
  // Rating (+10)
  if (data.average_rating >= 4.0) { score += 10; breakdown.rating = 10; }
  // RBQ (+10)
  if (data.rbq_license) { score += 10; breakdown.rbq = 10; }
  // Services count (+10)
  if (data.services?.length > 2) { score += 10; breakdown.services = 10; }
  // Confidence bonus
  if (data.confidence > 80) { score += 5; breakdown.confidence_bonus = 5; }

  const level = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

  return { score, level, breakdown };
}

async function basicExtraction(supabase: any, params: any) {
  // Fallback extraction using regex
  const { url, title, markdown, job_id, query_id } = params;
  
  const phoneMatch = markdown?.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
  const emailMatch = markdown?.match(/[\w.-]+@[\w.-]+\.\w+/);

  if (!phoneMatch && !emailMatch) {
    return new Response(JSON.stringify({ success: false, reason: "no_contact_info" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: lead } = await supabase
    .from("contractor_leads")
    .insert({
      company_name: title || url,
      phone: phoneMatch?.[0],
      email: emailMatch?.[0],
      website_url: url,
      status: "new",
      source_type: "prospection_engine",
      source_job_id: job_id,
      source_query_id: query_id,
      priority_level: "LOW",
    })
    .select()
    .single();

  return new Response(JSON.stringify({ success: true, lead_id: lead?.id, method: "basic" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
