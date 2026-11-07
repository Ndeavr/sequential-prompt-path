// STAGED ONLY: integrate behind the existing service-only communications path.
// Provider reads are dependencies, never caller-supplied callback/event payloads.
export type GmailMessage = {
  id: string; threadId: string; labelIds?: string[]; internalDate: string;
  payload?: { mimeType?: string; headers?: { name: string; value: string }[];
    body?: { data?: string }; parts?: GmailMessage['payload'][] };
};
type StoredMessage = { message_id: string; recipient: string; metadata: Record<string, unknown> };
export type Dependencies = {
  authorizeService: (request: Request) => Promise<boolean>;
  now: () => number;
  stored: (id: string) => Promise<StoredMessage | null>;
  gmailMessage: (id: string) => Promise<GmailMessage>;
  gmailThread: (id: string) => Promise<{ id: string; messages: GmailMessage[] }>;
  recordEmail: (id: string, kind: 'sent' | 'bounced', payload: Record<string, unknown>) => Promise<void>;
  recordAudit: (payload: Record<string, unknown>) => Promise<void>;
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const header = (m: GmailMessage, name: string) =>
  m.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
function partsText(p: GmailMessage['payload']): string {
  if (!p) return '';
  const encoded = p.body?.data;
  const own = encoded ? atob(encoded.replace(/-/g, '+').replace(/_/g, '/')) : '';
  return own + '\n' + (p.parts ?? []).map(partsText).join('\n');
}
function providerTime(m: GmailMessage, checked: number): string {
  if (!/^\d{10,16}$/.test(m.internalDate)) throw new Error('provider_timestamp_missing');
  const t = Number(m.internalDate);
  if (!Number.isSafeInteger(t) || t <= 0 || t > checked) throw new Error('provider_timestamp_invalid');
  return new Date(t).toISOString();
}
function bounceFor(report: GmailMessage, sent: GmailMessage, recipient: string): boolean {
  if (report.id === sent.id || report.threadId !== sent.threadId) return false;
  if (report.payload?.mimeType !== 'multipart/report' || !/report-type\s*=\s*delivery-status/i.test(header(report, 'Content-Type'))) return false;
  const messageId = header(sent, 'Message-ID');
  if (!messageId) return false;
  const text = partsText(report.payload);
  // Require exact original message identity and exact failed recipient, not a snippet match.
  const linked = text.includes(messageId) || header(report, 'In-Reply-To') === messageId;
  const finalRecipient = text.match(/^Final-Recipient:\s*rfc822;\s*([^\r\n]+)/im)?.[1]?.trim().toLowerCase();
  return linked && finalRecipient === recipient.trim().toLowerCase()
    && /^Action:\s*failed\s*$/im.test(text)
    && /^Status:\s*5\.\d+\.\d+/im.test(text)
    && /^Diagnostic-Code:\s*smtp;[^\r\n]*\b550\b/im.test(text);
}

export async function reconcileGmail(request: Request, d: Dependencies): Promise<Response> {
  // No provider read or database write before verified service authentication.
  if (!await d.authorizeService(request)) return reply(403, { ok: false, code: 'service_required' });
  if (request.method !== 'POST') return reply(405, { ok: false, code: 'method_not_allowed' });
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { ok: false, code: 'invalid_request' });
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(k => k !== 'message_ids') || !Array.isArray(data.message_ids)
      || data.message_ids.length < 1 || data.message_ids.length > 24
      || data.message_ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{16}$/.test(id))) {
    return reply(400, { ok: false, code: 'invalid_request' });
  }
  const ids = [...new Set(data.message_ids as string[])];
  let sentCount = 0, bounceCount = 0;
  try {
    for (const id of ids) {
      const stored = await d.stored(id);
      if (!stored || stored.message_id !== id) throw new Error('unmatched_existing_message');
      const checked = d.now(), checkedAt = new Date(checked).toISOString();
      const message = await d.gmailMessage(id);
      if (message.id !== id || !message.labelIds?.includes('SENT')) throw new Error('gmail_sent_not_verified');
      const thread = await d.gmailThread(message.threadId);
      if (thread.id !== message.threadId) throw new Error('gmail_thread_mismatch');
      const sentAt = providerTime(message, checked);
      const reports = thread.messages.filter(r => bounceFor(r, message, stored.recipient));
      if (reports.length > 1) throw new Error('ambiguous_delivery_reports');
      const report = reports[0];
      const bounceAt = report ? providerTime(report, checked) : null;
      const observations = { ...((stored.metadata.gmail_observations as Record<string, unknown>) ?? {}),
        sent: { source: 'gmail_api', source_at: sentAt, checked_at: checkedAt },
        ...(report ? { bounced: { source: 'gmail_api_delivery_status', source_at: bounceAt,
          checked_at: checkedAt, provider_notification_id: report.id, smtp_code: '550' } } : {}),
      };
      // Existing event timestamp is never rewritten; exact provider time stays separately observable.
      await d.recordEmail(id, 'sent', { ts: sentAt, gmail_observations: observations });
      await d.recordAudit({ _event_type: 'sent', _channel: 'email', _provider: 'gmail',
        _provider_message_id: id, _status: 'sent', _idempotency_key: `gmail:${id}:sent`,
        _metadata: { source: 'gmail_api', source_at: sentAt, checked_at: checkedAt, delivery: 'unknown' } });
      sentCount++;
      if (report) {
        await d.recordEmail(id, 'bounced', { ts: bounceAt, gmail_observations: observations });
        await d.recordAudit({ _event_type: 'bounced', _channel: 'email', _provider: 'gmail',
          _provider_message_id: id, _status: 'bounced', _idempotency_key: `gmail:${id}:bounced`,
          _metadata: observations.bounced });
        bounceCount++;
      }
    }
    return reply(200, { ok: true, checked: ids.length, sent: sentCount, bounced: bounceCount,
      delivery_unknown: sentCount - bounceCount, engagement: 'unknown' });
  } catch (error) {
    // Sequential canonical writes can partially succeed. Stable audit keys + canonical message
    // uniqueness make replay safe; never acknowledge a partial failure as success.
    return reply(503, { ok: false, code: error instanceof Error ? error.message : 'reconciliation_failed',
      completed_sent: sentCount, completed_bounced: bounceCount, partial_possible: true });
  }
}