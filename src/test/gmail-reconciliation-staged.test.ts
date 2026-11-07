import { describe, it, expect } from 'vitest';
import { reconcileGmail, type Dependencies, type GmailMessage } from '../../docs/security-staged/gmail-reconciliation/handler';

const id = 'aaaaaaaaaaaaaaaa';
const sourceTime = '2026-11-06T12:39:18.000Z';
const recipient = 'qa@example.test';
function setup(bounced = false) {
  const events = new Map<string, Record<string, unknown>>();
  const audits = new Map<string, Record<string, unknown>>();
  const stored = { message_id: id, recipient, metadata: { existing: 'preserve' } };
  const sent: GmailMessage = { id, threadId: id, labelIds: ['SENT'], internalDate: '1793968751000',
    payload: { headers: [{ name: 'Message-ID', value: '<synthetic@example.test>' }] } };
  const report: GmailMessage = { id: 'bbbbbbbbbbbbbbbb', threadId: id, internalDate: '1793968758000',
    payload: { mimeType: 'multipart/report', headers: [{ name: 'Content-Type', value: 'multipart/report; report-type=delivery-status' }],
      body: { data: btoa('Final-Recipient: rfc822; '+recipient+'\r\nAction: failed\r\nStatus: 5.1.1\r\nDiagnostic-Code: smtp; 550 No such user\r\nMessage-ID: <synthetic@example.test>') } } };
  const d: Dependencies = {
    authorizeService: async () => true, now: () => Date.parse('2026-11-07T03:20:00Z'),
    stored: async () => stored, gmailMessage: async () => sent,
    gmailThread: async () => ({ id, messages: bounced ? [sent, report] : [sent] }),
    recordEmail: async (_, kind, payload) => { events.set(kind, payload); },
    recordAudit: async payload => { if (!audits.has(String(payload._idempotency_key))) audits.set(String(payload._idempotency_key), payload); },
  };
  const request = () => new Request('https://example.test/reconcile', { method: 'POST', body: JSON.stringify({ message_ids: [id, id] }) });
  return { d, events, audits, request, sent, report, stored };
}
describe('staged Gmail canonical reconciliation (synthetic only)', () => {
  it('replay deduplicates provider+message+event without making SENT delivered', async () => {
    const x = setup(); await reconcileGmail(x.request(), x.d); await reconcileGmail(x.request(), x.d);
    expect(x.events.size).toBe(1); expect(x.audits.size).toBe(1);
    expect(x.events.has('delivered')).toBe(false);
    expect(x.audits.get(`gmail:${id}:sent`)?._metadata).toMatchObject({ delivery: 'unknown' });
  });
  it('keeps exact SMTP550 source timestamp separate from checked_at', async () => {
    const x = setup(true); const response = await reconcileGmail(x.request(), x.d);
    expect(response.status).toBe(200); expect(x.events.get('bounced')?.ts).toBe(sourceTime);
    expect(x.audits.get(`gmail:${id}:bounced`)?._metadata).toMatchObject({ source_at: sourceTime, checked_at: '2026-11-07T03:20:00.000Z' });
  });
  it('preserves unknown engagement and unrelated metadata', async () => {
    const x = setup(); const result = await (await reconcileGmail(x.request(), x.d)).json();
    expect(result.engagement).toBe('unknown'); expect(x.stored.metadata.existing).toBe('preserve');
    expect([...x.events.keys()]).toEqual(['sent']);
  });
  it('rejects unauthorized writes before any provider read', async () => {
    const x = setup(); x.d.authorizeService = async () => false;
    x.d.gmailMessage = async () => { throw new Error('must_not_read'); };
    expect((await reconcileGmail(x.request(), x.d)).status).toBe(403); expect(x.events.size).toBe(0);
  });
  it('rejects unmatched messages without inventing canonical rows', async () => {
    const x = setup(); x.d.stored = async () => null;
    expect((await reconcileGmail(x.request(), x.d)).status).toBe(503); expect(x.events.size).toBe(0);
  });
  it('does not infer bounce from another recipient or a snippet', async () => {
    const x = setup(true); if (x.report.payload?.body) x.report.payload.body.data = btoa('550 failed another recipient');
    await reconcileGmail(x.request(), x.d); expect(x.events.has('bounced')).toBe(false);
  });
  it('rejects fabricated event fields in requests', async () => {
    const x = setup(); const req = new Request('https://example.test', { method: 'POST', body: JSON.stringify({ message_ids: [id], status: 'delivered' }) });
    expect((await reconcileGmail(req, x.d)).status).toBe(400); expect(x.events.size).toBe(0);
  });
  it('partial audit failure is explicit and replay finishes without duplicate events', async () => {
    const x = setup(); const writer = x.d.recordAudit; x.d.recordAudit = async () => { throw new Error('audit_unavailable'); };
    expect((await reconcileGmail(x.request(), x.d)).status).toBe(503);
    x.d.recordAudit = writer; expect((await reconcileGmail(x.request(), x.d)).status).toBe(200);
    expect(x.events.size).toBe(1); expect(x.audits.size).toBe(1);
  });
});