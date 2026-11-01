/** Recycler un lead : validation client (miroir de l'edge `submit-lead-referral`) et appel serveur. */
import { supabase } from "@/integrations/supabase/client";

export const LEAD_REFERRAL_ROUTE = "/pro/recycler-un-lead";
export const TRANSFER_REASONS = ["out_of_territory", "out_of_specialty", "no_availability", "other"] as const;
export type TransferReason = (typeof TRANSFER_REASONS)[number];

export type LeadReferralForm = {
  client_name: string; client_phone: string; client_email: string; city_or_postal: string; address: string;
  service_requested: string; project_description: string; timeline: string;
  transfer_reason: TransferReason | ""; transfer_reason_other: string; attestation: boolean;
  declared_agreement_date: string; declared_agreement_mode: string;
};
export const EMPTY_LEAD_REFERRAL: LeadReferralForm = {
  client_name: "", client_phone: "", client_email: "", city_or_postal: "", address: "", service_requested: "",
  project_description: "", timeline: "", transfer_reason: "", transfer_reason_other: "", attestation: false,
  declared_agreement_date: "", declared_agreement_mode: "",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s().-]{10,20}$/;

/** Clés des champs invalides (vide = prêt). Aucune soumission sans attestation ni contact valide. */
export function validateLeadReferral(f: LeadReferralForm): string[] {
  const e: string[] = [];
  if (f.client_name.trim().length < 2) e.push("client_name");
  const phone = f.client_phone.trim(), email = f.client_email.trim();
  if (phone && !PHONE.test(phone)) e.push("client_phone");
  if (email && !EMAIL.test(email)) e.push("client_email");
  if (!phone && !email) e.push("contact");
  if (f.city_or_postal.trim().length < 2) e.push("city_or_postal");
  if (f.service_requested.trim().length < 2) e.push("service_requested");
  if (f.project_description.trim().length < 10) e.push("project_description");
  if (!f.transfer_reason) e.push("transfer_reason");
  if (f.transfer_reason === "other" && !f.transfer_reason_other.trim()) e.push("transfer_reason_other");
  if (f.attestation !== true) e.push("attestation");
  return e;
}

export type SubmitResult = { ok: true; reference: string; duplicate?: boolean } | { ok: false; error: string };

/** Référence retournée SEULEMENT si le serveur confirme l'enregistrement. */
export async function submitLeadReferral(f: LeadReferralForm, idempotencyKey: string, locale: "fr" | "en"): Promise<SubmitResult> {
  const blank = (v: string) => v.trim() || null;
  try {
    const { data, error } = await supabase.functions.invoke("submit-lead-referral", {
      body: {
        idempotency_key: idempotencyKey, client_name: f.client_name, client_phone: blank(f.client_phone), client_email: blank(f.client_email),
        city_or_postal: f.city_or_postal, address: blank(f.address), service_requested: f.service_requested,
        project_description: f.project_description, timeline: blank(f.timeline), transfer_reason: f.transfer_reason,
        transfer_reason_other: blank(f.transfer_reason_other), attestation: f.attestation,
        declared_agreement_date: blank(f.declared_agreement_date), declared_agreement_mode: blank(f.declared_agreement_mode), locale,
      },
    });
    if (error || !data?.ok || typeof data.reference !== "string") return { ok: false, error: data?.error ?? "unavailable" };
    return { ok: true, reference: data.reference, duplicate: data.duplicate === true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
