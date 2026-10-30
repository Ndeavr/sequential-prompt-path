export interface SupplierForm {
  company: string; first_name: string; last_name: string; email: string;
  org_type: '' | 'manufacturer' | 'distributor' | 'supplier' | 'association' | 'other' | string;
  network_size: string; message: string; privacy_consent: boolean;
}

const ORG = ['manufacturer', 'distributor', 'supplier', 'association', 'other'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validation client (miroir de l'edge function). Retourne {champ: message}. */
export function validateSupplierForm(f: SupplierForm, lang: 'fr' | 'en' = 'fr'): Record<string, string> {
  const t = (a: string, b: string) => (lang === 'fr' ? a : b);
  const e: Record<string, string> = {};
  if (f.company.trim().length < 2) e.company = t('Indiquez le nom de l’entreprise.', 'Enter the company name.');
  if (!f.first_name.trim()) e.first_name = t('Indiquez votre prénom.', 'Enter your first name.');
  if (!f.last_name.trim()) e.last_name = t('Indiquez votre nom.', 'Enter your last name.');
  if (!EMAIL.test(f.email.trim()) || f.email.length > 255) e.email = t('Courriel invalide.', 'Invalid email.');
  if (!ORG.includes(f.org_type)) e.org_type = t('Choisissez un type.', 'Choose a type.');
  if (f.message.length > 2000) e.message = t('Message trop long.', 'Message too long.');
  if (!f.privacy_consent) e.privacy_consent = t('Le consentement est requis.', 'Consent is required.');
  return e;
}
