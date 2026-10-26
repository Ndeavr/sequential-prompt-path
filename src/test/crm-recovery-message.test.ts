import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { emailHtml, emailText, emailSubject, OFFER } from '../../supabase/functions/_shared/offerCopy';
import { OFFER_350 } from '../lib/copy/offer350';

const actions = ['send_email', 'onboarding_email', 'payment_email', 'send_activation_link'];
const token = 'synthetic0123456789abcdef';
const pid = '00000000-0000-4000-8000-000000000001';
function harness(options: { token?: string; expires_at?: string; revoked_at?: string; lookupError?: boolean; delivered?: boolean; prior?: boolean; denied?: boolean; admin?: boolean; claimed?: boolean; paid?: boolean; activated?: boolean; suppressed?: boolean; optedOut?: boolean; missingToken?: boolean; gateOff?: boolean } = {}) {
  const calls: { name: string; body: any }[] = [];
  const writes: { table: string; value: unknown }[] = [];
  const reads: { table: string; method: string; value: unknown; match?: unknown }[] = [];
  let gateCalls = 0;
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const sb = {
    from(table: string) {
      const chain: any = {};
      for (const method of ['select','eq','in','order','limit','insert','update']) {
        chain[method] = (value: unknown, match?: unknown) => { if (method === 'insert' || method === 'update') writes.push({table,value}); else reads.push({table,method,value,...(method==='eq' ? {match} : {})}); return chain; };
      }
      const result = () => ({ error: table === 'verified_prospect_tokens' && options.lookupError ? { message: 'lookup failed' } : null,
        data: table === 'verified_contractor_prospects' ? { id: pid, business_name: 'Entreprise synthétique', email: 'info@example.test', paid_at:options.paid ? '2026-01-01' : null, profile_active_at:options.activated ? '2026-01-01' : null, outreach_status: options.delivered ? 'delivered' : 'not_started' }
        : table === 'contractor_leads' ? {id:'synthetic-lead',do_not_contact:options.suppressed,unsubscribed_at:options.optedOut ? '2026-01-01' : null}
        : table === 'v_commercial_send_eligibility' ? {}
        : table === 'verified_prospect_tokens' ? (options.missingToken ? null : {token:options.token ?? token, expires_at:options.expires_at, revoked_at:options.revoked_at,claimed_at:options.claimed ? '2026-01-01T00:00:00Z' : null})
        : table === 'user_roles' && options.admin ? [{role:'admin'}]
        : table === 'crm_action_log' && options.prior ? {id:'prior'} : null });
      chain.maybeSingle = async () => result();
      chain.then = (resolve: any) => Promise.resolve(result()).then(resolve);
      return chain;
    },
    auth: {getUser: async () => ({data:{user:options.admin ? {id:'synthetic-admin'} : null}})},
  };
  const source = readFileSync('supabase/functions/crm-recovery-action/index.ts','utf8').replace(/^import .*;\n/gm,'');
  runInNewContext(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText, {
    Deno:{env:{get:(k:string) => k === 'SUPABASE_URL' ? 'https://example.test' : 'synthetic-service'}, serve:(fn: typeof handler) => {handler=fn;}},
    createClient:() => sb, corsHeaders:{}, emailHtml, emailText, emailSubject,
    computeContactPermissions:() => ({can_email:!options.denied,can_sms:false,reasons:{email:'missing_consent'}}),
    callCommercialSendGate:async () => {gateCalls++;return {pass:!options.gateOff};}, gateBlockMessage:()=>'blocked',
    crypto:webcrypto, Request, Response, Date, console,
    fetch:async (url:string, init:any) => {calls.push({name:url.split('/').pop() ?? '',body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true,resend_id:'synthetic-provider'}));},
  });
  return { calls,writes,reads,get gateCalls(){return gateCalls;},async run(action:string, auth:string | null = 'Bearer synthetic-service', dry_run=false, source='manual') {
    if (!handler) throw new Error('handler missing');
    const response = await handler(new Request('https://example.test', {method:'POST',headers:auth ? {Authorization:auth} : {},body:JSON.stringify({action,prospect_ids:[pid],source,dry_run,payload:{channel:'email'}})}));
    return {status:response.status,body:await response.json()};
  }};
}

describe('actual CRM entry-activation branches — synthetic adapters only', () => {
  it.each(actions)('%s uses the canonical base offer and exact personal link', async action => {
    const h=harness(); const r=await h.run(action);
    expect(r.body.succeeded).toBe(1);
    expect(h.calls).toHaveLength(1);
    const sent=h.calls[0];
    expect(sent.name).toBe('outreach-resend-send');
    expect(sent.body.cta_url).toBe(`https://unpro.ca/unpro/activate/${token}`);
    expect(sent.body.html).toBe(emailHtml('Entreprise synthétique',sent.body.cta_url));
    expect(sent.body.text).toBe(emailText('Entreprise synthétique',sent.body.cta_url));
    expect(sent.body.purpose).toBe('commercial_outreach');
    expect(sent.body.campaign).toBe('crm_activation_350');
    expect(OFFER.price_cents).toBe(35000);
    expect(OFFER_350.max_appointments).toBe(0);
    expect(OFFER.payment_note).toContain('TPS 17,50 $ + TVQ 34,91 $ = 402,41 $');
  });
  it.each(actions)('%s never re-invites a recorded delivered prospect', async action => {
    const h=harness({delivered:true}); const r=await h.run(action);
    expect(r.body.results[0].result).toBe('already_delivered'); expect(h.calls).toHaveLength(0);expect(h.writes).toHaveLength(0);
  });
  it.each(['bad" onclick="x','../other','short'])('invalid stored token %s blocks before sending', async token => {
    const h=harness({token});const r=await h.run('send_email');
    expect(r.body.results[0].result).toBe('invalid_activation_token');expect(h.calls).toHaveLength(0);
    expect(h.writes.filter(w=>w.table==='verified_prospect_tokens')).toHaveLength(0);
  });
  it('failed token lookup never creates a replacement or sends',async()=>{
    const h=harness({lookupError:true});const r=await h.run('send_email');
    expect(r.body.results[0].result).toBe('token_lookup_failed');expect(h.calls).toHaveLength(0);
    expect(h.writes.filter(w=>w.table==='verified_prospect_tokens')).toHaveLength(0);
  });
  it.each([{expires_at:'2000-01-01T00:00:00Z'},{expires_at:'invalid'},{revoked_at:'2026-01-01T00:00:00Z'}])('inactive token blocks without replacement',async options=>{
    const h=harness(options);expect((await h.run('send_email')).body.results[0].result).toBe('inactive_activation_token');
    expect(h.calls).toHaveLength(0);expect(h.writes.filter(w=>w.table==='verified_prospect_tokens')).toHaveLength(0);
  });
  it('anonymous requests are 401 with no writes or calls',async()=>{
    const h=harness();expect((await h.run('send_email',null)).status).toBe(401);expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);
  });
  it('missing canonical contact permission blocks every email branch',async()=>{
    for(const action of actions){const h=harness({denied:true});expect((await h.run(action)).body.failed).toBe(1);expect(h.calls).toHaveLength(0);}
  });
  it('same-day completed action skips without another send',async()=>{
    const h=harness({prior:true});expect((await h.run('send_email')).body.results[0].result).toBe('duplicate_same_day');expect(h.calls).toHaveLength(0);
  });
  it('dry run creates no token, log or provider call',async()=>{
    const h=harness();expect((await h.run('send_email','Bearer synthetic-service',true)).body.results[0].status).toBe('dry_run');expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);
  });
});

describe('active renewal stop — actual handler, no transaction workaround',()=>{
  it.each([
    {expires_at:'2000-01-01T00:00:00Z'},
    {revoked_at:'2026-01-01T00:00:00Z'},
    {expires_at:'2099-01-01T00:00:00Z'},
    {claimed:true}, {paid:true}, {activated:true}, {optedOut:true}, {suppressed:true}, {denied:true}, {lookupError:true}, {missingToken:true},
  ])('admin renewal remains blocked with zero reads-dependent mutations or sends: %j',async state=>{
    const h=harness({...state,admin:true});
    const r=await h.run('new_checkout','Bearer synthetic-admin');
    expect(r.status).toBe(423); expect(r.body.error).toBe('atomic_token_renewal_unavailable');
    expect(h.writes).toHaveLength(0); expect(h.calls).toHaveLength(0);
    expect(h.reads.every(r=>r.table==='user_roles')).toBe(true);expect(h.gateCalls).toBe(0);
  });
  it('service/background request cannot masquerade as an explicit admin renewal',async()=>{
    const h=harness(); expect((await h.run('new_checkout')).status).toBe(403);
    expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);
  });
  it('unauthorized renewal is rejected before any effect',async()=>{
    const h=harness();expect((await h.run('new_checkout',null)).status).toBe(401);
    expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);
  });
  it('parallel admin retries cannot create two valid tokens or audit false success',async()=>{
    const h=harness({admin:true});
    const results=await Promise.all([h.run('new_checkout','Bearer synthetic-admin'),h.run('new_checkout','Bearer synthetic-admin')]);
    expect(results.map(r=>r.status)).toEqual([423,423]);expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);
  });
  it('admin automation and dry-run never mint or claim a link',async()=>{
    const h=harness({admin:true});
    expect((await h.run('new_checkout','Bearer synthetic-admin',false,'automation')).status).toBe(403);
    expect((await h.run('new_checkout','Bearer synthetic-admin',true)).status).toBe(423);
    expect(h.writes).toHaveLength(0);expect(h.calls).toHaveLength(0);expect(h.gateCalls).toBe(0);
  });
  it.each([...actions,'resume_checkout','payment_sms','second_sms'])('%s cannot implicitly mint a missing token',async action=>{
    const h=harness({missingToken:true});const r=await h.run(action);
    // SMS fails at its contact guard; other branches reach read-only resolution.
    expect(r.body.failed).toBe(1);expect(h.calls).toHaveLength(0);
    expect(h.writes.every(w=>w.table==='crm_action_log')).toBe(true);
    if(!['payment_sms','second_sms'].includes(action)) expect(r.body.results[0].result).toBe('atomic_token_creation_unavailable');
  });
  it('resume preserves the exact stored prospect attribution and token without mutation',async()=>{
    const h=harness();const r=await h.run('resume_checkout');
    expect(r.body.results[0].result).toBe(`https://unpro.ca/unpro/activate/${token}`);
    expect(h.reads).toContainEqual({table:'verified_prospect_tokens',method:'eq',value:'prospect_id',match:pid});
    expect(h.writes.every(w=>w.table==='crm_action_log')).toBe(true);expect(h.calls).toHaveLength(0);
  });
  it.each(actions)('closed commercial gate blocks %s without token mutations or provider calls',async action=>{
    const h=harness({gateOff:true});const r=await h.run(action);
    expect(r.body.failed).toBe(1);expect(h.calls).toHaveLength(0);
    expect(h.reads.some(r=>r.table==='verified_prospect_tokens')).toBe(false);
    expect(h.writes.every(w=>w.table==='crm_action_log')).toBe(true);
  });
});
