/**
 * UNPRO — useVerifyContractor hook
 * Calls the verify-contractor v2 edge function via TanStack Query mutation.
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

function buildInput(form: VerificationFormInput): { input: string; input_city?: string } {
  // Priority: rbq > phone > website > name
  if (form.rbq_number?.trim()) return { input: form.rbq_number.trim(), input_city: form.city };
  if (form.phone?.trim()) return { input: form.phone.trim(), input_city: form.city };
  if (form.website?.trim()) return { input: form.website.trim(), input_city: form.city };
  if (form.business_name?.trim()) return { input: form.business_name.trim(), input_city: form.city };
  return { input: "" };
}

async function callVerify(payload: VerifyPayload): Promise<VerificationApiResponse> {
  const { input, input_city } = buildInput(payload.form);

  const body: Record<string, unknown> = {
    input: input || undefined,
    input_city,
    project_description: payload.project_description,
    image_base64: payload.image_base64,
    image_type: payload.image_type,
    verification_run_id: payload.verification_run_id,
  };

  const { data, error } = await supabase.functions.invoke("verify-contractor", {
    body,
  });

  if (error) throw new Error(error.message || "Erreur de vérification");
  if (!data?.success) throw new Error(data?.error || "Résultat inattendu");

  return data as VerificationApiResponse;
}

export function useVerifyContractor() {
  return useMutation({
    mutationFn: callVerify,
    mutationKey: ["verify-contractor"],
  });
}
