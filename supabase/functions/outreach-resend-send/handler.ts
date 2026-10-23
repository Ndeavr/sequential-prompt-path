// UNPRO — pure, dependency-injected handler for outreach-resend-send.
// No Deno / network imports here so it is unit-testable in Vitest.
//
// Fail-closed order for COMMERCIAL email (anything not to an internal
// @unpro.ca / founder address):
//   service-role auth → input validation → OUTREACH_ENABLED → autopilot gate
//   → proven sender domain → real postal address → suppression (both lists)
//   → human-reviewed CASL evidence for the exact address → atomic claim
//   (recipient+campaign, 7d cooldown, 25/day) → provider → settle.
// Nothing reaches the provider unless every step passes.

export interface SendInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cta_url?: string;
  tags?: Record<string, string>;
  message_id?: string;
  template_name?: string;
  campaign?: string;
  purpose?: "commercial_outreach" | "internal_test";
}

export interface Deps {
  serviceRoleKey: string;
  founderEmail: string;
  postalAddress: string;
  unsubscribeBaseUrl: string;
  senderFrom: string;
  senderDomain: string;
  hasProviderKey: boolean;
  outreachEnabled: () => Promise<boolean>;
  autopilotOpen: () => Promise<{ allowed: boolean; reason: string | null }>;
  senderDomainVerified: (domain: string) => Promise<boolean>;
  isSuppressed: (email: string) => Promise<boolean>; // must throw/true on read error
  hasReviewedEmailConsent: (email: string) => Promise<boolean>;
  createUnsubscribeToken: (email: string) => Promise<string>;
  claim: (key: string, email: string, campaign: string) => Promise<string>;
  settle: (key: string, status: "sent" | "failed_retryable" | "failed_final", providerId: string | null, error: string | null) => Promise<void>;
  sha256: (s: string) => Promise<string>;
  providerSend: (payload: Record<string, unknown>) => Promise<{ status: number; body: any }>;
  log: (row: Record<string, unknown>) => Promise<void>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HREF_RE = /href\s*=\s*"[^"]+"/i;
const FORBIDDEN_COPY = [/\b1\s?\$/, /3 (premiers )?rendez-vous gratuits/i, /premier rendez-vous garanti/i];

export function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function isInternalRecipient(to: string, founder: string): boolean {
  const e = to.trim().toLowerCase();
  return e === founder.trim().toLowerCase() || e.endsWith("@unpro.ca");
}

export function htmlToText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n").trim();
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

type Res = { status: number; body: Record<string, unknown> };

export async function handleSend(authHeader: string | null, raw: unknown, d: Deps): Promise<Res> {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "");
  if (!constantTimeEqual(token, d.serviceRoleKey)) return { status: 401, body: { ok: false, reason: "UNAUTHORIZED" } };

  const body = (raw ?? {}) as SendInput;
  const messageId = body.message_id ?? crypto.randomUUID();
  const block = async (status: number, reason: string, detail = "") => {
    await d.log({ message_id: messageId, template_name: body.template_name ?? "outreach-resend-send",
      recipient_email: typeof body.to === "string" ? body.to : null, status: "email_blocked",
      error_message: `${reason}${detail ? ": " + detail : ""}`, metadata: { reason } });
    return { status, body: { ok: false, reason, detail, message_id: messageId } };
  };

  if (!d.hasProviderKey) return block(500, "MISSING_SECRET");
  if (typeof body.to !== "string" || !EMAIL_RE.test(body.to)) return block(422, "INVALID_RECIPIENT");
  if (!body.subject?.trim()) return block(422, "MISSING_SUBJECT");
  let html = (body.html ?? "").trim();
  if (!html) return block(422, "MISSING_HTML");
  if (!body.cta_url && !HREF_RE.test(html)) return block(422, "MISSING_CTA");

  const to = body.to.trim().toLowerCase();
  const internal = isInternalRecipient(to, d.founderEmail);
  const commercial = body.purpose === "commercial_outreach" || !internal;
  if (body.purpose === "internal_test" && !internal) return block(403, "INTERNAL_TEST_EXTERNAL_RECIPIENT");

  let claimKey: string | null = null;
  const headers: Record<string, string> = {};
  if (commercial) {
    if (FORBIDDEN_COPY.some((r) => r.test(html) || r.test(body.subject))) return block(422, "FORBIDDEN_OFFER_COPY");
    const campaign = (body.campaign ?? body.template_name ?? "").trim();
    if (!campaign) return block(422, "MISSING_CAMPAIGN");
    if (!(await d.outreachEnabled().catch(() => false))) return block(423, "OUTREACH_DISABLED");
    const gate = await d.autopilotOpen().catch(() => ({ allowed: false, reason: "gate_unreadable" }));
    if (!gate.allowed) return block(423, "AUTOPILOT_GATED", gate.reason ?? "");
    if (!(await d.senderDomainVerified(d.senderDomain).catch(() => false))) return block(423, "SENDER_DOMAIN_NOT_VERIFIED", d.senderDomain);
    if (!d.postalAddress.trim()) return block(423, "SENDER_POSTAL_ADDRESS_MISSING");
    if (await d.isSuppressed(to).catch(() => true)) return block(409, "RECIPIENT_SUPPRESSED");
    if (!(await d.hasReviewedEmailConsent(to).catch(() => false))) return block(423, "NO_REVIEWED_CASL_EVIDENCE");

    claimKey = await d.sha256(`${to}|${campaign}`);
    const decision = await d.claim(claimKey, to, campaign).catch(() => "claim_unavailable");
    if (decision !== "claimed" && decision !== "claimed_retry") return block(409, "CLAIM_REJECTED", decision);

    let unsubUrl: string;
    try {
      const t = await d.createUnsubscribeToken(to);
      unsubUrl = `${d.unsubscribeBaseUrl}?token=${encodeURIComponent(t)}`;
    } catch {
      await d.settle(claimKey, "failed_retryable", null, "unsubscribe_token_failed");
      return block(503, "UNSUBSCRIBE_UNAVAILABLE");
    }
    const footer = `<p style="font-size:12px;color:#777;margin:16px 0 0 0;">UNPRO · ${esc(d.postalAddress)}<br/>` +
      `Vous recevez ce message parce que votre adresse professionnelle est publiée sur votre site. ` +
      `<a href="${unsubUrl}">Se désabonner</a></p>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : html + footer;
    headers["List-Unsubscribe"] = `<${unsubUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const text = body.text ?? htmlToText(html);
  const payload: Record<string, unknown> = { from: d.senderFrom, to: [to], subject: body.subject, html, text, tags: body.tags };
  if (Object.keys(headers).length) payload.headers = headers;

  let resp: { status: number; body: any };
  try {
    resp = await d.providerSend(payload);
  } catch (e) {
    if (claimKey) await d.settle(claimKey, "failed_retryable", null, String(e).slice(0, 300));
    return block(502, "RESEND_NETWORK_ERROR", String(e).slice(0, 200));
  }
  if (resp.status < 200 || resp.status >= 300) {
    const retryable = resp.status === 429 || resp.status >= 500;
    const detail = String(resp.body?.message ?? resp.body?.error ?? `HTTP_${resp.status}`).slice(0, 300);
    if (claimKey) await d.settle(claimKey, retryable ? "failed_retryable" : "failed_final", null, detail);
    return block(502, "RESEND_PROVIDER_ERROR", detail);
  }
  const id = resp.body?.id ?? null;
  if (claimKey) await d.settle(claimKey, "sent", id, null);
  await d.log({ message_id: messageId, template_name: body.template_name ?? "outreach-resend-send", recipient_email: to,
    status: "sent", metadata: { resend_id: id, sender: d.senderFrom, commercial } });
  return { status: 200, body: { ok: true, message_id: messageId, resend_id: id, sender: d.senderFrom, commercial } };
}
