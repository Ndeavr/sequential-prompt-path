// @vitest-environment node
// Isolated PostgreSQL engine; fake digest/random helpers only for fixture token plumbing.
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { validateProposalInputs, proposalClientLink } from "../proposalService";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const prospect = "33333333-3333-4333-8333-333333333333";
const affiliate = "44444444-4444-4444-8444-444444444444";
const input = { trade_primary: "Thermopompes", city: "Laval", target_monthly_appointments: 14, monthly_capacity: 14, average_project_value: 15000, close_rate_estimate: 0.4 };
async function fixture() {
 const db = new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;
 create function has_role(uuid,text) returns boolean language sql as $$ select false $$;
 create function digest(text,text) returns bytea language sql as $$select convert_to(md5($1),'UTF8')$$;
 create function gen_random_bytes(integer) returns bytea language sql as $$select convert_to(repeat('a',$1),'UTF8')$$;
 create table affiliates(id uuid,user_id uuid,referral_code text,status text);
 create table affiliate_assignments(affiliate_id uuid,prospect_id uuid,assigned_at timestamptz default now());
 create table contractors_prospects(id uuid,business_name text);
 create table affiliate_proposals(id uuid default gen_random_uuid(),affiliate_id uuid,prospect_id uuid,recommended_plan_slug text,monthly_price_cents integer,token_hash text,payload jsonb,expires_at timestamptz default now()+interval '7 days',used_at timestamptz,paid_at timestamptz,single_use boolean default false,opened_at timestamptz,created_at timestamptz default now());
 insert into affiliates values('${affiliate}','${owner}','QA-REF','active');
 insert into affiliate_assignments values('${affiliate}','${prospect}',now());
 insert into contractors_prospects values('${prospect}','Entreprise QA');
 select set_config('request.uid','${owner}',false);`);
 await db.exec(readFileSync("docs/security-staged/20261030_affiliate_proposal_drafts.sql","utf8"));
 return db;
}
describe("propositions affiliées — isolated SQL", () => {
 it("save, reload same proposal and resolve exact client attribution", async () => {
  const db=await fixture();
  try {
   const saved=await db.query<{p:any}>("select affiliate_proposal_draft('save',$1,'personnalise',$2) p",[prospect,JSON.stringify(input)]);
   const p=saved.rows[0].p;
   const reload=await db.query<{p:any}>("select affiliate_proposal_draft('get',$1) p",[prospect]);
   expect(reload.rows[0].p.id).toBe(p.id);
   expect(reload.rows[0].p.inputs).toMatchObject(input);
   const client=await db.query<{p:any}>("select resolve_affiliate_proposal_context($1) p",[p.token]);
   expect(client.rows[0].p.prospect_id).toBe(prospect); expect(client.rows[0].p.ref).toBe("QA-REF");
   const legacy=await db.query<{p:any}>("select resolve_proposal_link($1) p",[p.token]);
   expect(legacy.rows[0].p.payload.client_token).toBeUndefined();
   const again=await db.query<{p:any}>("select affiliate_proposal_draft('save',$1,'personnalise',$2) p",[prospect,JSON.stringify({...input,monthly_capacity:20})]);
   expect(again.rows[0].p.id).toBe(p.id);
  } finally {await db.close();}
 });
 it("other affiliate refused",async()=>{const db=await fixture();try {await db.exec(`select set_config('request.uid','${other}',false)`); await expect(db.query("select affiliate_proposal_draft('save',$1,'activation_350')",[prospect])).rejects.toThrow("assignment_required");}finally{await db.close();}});
 it("anonymous draft refused",async()=>{const db=await fixture();try {await db.exec("select set_config('request.uid','',false)");await expect(db.query("select affiliate_proposal_draft('get',$1)",[prospect])).rejects.toThrow("authentication_required");}finally{await db.close();}});
 it("payment flags cannot be written through draft payload",async()=>{const db=await fixture();try {await db.query("select affiliate_proposal_draft('save',$1,'activation_350',$2)",[prospect,JSON.stringify({paid_at:"2026-10-30",monthly_price_cents:1})]);const r=await db.query<any>("select paid_at,payload,monthly_price_cents from affiliate_proposals");expect(r.rows[0].paid_at).toBeNull();expect(r.rows[0].payload.inputs.paid_at).toBeUndefined();expect(r.rows[0].monthly_price_cents).toBe(0);}finally{await db.close();}});
 it("invalid and expired tokens refused",async()=>{const db=await fixture();try {await expect(db.query("select resolve_affiliate_proposal_context('bad')")).rejects.toThrow("invalid_token");const s=await db.query<any>("select affiliate_proposal_draft('save',$1,'activation_350') p",[prospect]);await db.exec("update affiliate_proposals set expires_at=now()-interval '1 minute'");await expect(db.query("select resolve_affiliate_proposal_context($1)",[s.rows[0].p.token])).rejects.toThrow("expired_or_invalid");}finally{await db.close();}});
 it("empty/zero/invalid objectives rejected before RPC",()=>{expect(()=>validateProposalInputs("personnalise",{})).toThrow();expect(()=>validateProposalInputs("personnalise",{...input,close_rate_estimate:0})).toThrow();expect(()=>validateProposalInputs("personnalise",input)).not.toThrow();});
 it("client link contains only server token, not invented attribution",()=>{const u=new URL(proposalClientLink({id:"x",prospect_id:prospect,offer_type:"activation_350",token:"a".repeat(64),ref:"QA",company_name:"QA",inputs:{},expires_at:""},"https://unpro.ca"));expect(u.pathname).toBe("/entrepreneurs/activation-350");expect(u.searchParams.get("activate")).toBe("1");expect(u.searchParams.has("ref")).toBe(false);});
});