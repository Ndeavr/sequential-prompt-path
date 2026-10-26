import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const token = 'syntheticToken01234567';
const userId = 'synthetic-owner';
const prospectId = 'synthetic-prospect';
type TokenRow = {
  token: string; prospect_id: string; expires_at: string | null;
  revoked_at: string | null; revoked_reason?: string;
  claimed_at: string | null; claimed_by: string | null;
};
const validToken = (): TokenRow => ({ token, prospect_id: prospectId, expires_at: '2099-01-01T00:00:00Z', revoked_at: null, claimed_at: null, claimed_by: null });

function harness(options: {
  tokens?: TokenRow[]; tokenError?: string; claimError?: boolean;
  claimUser?: string; authenticated?: boolean;
} = {}) {
  const writes: { table: string; method: string }[] = [];
  const reads: { table: string; method: string; value: unknown; match?: unknown }[] = [];
  const rpcs: string[] = [];
  const audits: unknown[] = [];
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const sb = {
    auth: { getUser: async () => ({ data: { user: options.authenticated === false ? null : { id: userId, email: 'qa@example.test' } }, error: null }) },
    from(table: string) {
      const chain: any = {};
      let equality: unknown;
      let prefix: unknown;
      for (const method of ['select', 'eq', 'like', 'limit', 'insert', 'update', 'upsert']) {
        chain[method] = (value: unknown, match?: unknown) => {
          if (['insert', 'update', 'upsert'].includes(method)) writes.push({ table, method });
          else reads.push({ table, method, value, match });
          if (method === 'eq' && value === 'token') equality = match;
          if (method === 'like') prefix = match;
          return chain;
        };
      }
      const result = () => {
        if (table === 'verified_prospect_tokens') {
          if (options.tokenError) return { data: null, error: { code: options.tokenError } };
          const rows = (options.tokens ?? [validToken()]).filter(row => prefix ? row.token.startsWith(String(prefix).replace(/%$/, '')) : row.token === equality);
          return rows.length > 1 ? { data: null, error: { code: 'PGRST116' } } : { data: rows[0] ?? null, error: null };
        }
        if (table === 'verified_contractor_prospects') return { data: { id: prospectId, business_name: 'Entreprise synthétique', category: null }, error: null };
        if (table === 'contractor_prospect_claims') return { data: options.claimUser ? { id: 'existing', user_id: options.claimUser, contractor_id: 'synthetic-contractor' } : null, error: options.claimError ? { code: 'offline' } : null };
        if (table === 'contractors') return { data: { id: 'synthetic-contractor' }, error: null };
        return { data: null, error: null };
      };
      chain.maybeSingle = async () => result();
      chain.then = (resolve: any) => Promise.resolve(result()).then(resolve);
      return chain;
    },
    rpc: async (name: string) => { rpcs.push(name); return { data: null, error: null }; },
  };
  const source = readFileSync('supabase/functions/activation-claim/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    Deno: { env: { get: () => 'synthetic-only' }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient: () => sb, crypto: webcrypto, TextEncoder, Response, Date, console,
    GUEST_PREFIX: 'guest_', claimGuestInvite: async () => { throw new Error('Guest flow outside fixture'); },
    normalizeServiceCategory: () => null,
    logInviteEvent: async (...args: unknown[]) => { audits.push(args.slice(1)); },
    fetch: () => { throw new Error('Outbound forbidden'); },
  });
  return { writes, reads, rpcs, audits, async run(input: unknown = token, probe = false) {
    if (!handler) throw new Error('handler missing');
    const response = await handler(new Request('https://example.test/claim', { method: 'POST', headers: { Authorization: 'Bearer synthetic-jwt' }, body: JSON.stringify({ token: input, probe }) }));
    return { status: response.status, body: await response.json() };
  } };
}

function expectNoBusinessWrites(h: ReturnType<typeof harness>) {
  expect(h.writes.filter(w => !['contractor_funnel_events', 'invite_audit_events'].includes(w.table))).toEqual([]);
  expect(h.rpcs).toEqual([]);
}

describe('actual activation claim — exact token guards, synthetic only', () => {
  it('preserves valid full-token claim and exact attribution', async () => {
    const h = harness();
    const r = await h.run();
    expect(r.status).toBe(200); expect(r.body.ok).toBe(true);
    expect(r.body.contractor_id).toBe('synthetic-contractor');
    expect(h.reads.find(x => x.table === 'verified_prospect_tokens' && x.method === 'eq')?.match).toBe(token);
    expect(h.writes.some(w => w.table === 'contractor_prospect_claims')).toBe(true);
  });
  it('preserves idempotent reopen by the same owner', async () => {
    const row = { ...validToken(), claimed_at: '2026-01-01T00:00:00Z', claimed_by: userId };
    const h = harness({ tokens: [row], claimUser: userId });
    const r = await h.run();
    expect(r.body.already_claimed).toBe(true); expect(r.status).toBe(200);
    expect(h.writes.filter(w => w.table === 'contractors' && w.method === 'insert')).toEqual([]);
  });
  it('preserves read-only valid owner probe', async () => {
    const h = harness({ claimUser: userId }); const r = await h.run(token, true);
    expect(r.body.linked_to_me).toBe(true); expect(h.writes).toEqual([]); expect(h.rpcs).toEqual([]);
  });
  it.each([
    ['revoked', { revoked_at: '2026-01-01T00:00:00Z' }, 'token_revoked', 410],
    ['expired', { expires_at: '2000-01-01T00:00:00Z' }, 'token_expired', 410],
    ['invalid expiry', { expires_at: 'invalid' }, 'token_expired', 410],
    ['missing expiry', { expires_at: null }, 'token_expired', 410],
    ['other token owner', { claimed_by: 'other-user', claimed_at: '2026-01-01T00:00:00Z' }, 'already_claimed', 409],
    ['ownerless prior claim', { claimed_at: '2026-01-01T00:00:00Z' }, 'already_claimed', 409],
  ] as const)('blocks %s before role/profile/claim mutation', async (_name, changes, reason, status) => {
    const h = harness({ tokens: [{ ...validToken(), ...changes }] }); const r = await h.run();
    expect(r.status).toBe(status); expect(r.body.reason).toBe(reason); expectNoBusinessWrites(h);
    expect(h.reads.some(x => x.table === 'verified_contractor_prospects')).toBe(false);
  });
  it.each([10, 16, 20])('rejects a %i-character prefix even with one matching row', async length => {
    const h = harness(); const r = await h.run(token.slice(0, length));
    expect(r.status).toBe(404); expectNoBusinessWrites(h);
    expect(h.reads.some(x => x.method === 'like')).toBe(false);
  });
  it('rejects colliding prefixes without resolving either prospect', async () => {
    const h = harness({ tokens: [validToken(), { ...validToken(), token: token + 'other', prospect_id: 'other-prospect' }] });
    expect((await h.run(token.slice(0, 16))).status).toBe(404); expectNoBusinessWrites(h);
  });
  it('uses an exact token even when another token shares its prefix', async () => {
    const h = harness({ tokens: [validToken(), { ...validToken(), token: token + 'other', prospect_id: 'other-prospect' }] });
    expect((await h.run(token, true)).status).toBe(200); expect(h.writes).toEqual([]);
  });
  it('fails closed on ambiguous exact lookup', async () => {
    const h = harness({ tokens: [validToken(), validToken()] }); const r = await h.run();
    expect(r.status).toBe(409); expect(r.body.reason).toBe('token_ambiguous'); expectNoBusinessWrites(h);
  });
  it('fails closed on token query errors', async () => {
    const h = harness({ tokenError: 'offline' });
    expect((await h.run()).status).toBe(503); expectNoBusinessWrites(h);
  });
  it('blocks a claim belonging to another user', async () => {
    const h = harness({ claimUser: 'other-user' }); const r = await h.run();
    expect(r.status).toBe(409); expect(r.body.reason).toBe('already_claimed'); expectNoBusinessWrites(h);
  });
  it('does not treat unreadable claim ownership as unclaimed', async () => {
    const h = harness({ claimError: true }); const r = await h.run();
    expect(r.body.reason).toBe('claim_lookup_failed'); expect(r.status).toBe(503); expectNoBusinessWrites(h);
  });
  it('rejects unauthenticated caller before token lookup', async () => {
    const h = harness({ authenticated: false }); expect((await h.run()).status).toBe(401);
    expect(h.reads.some(x => x.table === 'verified_prospect_tokens')).toBe(false); expectNoBusinessWrites(h);
  });
  it.each([null, {}, 123, '', 'x'.repeat(129)])('rejects invalid token input %j', async input => {
    const h = harness(); expect((await h.run(input)).status).toBe(400);
    expect(h.writes).toEqual([]); expect(h.reads).toEqual([]);
  });
});