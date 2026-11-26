// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { createQa } from './support/entry350Qa';

function stagedCheckout(source: string) {
 const patch=readFileSync('supabase/staged/pioneer-2026/checkout.patch','utf8');
 for (const hunk of patch.split(/^@@[^\n]*\n/m).slice(1)) {
  const lines=hunk.split('\n').filter(line=>line[0]===' ' || line[0]==='-' || line[0]==='+');
  const old=lines.filter(line=>line[0]!=='+').map(line=>line.slice(1)).join('\n');
  const next=lines.filter(line=>line[0]!=='-').map(line=>line.slice(1)).join('\n');
  if (!source.includes(old)) throw new Error('Staged patch does not match canonical checkout');
  source=source.replace(old,next);
 }
 return source;
}
let qa: Awaited<ReturnType<typeof createQa>> | undefined;
afterEach(async()=>{await qa?.close();qa=undefined;});
const body={entryActivation:true,declaredCompanyName:'Atelier synthétique',pioneerOffer:'pioneer_2026'};
describe('Pionnier uses canonical checkout and actual HMAC verifier, no network',()=>{
 it('unknown offer or unverified slot never creates payment',async()=>{
  qa=await createQa(true,{checkoutSource:stagedCheckout});
  const wrong=await qa.checkout('personal',{...body,pioneerOffer:'arbitrary'},qa.ownerToken);
  expect(wrong.status).toBe(400); expect(qa.sessions).toHaveLength(0);
  const pending=await qa.checkout('personal',body,qa.ownerToken);
  expect(pending.status).toBe(409); expect(qa.sessions).toHaveLength(0);
 },15000);
 it('350 plus Quebec taxes, zero default appointments; signed payment only, replay idempotent',async()=>{
  qa=await createQa(true,{checkoutSource:stagedCheckout,rpcOverride:name=>name==='reserve_pioneer_checkout' ? {data:{ok:true,member_number:2,expires_at:Math.floor(Date.now()/1000)+3600},error:null}:undefined});
  const start=await qa.checkout('personal',{...body,amount:1,price:1},qa.ownerToken);
  expect(start.status).toBe(200);
  const s=qa.sessions[0]; const cfg=qa.configs[0];
  expect([s.amount_subtotal,s.amount_total]).toEqual([35000,40241]);
  expect(cfg.mode).toBe('payment');expect(cfg.line_items[0].price_data.recurring).toBeUndefined();
  expect(s.metadata).toMatchObject({pioneer_offer:'pioneer_2026',pioneer_member_number:'2',guaranteed_appointments:'0',presence_ia_months:'12',renewal_consent:'false'});
  expect((await qa.checkout('personal',body,qa.ownerToken)).status).toBe(200);
  expect(qa.sessions).toHaveLength(1);
  expect((await qa.deliver(s,{signature:'bad'})).status).toBe(400);
  expect((await qa.db.query("SELECT * FROM contractor_activation_ledger WHERE action='entry_activation_350_paid'")).rows).toHaveLength(0);
  expect((await qa.deliver(s)).status).toBe(200);
  expect((await qa.deliver(s)).status).toBe(200);
  expect((await qa.db.query("SELECT * FROM contractor_activation_ledger WHERE action='entry_activation_350_paid'")).rows).toHaveLength(1);
 },15000);
 it('distinct 120-month offer cannot be replaced by Pionnier',async()=>{
  qa=await createQa(true,{checkoutSource:stagedCheckout});
  const r=await qa.checkout('personal',{...body,presenceOffer:'founder_120m'},qa.ownerToken);
  expect(r.status).toBe(409);expect(r.body.code).toBe('pioneer_incompatible');expect(qa.sessions).toHaveLength(0);
 },15000);
});
