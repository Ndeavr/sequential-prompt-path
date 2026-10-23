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
function harness(options: { token?: string; lookupError?: boolean; delivered?: boolean; prior?: boolean; denied?: boolean } = {}) {
  const calls: { name: string; body: any }[] = [];
  const writes: { table: string; value: unknown }[] = [];
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const sb = {
    from(table: string) {
      const chain: any = {};
      for (const method of ['select','eq','in','order','limit','insert','update']) {
        chain[method] = (value: unknown) => { if (method === 'insert' || method === 'update') writes.push({table,value}); return chain; };
      }
      const result = () => ({ error: table === 'verified_prospect_tokens' && options.lookupError ? { message: 'lookup failed' } : null,
        data: table === 'verified_contractor_prospects' ? { id: pid, business_name: 'Entreprise synthétique', email: 'info@example.test', outreach_status: options.delivered ? 'delivered' : 'not_started' }
        : table === 'contractor_leads' ? {id:'synthetic-lead'}
        : table === 'v_commercial_send_eligibility' ? {}
        : table === 'verified_prospect_tokens' ? {token:options.token ?? token}
        : table === 'crm_action_log' && options.prior ? {id:'prior'} : null });
      chain.maybeSingle = async () => result();
      chain.then = (resolve: any) => Promise.resolve(result()).then(resolve);
      return chain;
    },
    auth: {getUser: async () => ({data:{user:null}})},
  };
  const source = readFileSync('supabase/functions/crm-recovery-action/index.ts','utf8').replace(/^import .*;\n/gm,'');
  runInNewContext(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText, {
    Deno:{env:{get:(k:string) => k === 'SUPABASE_URL' ? 'https://example.test' : 'synthetic-service'}, serve:(fn: typeof handler) => {handler=fn;}},
    createClient:() => sb, corsHeaders:{}, emailHtml, emailText, emailSubject,
    computeContactPermissions:() => ({can_email:!options.denied,can_sms:false,reasons:{email:'missing_consent'}}),
    callCommercialSendGate:async () => ({pass:true}), gateBlockMessage:()=>'blocked',
    crypto:webcrypto, Request, Response, Date, console,
    fetch:async (url:string, init:any) => {calls.push({name:url.split('/').pop() ?? '',body:JSON.parse(init.body)});return new Response(JSON.stringify({ok:true,resend_id:'synthetic-provider'}));},
  });
  return { calls,writes,async run(action:string, auth:string | null = 'Bearer synthetic-service', dry_run=false) {
    if (!handler) throw new Error('handler missing');
    const response = await handler(new Request('https://example.test', {method:'POST',headers:auth ? {Authorization:auth} : {},body:JSON.stringify({action,prospect_ids:[pid],dry_run,payload:{channel:'email'}})}));
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
