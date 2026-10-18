// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createQa } from "./support/entry350Qa";
import { ENTRY350_AMOUNTS, ENTRY350_TAX_CONTRACT, ensureQuebecTaxRates, entry350TaxCollectionApproved, verifyEntry350TaxContract } from "../../supabase/functions/_shared/entry350Tax";
import { entry350PaymentBlockReason } from "../../supabase/functions/_shared/checkoutGuards";

describe("350 Quebec tax contract", () => {
  it("calculates GST and QST independently on the base", () => {
    expect(Math.round(35000 * .05)).toBe(1750);
    expect(Math.round(35000 * .09975)).toBe(3491);
    expect(ENTRY350_AMOUNTS).toEqual({ subtotal:35000,gst:1750,qst:3491,tax:5241,total:40241 });
  });
  it("LIVE checkout gate is closed by default; only a server secret opens it", async () => {
    expect(entry350TaxCollectionApproved()).toBe(false);
    expect(entry350TaxCollectionApproved('live',()=>undefined)).toBe(false);
    expect(entry350TaxCollectionApproved('live',()=> 'yes')).toBe(false);
    expect(entry350TaxCollectionApproved('live',k=>k==='ENTRY350_LIVE_CHECKOUT_RELEASED'?'true':undefined)).toBe(true);
    expect(entry350TaxCollectionApproved('test',()=>undefined)).toBe(true);
    const qa=await createQa(false);
    try {
      expect((await qa.checkout('invited',{slug:'isolated-tax'})).status).toBe(503);
      expect((await qa.checkout('personal',{entryActivation:true},qa.ownerToken)).status).toBe(503);
      expect(qa.sessions).toHaveLength(0);
      expect((await qa.db.query('select * from contractors')).rows).toHaveLength(0);
    } finally { await qa.close(); }
  }, 30000);
  it("keeps client/mode caches isolated and concurrent lookup idempotent", async () => {
    const calls:string[]=[];
    const client=(mode:string)=>({taxRates:{list:async()=>{calls.push(mode);return {data:[{id:mode+'_gst',metadata:{unpro_tax:'gst_5'},inclusive:false,percentage:5,country:'CA'},{id:mode+'_qst',metadata:{unpro_tax:'qst_9975'},inclusive:false,percentage:9.975,country:'CA',state:'QC'}]};},create:async()=>{throw new Error('must reuse');}}});
    const test=client('test'),live=client('live');
    expect(await Promise.all([ensureQuebecTaxRates(test),ensureQuebecTaxRates(test),ensureQuebecTaxRates(live)])).toEqual([['test_gst','test_qst'],['test_gst','test_qst'],['live_gst','live_qst']]);
    expect(calls).toEqual(['test','live']);
  });
  for(const offer of ['entry_activation_350','entry_pack_350']) {
    const session={payment_status:'paid',mode:'payment',currency:'cad',amount_subtotal:35000,amount_total:40241,total_details:{amount_tax:5241},metadata:{offer,entry_tax_contract:ENTRY350_TAX_CONTRACT}};
    it(`${offer} requires exact taxed total, never zero/coupon/double tax`,()=>{
      expect(entry350PaymentBlockReason(session)).toBeNull();
      for(const change of [{amount_total:0},{amount_total:35000},{amount_total:40240},{amount_total:45482,total_details:{amount_tax:10482}},{total_details:{amount_tax:0}},{payment_status:'no_payment_required'},{mode:'subscription'},{currency:'usd'}]) expect(entry350PaymentBlockReason({...session,...change})).not.toBeNull();
    });
  }
  it("both actual creators emit exclusive lines, same version, billing preserves subtotal separately",async()=>{
    const qa=await createQa();
    try {
      expect((await qa.checkout('personal',{entryActivation:true},qa.ownerToken)).status).toBe(200);
      expect((await qa.checkout('invited',{slug:'isolated-tax'})).status).toBe(200);
      for(const config of qa.configs) {
        expect(config.mode).toBe('payment'); expect(config.line_items).toHaveLength(1);
        expect(config.line_items[0].price_data.unit_amount).toBe(35000);
        expect(config.line_items[0].tax_rates).toEqual(['tax_gst','tax_qst']);
        expect(config.metadata.entry_tax_contract).toBe(ENTRY350_TAX_CONTRACT);
        expect(config.automatic_tax).toBeUndefined(); expect(config.discounts).toBeUndefined();
      }
      for(const session of qa.sessions) expect(session.amount_total).toBe(40241);
      const billing=qa.peripheral.get('billing_checkout_sessions') ?? [];
      expect(billing).toHaveLength(1); expect(billing[0].amount_total).toBe(40241);
      expect(billing[0].metadata_json.amount_subtotal).toBe(35000);
    } finally {await qa.close();}
  });
  it("authenticated Stripe read hydrates an old-version payload, rejects fake mode/rates and replay",async()=>{
    const signed:any={id:'cs_isolated',payment_status:'paid',amount_subtotal:35000,amount_total:40241,metadata:{offer:'entry_pack_350',entry_tax_contract:ENTRY350_TAX_CONTRACT}};
    const retrieved={...signed,livemode:true,total_details:{amount_tax:5241,amount_discount:0}};
    const line:any={quantity:1,currency:'cad',amount_subtotal:35000,amount_total:40241,amount_discount:0,amount_tax:5241,taxes:[{amount:1750,rate:{metadata:{unpro_tax:'gst_5'},percentage:5,inclusive:false,country:'CA'}},{amount:3491,rate:{metadata:{unpro_tax:'qst_9975'},percentage:9.975,inclusive:false,country:'CA',state:'QC'}}]};
    const stripe={checkout:{sessions:{retrieve:async()=>retrieved,listLineItems:async()=>({data:[line],has_more:false})}}};
    expect((await verifyEntry350TaxContract(stripe,signed,true,false)).total_details.amount_tax).toBe(5241);
    await expect(verifyEntry350TaxContract(stripe,signed,false,false)).rejects.toThrow('mismatch');
    await expect(verifyEntry350TaxContract(stripe,signed,true,true)).rejects.toThrow('unverified');
    line.taxes[1].rate.percentage=10;
    await expect(verifyEntry350TaxContract(stripe,signed,true,false)).rejects.toThrow('rate_mismatch');
  });
});