export type FormType =
  | 'partner_application'
  | 'condo_priority_access'
  | 'contact'
  | 'contractor_onboarding'
  | 'alex_callback'
  | 'quote_upload'
  | 'project_analysis'
  | 'contractor_signup'
  | 'newsletter';

export interface FormPayloadBase {
  first_name?: string;
  last_name?: string;
  salutation?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  [key: string]: any;
}

export interface SubmitResult {
  id: string;
  reference_code: string;
}

export type FormSubmitState = 'idle' | 'submitting' | 'success' | 'error';
