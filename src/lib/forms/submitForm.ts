import { supabase } from '@/integrations/supabase/client';
import type { FormType, FormPayloadBase, SubmitResult } from './types';
import { captureAttribution } from './utm';

export class FormValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'FormValidationError'; }
}

/**
 * Centralized form submitter.
 * 1. Saves to form_submissions immediately (lead is NEVER lost).
 * 2. Triggers process-form-submission edge function (fire-and-forget).
 * Returns the new submission's id + reference_code.
 */
export async function submitForm(
  formType: FormType,
  data: FormPayloadBase,
): Promise<SubmitResult> {
  if (!data || typeof data !== 'object') {
    throw new FormValidationError('Données invalides.');
  }

  const attr = captureAttribution();

  const { first_name, last_name, salutation, email, phone, company, message, ...rest } = data;

  const insertRow: any = {
    form_type: formType,
    status: 'received',
    first_name: first_name?.trim() || null,
    last_name: last_name?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    phone: phone?.trim() || null,
    company: company?.trim() || null,
    payload: { salutation, message, ...rest },
    source_page: attr.source_page || null,
    utm_source: attr.utm_source || null,
    utm_medium: attr.utm_medium || null,
    utm_campaign: attr.utm_campaign || null,
    user_agent: attr.user_agent || null,
  };

  const { data: inserted, error } = await supabase
    .from('form_submissions' as any)
    .insert(insertRow)
    .select('id, reference_code')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || 'Impossible d\'enregistrer la soumission.');
  }

  // Fire-and-forget the email processor
  supabase.functions
    .invoke('process-form-submission', { body: { submission_id: (inserted as any).id } })
    .catch(() => {/* retry job will pick it up */});

  return {
    id: (inserted as any).id,
    reference_code: (inserted as any).reference_code,
  };
}
