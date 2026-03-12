import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_item_id, entities } = await req.json();
    if (!job_item_id || !entities) {
      return new Response(JSON.stringify({ error: "job_item_id and entities required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract property data from entities
    const findEntity = (type: string) => entities.find((e: any) => e.entity_type === type)?.entity_value;

    const address = findEntity("address") || "Adresse extraite";
    const postalCode = findEntity("postal_code");
    const lotNumber = findEntity("lot_number");
    const municipalEval = findEntity("municipal_evaluation");
    const taxAmount = findEntity("tax_amount");
    const taxYear = findEntity("year");

    // Check for existing property by address (dedup)
    const { data: existing } = await supabase
      .from("properties")
      .select("id")
      .ilike("address", `%${address.substring(0, 20)}%`)
      .limit(1);

    let propertyId: string;

    if (existing && existing.length > 0) {
      propertyId = existing[0].id;
    } else {
      // Create new property
      const { data: newProp, error: propError } = await supabase
        .from("properties")
        .insert({
          address,
          postal_code: postalCode || null,
          property_type: "house",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (propError) throw propError;
      propertyId = newProp.id;

      // Add user as owner via property_members
      await supabase.from("property_members").insert({
        property_id: propertyId,
        user_id: user.id,
        role: "owner",
      });
    }

    // Create/update master record
    const masterData: Record<string, any> = {
      property_id: propertyId,
      canonical_address: address,
      canonical_postal_code: postalCode || null,
      lot_number: lotNumber || null,
      data_sources: [{ type: "tax_bill", job_item_id, extracted_at: new Date().toISOString() }],
      last_enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (municipalEval) {
      const cleanVal = municipalEval.replace(/[\s,]/g, "").replace(",", ".");
      masterData.municipal_evaluation = parseFloat(cleanVal) || null;
    }
    if (taxAmount) {
      const cleanTax = taxAmount.replace(/[\s,]/g, "").replace(",", ".");
      masterData.tax_amount = parseFloat(cleanTax) || null;
    }
    if (taxYear) {
      masterData.last_tax_year = parseInt(taxYear) || null;
    }

    // Upsert master record
    const { data: existingMaster } = await supabase
      .from("property_master_records")
      .select("id")
      .eq("property_id", propertyId)
      .single();

    if (existingMaster) {
      await supabase.from("property_master_records").update(masterData).eq("property_id", propertyId);
    } else {
      await supabase.from("property_master_records").insert(masterData);
    }

    // Create AI extraction record
    await supabase.from("property_ai_extractions").insert({
      property_id: propertyId,
      job_item_id,
      extraction_type: "tax_bill_parse",
      source_doc_type: "tax_bill",
      structured_data: { address, postalCode, lotNumber, municipalEval, taxAmount, taxYear },
      confidence: 0.75,
      model_used: "regex_v1",
    });

    // Create property event
    await supabase.from("property_events").insert({
      property_id: propertyId,
      event_type: "document_ingested",
      title: `Compte de taxes ${taxYear || ""} importé`,
      description: `Évaluation municipale: ${municipalEval || "N/A"}, Taxes: ${taxAmount || "N/A"}`,
      event_date: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true,
      property_id: propertyId,
      is_new: !(existing && existing.length > 0),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Create property from tax bill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
