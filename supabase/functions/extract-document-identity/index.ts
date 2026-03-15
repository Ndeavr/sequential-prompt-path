import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Extraction prompt — strict anti-hallucination ──
const EXTRACTION_PROMPT = `You are a document intelligence extractor for UnPRO, a contractor verification platform in Quebec, Canada.

TASK: Extract structured identity and financial fields from the uploaded document (quote, contract, estimate, invoice, or proposal).

CRITICAL RULES:
- ONLY extract information that is EXPLICITLY PRESENT in the document text or image
- If a field is not found, set value to null and confidence to "not_found"
- NEVER invent, guess, or infer missing information
- For each extracted field, include the exact source_snippet from the document
- Confidence levels: "high" (clear, unambiguous), "medium" (partially visible/cut off), "low" (uncertain/blurry)
- RBQ numbers in Quebec follow format: XXXX-XXXX-XX
- NEQ numbers follow format: XXXXXXXXXX (10 digits)
- All monetary values should be in CAD

Return a JSON object with this exact structure:
{
  "document_type": "quote|estimate|contract|invoice|proposal|work_agreement|scanned_document|unknown",
  "document_clarity": "clear|partial|poor",
  "business_name": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "legal_name": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "phone": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "email": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "website": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "rbq_number": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "neq": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "address": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "city": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "client_name": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "project_address": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "date": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "total_price": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "taxes": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "payment_terms": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "scope_of_work": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "warranties": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "exclusions": {"value": string|null, "confidence": string, "source_snippet": string|null},
  "signature_blocks": {"value": string|null, "confidence": string, "source_snippet": string|null}
}

ONLY return valid JSON. No explanation text.`;

// ── Mismatch detection ──
interface MismatchInput {
  field: string;
  docValue: string | null;
  profileValue: string | null;
  label_fr: string;
}

function detectMismatches(pairs: MismatchInput[]) {
  const mismatches: any[] = [];
  for (const { field, docValue, profileValue, label_fr } of pairs) {
    if (!docValue || !profileValue) continue;
    const dNorm = docValue.toLowerCase().replace(/[\s\-().]/g, "");
    const pNorm = profileValue.toLowerCase().replace(/[\s\-().]/g, "");
    if (dNorm !== pNorm && !dNorm.includes(pNorm) && !pNorm.includes(dNorm)) {
      mismatches.push({
        field,
        document_value: docValue,
        profile_value: profileValue,
        severity: field === "rbq_number" || field === "business_name" ? "concern" : "warning",
        message_fr: `Le champ « ${label_fr} » du document diffère du profil détecté.`,
      });
    }
  }
  return mismatches;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id ?? null;
    }

    const { file_base64, file_name, contractor_id, verification_run_id } = await req.json();
    if (!file_base64) {
      return new Response(JSON.stringify({ error: "file_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Store document privately ──
    const ext = (file_name || "document").split(".").pop() || "pdf";
    const storagePath = `extractions/${crypto.randomUUID()}.${ext}`;
    const fileBuffer = Uint8Array.from(atob(file_base64), c => c.charCodeAt(0));
    
    await supabase.storage.from("verification-evidence").upload(storagePath, fileBuffer, {
      contentType: ext === "pdf" ? "application/pdf" : `image/${ext}`,
      upsert: false,
    });

    // ── Call AI for extraction ──
    const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext.toLowerCase());
    const mimeType = isImage ? `image/${ext === "jpg" ? "jpeg" : ext}` : "application/pdf";

    const aiMessages: any[] = [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: isImage
          ? [
              { type: "text", text: "Extract all fields from this document image." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${file_base64}` } },
            ]
          : `Extract all fields from this document. The document content is provided as base64-encoded ${ext}. File name: ${file_name || "document"}`,
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI extraction error:", aiResp.status, errText);
      throw new Error("AI extraction failed");
    }

    const aiResult = await aiResp.json();
    let rawContent = aiResult.choices?.[0]?.message?.content || "{}";
    
    // Clean markdown code fences if present
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    let extraction: any;
    try {
      extraction = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      extraction = {};
    }

    // ── Build extraction result with defaults ──
    const NOT_FOUND = { value: null, confidence: "not_found", source_snippet: null };
    const fields = [
      "business_name", "legal_name", "phone", "email", "website",
      "rbq_number", "neq", "address", "city", "client_name",
      "project_address", "date", "total_price", "taxes", "payment_terms",
      "scope_of_work", "warranties", "exclusions", "signature_blocks",
    ];

    const result: any = {
      extraction_id: crypto.randomUUID(),
      document_type: extraction.document_type || "unknown",
      document_clarity: extraction.document_clarity || "partial",
    };

    for (const f of fields) {
      const ex = extraction[f];
      result[f] = ex?.value ? ex : NOT_FOUND;
    }

    // ── Identify what was found ──
    const identityFields = ["business_name", "legal_name", "phone", "email", "website", "rbq_number", "neq", "address", "city"];
    const identity_clues_found = identityFields.filter(f => result[f]?.value);
    const confirmations: string[] = [];
    const unconfirmed: string[] = [];

    for (const f of identityFields) {
      const label = {
        business_name: "Nom commercial", legal_name: "Raison sociale",
        phone: "Téléphone", email: "Courriel", website: "Site web",
        rbq_number: "Licence RBQ", neq: "NEQ", address: "Adresse", city: "Ville",
      }[f] || f;

      if (result[f]?.value && result[f]?.confidence !== "low") {
        confirmations.push(`${label} trouvé dans le document`);
      } else if (!result[f]?.value) {
        unconfirmed.push(`${label} non trouvé`);
      }
    }

    // ── Mismatch detection against known contractor profile ──
    let mismatches: any[] = [];
    let matched_contractor_id: string | null = contractor_id || null;

    if (contractor_id) {
      const { data: contractor } = await supabase
        .from("contractors")
        .select("business_name, phone, email, website, license_number, city")
        .eq("id", contractor_id)
        .maybeSingle();

      if (contractor) {
        mismatches = detectMismatches([
          { field: "business_name", docValue: result.business_name?.value, profileValue: contractor.business_name, label_fr: "Nom commercial" },
          { field: "phone", docValue: result.phone?.value, profileValue: contractor.phone, label_fr: "Téléphone" },
          { field: "email", docValue: result.email?.value, profileValue: contractor.email, label_fr: "Courriel" },
          { field: "website", docValue: result.website?.value, profileValue: contractor.website, label_fr: "Site web" },
          { field: "rbq_number", docValue: result.rbq_number?.value, profileValue: contractor.license_number, label_fr: "Licence RBQ" },
          { field: "city", docValue: result.city?.value, profileValue: contractor.city, label_fr: "Ville" },
        ]);
      }
    }

    // ── Suggested next steps ──
    const suggested_next_steps: string[] = [];
    if (!result.rbq_number?.value) {
      suggested_next_steps.push("Demandez le numéro de licence RBQ à l'entrepreneur.");
    }
    if (mismatches.length > 0) {
      suggested_next_steps.push("Vérifiez les écarts détectés avec l'entrepreneur.");
    }
    if (identity_clues_found.length < 3) {
      suggested_next_steps.push("Ce document contient peu d'indices d'identification. Ajoutez une carte d'affaires ou un site web pour améliorer la vérification.");
    }
    if (identity_clues_found.length >= 3 && mismatches.length === 0) {
      suggested_next_steps.push("Ce document renforce la correspondance avec cette entreprise.");
    }

    // ── Link to verification run if provided ──
    if (verification_run_id) {
      await supabase.from("contractor_verification_evidence").insert({
        verification_run_id,
        evidence_type: "document_extraction",
        file_path: storagePath,
        extracted_data: result,
        uploaded_by: userId,
      }).then(() => {}).catch((e: any) => console.error("Evidence link error:", e));
    }

    // ── Save extraction record ──
    if (userId) {
      await supabase.from("property_ai_extractions").insert({
        property_id: null,
        extraction_type: "document_identity_extraction",
        source_doc_type: result.document_type,
        structured_data: {
          extraction: result,
          identity_clues_found,
          confirmations,
          unconfirmed,
          mismatches,
          suggested_next_steps,
          matched_contractor_id,
          linked_verification_run_id: verification_run_id || null,
        },
        confidence: identity_clues_found.length >= 4 ? 0.8 : identity_clues_found.length >= 2 ? 0.5 : 0.3,
        model_used: "gemini-2.5-flash",
      }).then(() => {}).catch((e: any) => console.error("Extraction save error:", e));
    }

    const response = {
      success: true,
      extraction: result,
      identity_clues_found,
      confirmations,
      unconfirmed,
      mismatches,
      suggested_next_steps,
      matched_contractor_id,
      linked_verification_run_id: verification_run_id || null,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Document extraction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
