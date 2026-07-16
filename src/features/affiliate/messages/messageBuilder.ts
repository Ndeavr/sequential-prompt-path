/**
 * Personal SMS message builder.
 *
 * Rule: NEVER emit a visible {{placeholder}}. If a value is missing,
 * reformulate naturally so the sentence still reads well.
 */
import { SMS_VARIANTS, type SmsVariantKey, DEFAULT_VARIANT } from "./variants";

export interface MessageContext {
  leadFirstName?: string | null;
  leadFullName?: string | null;
  companyName?: string | null;
  city?: string | null;
  affiliateFirstName?: string | null;
  activationLink: string;
}

function nonEmpty(v?: string | null): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

/**
 * Build a fully-rendered personal SMS. No placeholders will remain.
 */
export function buildPersonalSms(ctx: MessageContext, variant: SmsVariantKey = DEFAULT_VARIANT): string {
  const v = SMS_VARIANTS.find((x) => x.key === variant) ?? SMS_VARIANTS[0];

  const firstName = nonEmpty(ctx.leadFirstName) ?? (nonEmpty(ctx.leadFullName)?.split(" ")[0] ?? null);
  const company = nonEmpty(ctx.companyName);
  const city = nonEmpty(ctx.city);
  const affiliateFirst = nonEmpty(ctx.affiliateFirstName) ?? "l'équipe UNPRO";

  const greeting = firstName ?? "bonjour";
  const companyLine = company ? `votre entreprise ${company}` : "votre entreprise";
  const cityLine = city ? ` à ${city}` : "";
  const companyOrPros = company ? `des pros comme ${company}` : "les entrepreneurs locaux";
  const companyOrYou = company ? `${company}` : "vous";

  const repl = (s: string, k: string, v: string) => s.split(k).join(v);
  let text = v.template;
  text = repl(text, "{greeting}", greeting);
  text = repl(text, "{affiliate_first_name}", affiliateFirst);
  text = repl(text, "{company_line}", companyLine);
  text = repl(text, "{city_line}", cityLine);
  text = repl(text, "{company_or_pros}", companyOrPros);
  text = repl(text, "{company_or_you}", companyOrYou);
  text = repl(text, "{link}", ctx.activationLink);

  // Safety net — strip any leftover placeholders
  text = text.replace(/\{[a-z_]+\}/gi, "").replace(/\s{2,}/g, " ").trim();
  return text;
}

/**
 * Build the personal activation link tied to a lead + optional affiliate code.
 * Uses short path unpro.ca/e/:leadId?ref=:code
 */
export function buildActivationLink(leadId: string, affiliateCode?: string | null): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://unpro.ca";
  const url = new URL(`/e/${leadId}`, base);
  if (affiliateCode) url.searchParams.set("ref", affiliateCode);
  return url.toString();
}

export function buildSmsHref(phoneE164: string, body: string): string {
  return `sms:${phoneE164}?body=${encodeURIComponent(body)}`;
}

export function buildTelHref(phoneE164: string): string {
  return `tel:${phoneE164}`;
}

export function buildWhatsAppHref(phoneE164: string, body: string): string {
  const digits = phoneE164.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
