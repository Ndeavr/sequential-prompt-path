/**
 * useAddLead — types de brouillon + insertion héritée (sans auto-attribution).
 * Les écrans affiliés passent par stageImport (brouillon serveur, dédoublonnage fail-closed).
 */
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneStorage, digitsOnly } from "../lib/phoneUtils";

export interface DraftLead {
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  role_title?: string;
  phone?: string;
  mobile_phone?: string;
  email?: string;
  website_url?: string;
  street_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  category_primary?: string;
  note?: string;
  consent_channel?: string;
  consent_to_contact?: "yes" | "no" | "unknown";
  business_card_url?: string;
  extraction_raw?: Record<string, unknown>;
  extraction_confidence?: Record<string, number>;
  source_label?: string;
}

export async function insertLead(draft: DraftLead, affiliateId: string) {
  const phoneRaw = draft.phone || draft.mobile_phone || "";
  const phoneE164 = formatPhoneStorage(phoneRaw);
  const fullName = [draft.contact_first_name, draft.contact_last_name].filter(Boolean).join(" ").trim() || null;

  const row: Record<string, unknown> = {
    source_type: "affiliate_manual",
    source_label: draft.source_label || "affiliate_war_room",
    company_name: draft.company_name || null,
    first_name: draft.contact_first_name || null,
    last_name: draft.contact_last_name || null,
    full_name: fullName,
    role_title: draft.role_title || null,
    email: draft.email?.toLowerCase() || null,
    phone: phoneRaw || null,
    phone_e164: phoneE164,
    mobile_phone: draft.mobile_phone || null,
    website_url: draft.website_url || null,
    street_address: draft.street_address || null,
    city: draft.city || null,
    province: draft.province || "QC",
    postal_code: draft.postal_code || null,
    category_primary: draft.category_primary || null,
    created_by_affiliate_id: affiliateId,
    // Jamais d'auto-attribution : la réservation relève d'une décision serveur/admin.
    assigned_affiliate_id: null,
    consent_channel: draft.consent_channel || null,
    consent_to_contact: draft.consent_to_contact || "unknown",
    business_card_url: draft.business_card_url || null,
    extraction_raw: (draft.extraction_raw as any) || null,
    extraction_confidence: (draft.extraction_confidence as any) || null,
    metadata_json: { note: draft.note || null },
    lead_status: "new",
    attribution_type: "affiliate_manual",
  };

  const { data, error } = await (supabase as any)
    .from("contractor_leads")
    .insert(row)
    .select("id, company_name, phone_e164, full_name, email")
    .single();
  if (error) throw error;
  return data;
}

export function phoneDigitsCount(raw: string) { return digitsOnly(raw).length; }
