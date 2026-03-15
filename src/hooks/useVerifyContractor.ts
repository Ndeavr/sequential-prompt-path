/**
 * UNPRO — useVerifyContractor hook
 * Calls the verify-contractor edge function.
 *
 * Passes all form fields individually so the backend can do
 * multi-field lookup (not just a single "input" string).
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VerificationApiResponse, VerificationFormInput, EvidenceType } from "@/types/verification";

interface VerifyPayload {
  form: VerificationFormInput;
  image_base64?: string;
  image_type?: EvidenceType;
  project_description?: string;
  verification_run_id?: string;
}

/**
 * Build edge function input from the form.
 * Priority: RBQ > phone > website > business_name
 * Also passes all individual fields for multi-signal matching.
 */
function buildInput(form: VerificationFormInput): Record<string, string | undefined> {
  // Primary "input" field — strongest identifier
  let input: string | undefined;
  if (form.rbq_number?.trim()) input = form.rbq_number.trim();
  else if (form.phone?.trim()) input = form.phone.trim();
  else if (form.website?.trim()) input = form.website.trim();
  else if (form.business_name?.trim()) input = form.business_name.trim();

  return {
    input,
    input_city: form.city?.trim() || undefined,
    // Pass all fields so backend can cross-reference
    input_phone: form.phone?.trim() || undefined,
    input_business_name: form.business_name?.trim() || undefined,
    input_rbq: form.rbq_number?.trim() || undefined,
    input_website: form.website?.trim() || undefined,
  };
}

async function callVerify(payload: VerifyPayload): Promise<VerificationApiResponse> {
  const fields = buildInput(payload.form);

  const body: Record<string, unknown> = {
    ...fields,
    project_description: payload.project_description,
    image_base64: payload.image_base64,
    image_type: payload.image_type,
    verification_run_id: payload.verification_run_id,
  };

  const { data, error } = await supabase.functions.invoke("verify-contractor", {
    body,
  });

  if (error) throw new Error(error.message || "Erreur de vérification");
  if (!data?.success) throw new Error(data?.error || "Résultat inattendu du moteur de vérification.");

  return data as VerificationApiResponse;
}

export function useVerifyContractor() {
  return useMutation({
    mutationFn: callVerify,
    mutationKey: ["verify-contractor"],
  });
}
