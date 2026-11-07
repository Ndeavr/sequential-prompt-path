import { it, expect } from 'vitest';
import { canonicalAdapter } from '../../docs/security-staged/gmail-reconciliation/canonicalAdapter';

it('uses the two existing canonical RPCs and surfaces rejected writes', async () => {
  const calls: string[] = [];
  const id = 'cccccccccccccccc';
  const handler = canonicalAdapter({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { message_id: id, recipient: 'fixture@example.test', metadata: {} }, error: null,
    }) }) }) }),
    rpc: async name => { calls.push(name); return name === 'record_engagement_event'
      ? { data: null, error: { message: 'synthetic denial' } }
      : { data: 'synthetic-event', error: null }; },
  }, {
    authorizeService: async () => true, now: () => Date.parse('2026-11-07T03:20:00Z'),
    gmailMessage: async () => ({ id, threadId: id, labelIds: ['SENT'], internalDate: '1793968751000' }),
    gmailThread: async () => ({ id, messages: [] }),
  });
  const response = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ message_ids: [id] }) }));
  expect(calls).toEqual(['record_email_event', 'record_engagement_event']);
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ ok: false, code: 'canonical_audit_write_failed', partial_possible: true });
});