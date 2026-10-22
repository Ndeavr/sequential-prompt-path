// @vitest-environment node
import { describe,it,expect,beforeEach,afterEach } from 'vitest';
import { createQa,OWNER,OTHER } from './support/entry350Qa';
let qa:Awaited<ReturnType<typeof createQa>>;
const Q='00000000-0000-4000-8000-000000000010';
beforeEach(async()=>{qa=await createQa();await qa.db.query(`insert into contractor_pricing_quotes(id,user_id,company_name,city,trade_primary,input_payload) values($1,$2,'Atelier local','Laval','Cuisine','{}')`,[Q,OWNER]);},15000);
afterEach(async()=>{await qa.close();});
async function plan(token=qa.ownerToken,target=OWNER){const r=await qa.queryAs(token,'select contractor_plan_code($1) plan',[target]);return r.rows[0].plan;}
async function create(kind:'personal'|'invited'){
  const result=kind==='personal'?await qa.checkout(kind,{entryActivation:true,quoteId:Q,ref:'LOCAL-QA',successUrl:'http://localhost:8080/entrepreneur/plan-personnalise/'+Q+'?ref=LOCAL-QA&session_id={CHECKOUT_SESSION_ID}',cancelUrl:'http://localhost:8080/entrepreneur/plan-personnalise/'+Q+'?ref=LOCAL-QA&checkout=canceled'},qa.ownerToken):await qa.checkout(kind,{slug:'local-qa',email:'owner-two@qa.invalid',test_mode:true});
  expect(result.status).toBe(200);return qa.sessions[qa.sessions.length-1];
}
describe('isolated SQL/session safety',()=>{
  it('identical entry350 retries reuse one Stripe session before any payment', async()=>{
    const first=await create('personal');
    const retry=await create('personal');
    expect(retry.id).toBe(first.id);
    expect(qa.sessions).toHaveLength(1);
    expect(qa.configs).toHaveLength(1);
    expect(await plan()).toBeNull();
    expect((await qa.db.query('select * from contractor_activation_ledger')).rows).toHaveLength(0);
  });
  it('two signed synthetic sessions, invalid token/anon denied and owner quote RLS enforced',async()=>{
    expect((await qa.queryAs(qa.ownerToken,'select * from contractor_pricing_quotes')).rows).toHaveLength(1);
    expect((await qa.queryAs(qa.otherToken,'select * from contractor_pricing_quotes')).rows).toHaveLength(0);
    await expect(qa.queryAs(null,'select contractor_plan_code($1)',[OWNER])).rejects.toThrow(/permission denied/);
    await expect(qa.queryAs(qa.ownerToken,'insert into user_roles values($1,\'admin\')',[OWNER])).rejects.toThrow();
    expect((await qa.checkout('personal',{entryActivation:true,quoteId:Q},qa.otherToken)).status).toBe(403);
    expect((await qa.checkout('personal',{entryActivation:true,quoteId:Q})).status).toBe(401);
    expect((await qa.checkout('personal',{entryActivation:true,quoteId:Q},qa.ownerToken+'bad')).status).toBe(401);
  });
  it('HMAC missing/bad and TEST signature on fake LIVE rejected before receipt writes',async()=>{
    const s=await create('personal');
    for(const signature of ['missing','bad','test'] as const)expect((await qa.deliver(s,{signature})).status).toBe(400);
    expect((await qa.db.query('select * from stripe_webhook_events')).rows).toHaveLength(0);
    expect(await plan()).toBeNull();
  });
});
describe.each(['personal','invited'] as const)('%s actual creation → signed handler → real SQL RLS/resolver',kind=>{
  it('paid receipt grants only presence, duplicate does not extend, refund+dispute revoke',async()=>{
    const s=await create(kind);const target=kind==='personal'?OWNER:OTHER;const token=kind==='personal'?qa.ownerToken:qa.otherToken;
    expect(s.mode).toBe('payment');expect(s.currency).toBe('cad');expect(s.amount_subtotal).toBe(35000);
    expect(s.amount_total).toBe(40241);
    expect(qa.configs[0].discounts).toBeUndefined();
    expect((await qa.deliver(s)).status).toBe(200);
    expect(await plan(token,target)).toBe('presence');
    const receipt=await qa.db.query<any>("select * from contractor_activation_ledger where action='entry_activation_350_paid'");
    expect(receipt.rows).toHaveLength(1);
    expect((await qa.deliver(s)).body.duplicate).toBe(true);
    const again=await qa.db.query<any>("select * from contractor_activation_ledger where action='entry_activation_350_paid'");
    expect(again.rows[0].created_at).toEqual(receipt.rows[0].created_at);
    expect((await qa.queryAs(kind==='personal'?qa.otherToken:qa.ownerToken,'select contractor_plan_code($1) plan',[target])).rows[0].plan).toBeNull();
    expect((await qa.queryAs(token,'select * from contractor_activation_ledger')).rows).toHaveLength(0);
    expect((await qa.deliver(s,{eventId:'evt_refund',type:'charge.refunded',object:{id:'ch_local',payment_intent:s.payment_intent,refunded:true}})).status).toBe(200);
    expect(await plan(token,target)).toBeNull();
    expect((await qa.deliver(s,{eventId:'evt_dispute',type:'charge.dispute.created',object:{id:'dp_local',payment_intent:s.payment_intent}})).status).toBe(200);
    expect((await qa.db.query("select * from contractor_activation_ledger where action='deactivated'")).rows).toHaveLength(1);
  });
  it('TEST signed paid fixture never grants production presence',async()=>{
    const s=await create(kind);expect((await qa.deliver(s,{live:false,signature:'test'})).status).toBe(200);
    expect(await plan(kind==='personal'?qa.ownerToken:qa.otherToken,kind==='personal'?OWNER:OTHER)).toBeNull();
  });
  it('rejects free/unpaid and invalid amount/mode/currency before activation',async()=>{
    const s=await create(kind);
    const variants=[{payment_status:'no_payment_required',amount_total:0},{payment_status:'unpaid'},{amount_total:0},{amount_subtotal:100},{currency:'usd'},{mode:'subscription'}];
    for(const [i,v] of variants.entries()){
      const r=await qa.deliver(s,{eventId:`evt_invalid_${i}`,object:{...s,status:'complete',payment_status:'paid',...v}});
      expect(r.body.ignored).toMatch(/^ignored_/);
    }
    expect((await qa.db.query("select * from contractor_activation_ledger where action='entry_activation_350_paid'")).rows).toHaveLength(0);
    expect(await plan()).toBeNull();
  });
  it('async success, 12-month earliest expiry and subscription priority',async()=>{
    const s=await create(kind);const target=kind==='personal'?OWNER:OTHER;const token=kind==='personal'?qa.ownerToken:qa.otherToken;
    expect((await qa.deliver(s,{type:'checkout.session.async_payment_succeeded'})).status).toBe(200);
    expect(await plan(token,target)).toBe('presence');
    await qa.db.exec("update contractor_activation_ledger set created_at=now()-interval '12 months'-interval '1 second' where action='entry_activation_350_paid'");
    expect(await plan(token,target)).toBeNull();
    const c=(await qa.db.query<any>('select id from contractors where user_id=$1',[target])).rows[0].id;
    await qa.db.query("insert into contractor_subscriptions(contractor_id,plan_id,status) values($1,'pro','active')",[c]);
    expect(await plan(token,target)).toBe('pro');
    expect((await qa.queryAs(token,'select * from contractor_subscriptions')).rows).toHaveLength(1);
    expect((await qa.queryAs(kind==='personal'?qa.otherToken:qa.ownerToken,'select * from contractor_subscriptions')).rows).toHaveLength(0);
  });
  it('owner entitlements visible, other owner and anon blocked by actual SQL privileges/RLS',async()=>{
    const s=await create(kind);await qa.deliver(s);
    const target=kind==='personal'?OWNER:OTHER;const token=kind==='personal'?qa.ownerToken:qa.otherToken;
    const c=(await qa.db.query<any>('select id from contractors where user_id=$1',[target])).rows[0].id;
    await qa.db.query("insert into contractor_entitlements values($1,'qa-read-probe')",[c]);
    expect((await qa.queryAs(token,'select * from contractor_entitlements')).rows).toHaveLength(1);
    expect((await qa.queryAs(kind==='personal'?qa.otherToken:qa.ownerToken,'select * from contractor_entitlements')).rows).toHaveLength(0);
    await expect(qa.queryAs(null,'select * from contractor_entitlements')).rejects.toThrow(/permission denied/);
    expect((await qa.db.query<{allowed:boolean}>("select has_function_privilege('anon','contractor_plan_code(uuid)','EXECUTE') allowed")).rows[0].allowed).toBe(false);
  });
});
describe.each(['personal','invited'] as const)('%s — fenêtre exacte des 12 mois, sans publication',kind=>{
  it('présence valide juste avant +12 mois, expirée juste après; profil privé, aucun abonnement',async()=>{
    const s=await create(kind);const target=kind==='personal'?OWNER:OTHER;const token=kind==='personal'?qa.ownerToken:qa.otherToken;
    expect((await qa.deliver(s)).status).toBe(200);
    expect(await plan(token,target)).toBe('presence');
    await qa.db.query("update contractor_activation_ledger set created_at=now()-interval '12 months'+interval '1 hour' where action='entry_activation_350_paid'");
    expect(await plan(token,target)).toBe('presence');
    await qa.db.query("update contractor_activation_ledger set created_at=now()-interval '12 months'-interval '1 hour' where action='entry_activation_350_paid'");
    expect(await plan(token,target)).toBeNull();
    expect((await qa.db.query('select * from contractor_subscriptions')).rows).toHaveLength(0);
    for(const row of (await qa.db.query<any>('select is_published,is_discoverable,verification_status from contractors')).rows){
      expect(row.is_published).not.toBe(true);expect(row.is_discoverable).not.toBe(true);expect(row.verification_status).not.toBe('verified');
    }
    // Isolation : l'autre compte ne voit pas ce droit.
    const other=kind==='personal'?qa.otherToken:qa.ownerToken;
    expect(await plan(other,target)).toBeNull();
  });
});
describe('invited receipt retry',()=>{
  it('failed ledger delivery stays failed, retry grants presence without permanent subscription',async()=>{
    const s=await create('invited');qa.failNext('contractor_activation_ledger');
    expect((await qa.deliver(s)).status).toBe(500);
    expect((await qa.db.query('select * from contractor_subscriptions')).rows).toHaveLength(0);
    expect((await qa.deliver(s)).status).toBe(200);
    expect(await plan(qa.otherToken,OTHER)).toBe('presence');
    expect((await qa.db.query("select * from contractor_activation_ledger where action='entry_activation_350_paid'")).rows).toHaveLength(1);
    expect((await qa.db.query('select * from contractor_subscriptions')).rows).toHaveLength(0);
    // Paid != verified: payment never publishes nor makes the profile discoverable.
    expect(qa.calls).not.toContain('activate_contractor_unified');
    const c=(await qa.db.query<any>('select * from contractors')).rows;
    for(const row of c){ if('is_discoverable' in row) expect(row.is_discoverable).not.toBe(true); if('is_published' in row) expect(row.is_published).not.toBe(true); }
  });
});
describe('personalized interrupted recovery/attribution',()=>{
  it('personalized referral token never falls through into invited activation/subscription',async()=>{
    qa.peripheral.set('verified_prospect_tokens',[{token:'local-referral-token',prospect_id:'00000000-0000-4000-8000-000000000020',expires_at:new Date(Date.now()+3600000).toISOString()}]);
    const r=await qa.checkout('personal',{entryActivation:true,quoteId:Q,activationToken:'local-referral-token'},qa.ownerToken);
    expect(r.status).toBe(200);
    expect((await qa.deliver(qa.sessions[0])).status).toBe(200);
    expect(await plan()).toBe('presence');
    expect((await qa.db.query('select * from contractor_subscriptions')).rows).toHaveLength(0);
    expect(qa.calls).not.toContain('activate_contractor_unified');
    expect(qa.calls).not.toContain('record_engagement_event');
  });
  it('role failure retries same signed event with one original receipt and quote ownership preserved',async()=>{
    const s=await create('personal');qa.failNext('user_roles');
    expect((await qa.deliver(s)).status).toBe(500);
    expect((await qa.db.query("select * from contractor_activation_ledger where action='entry_activation_350_paid'")).rows).toHaveLength(1);
    expect((await qa.deliver(s)).status).toBe(200);
    expect((await qa.db.query("select * from contractor_activation_ledger where action='entry_activation_350_paid'")).rows).toHaveLength(1);
    expect((await qa.queryAs(qa.ownerToken,'select pricing_status from contractor_pricing_quotes')).rows[0].pricing_status).toBe('paid');
    expect(qa.configs[0].cancel_url).toContain('ref=LOCAL-QA');
    expect(qa.configs[0].metadata.ref).toBeUndefined(); // ref non résolu à une affiliée active : jamais écrit pour la commission
    expect(await plan()).toBe('presence');
  });
});