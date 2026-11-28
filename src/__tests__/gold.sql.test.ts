// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, expect, test } from 'vitest';
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
beforeAll(async () => {
 await db.exec(`CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('qa.uid',true),'')::uuid$$;
 CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT $1='${id(9999)}'::uuid AND $2='admin'$$;
 CREATE TABLE contractors(id uuid PRIMARY KEY,user_id uuid,public_status text,account_status text,activation_status text);
 GRANT SELECT(id,public_status) ON contractors TO anon; GRANT SELECT ON contractors TO authenticated;
 CREATE TABLE contractor_activation_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contractor_id uuid,action text,source text,metadata jsonb,created_at timestamptz DEFAULT now());
 CREATE TABLE stripe_webhook_events(stripe_event_id text PRIMARY KEY,event_type text,livemode boolean,success boolean,processed_at timestamptz,payload jsonb);`);
 await db.exec(readFileSync(new URL('../../supabase/staged/unpro-gold/migration.sql',import.meta.url),'utf8'));
 await db.query(`INSERT INTO contractors VALUES($1,$1,'verified_active','active','activated')`,[id(1)]);
 await db.query(`UPDATE contractor_gold_config SET status='active',pilot_contractor_id=$1`,[id(1)]);
},30000);
afterAll(async () => db.close());
beforeEach(async () => { await db.exec('RESET ROLE'); });
async function receipt(n:number, live=true, verified=true, suffix='') {
 const cid=id(n); const event=`evt_synthetic_${n}${suffix}`; const sid=`cs_synthetic_${n}${suffix}`;
 await db.query(`INSERT INTO contractors VALUES($1,$1,$2,'active','activated') ON CONFLICT DO NOTHING`,[cid,verified?'verified_active':'published_pending_verification']);
 const payload={data:{object:{id:sid,currency:'cad',payment_status:'paid',amount_total:40241,metadata:{contractor_id:cid}}}};
 await db.query(`INSERT INTO stripe_webhook_events VALUES($1,'checkout.session.completed',$2,false,null,$3)`,[event,live,JSON.stringify(payload)]);
 await db.query(`INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES($1,'entry_activation_350_paid','stripe_webhook',$2)`,[cid,JSON.stringify({stripe_event_id:event,stripe_session_id:sid,livemode:live,amount_cents:40241,amount_discount_cents:0})]);
 return event;
}
async function finish(event:string) { await db.query(`UPDATE stripe_webhook_events SET success=true,processed_at=now() WHERE stripe_event_id=$1`,[event]); }
async function members() {return (await db.query<{contractor_id:string;member_number:number;status:string}>(`SELECT contractor_id,member_number,status FROM contractor_gold_memberships ORDER BY member_number`)).rows;}
test('signed processed LIVE + verified activation only; pilot #000001; idempotent webhook',async()=>{
 const e=await receipt(1); expect(await members()).toEqual([]); await finish(e); await finish(e);
 expect(await members()).toEqual([{contractor_id:id(1),member_number:1,status:'active'}]);
 expect((await db.query(`SELECT count(*)::int n FROM contractor_gold_events`)).rows[0]).toEqual({n:1});
});
test('TEST never allocates',async()=>{await finish(await receipt(2,false));expect((await members()).some(m=>m.contractor_id===id(2))).toBe(false);});
test('paid but not verified waits for real verification transition',async()=>{
 await finish(await receipt(3,true,false));expect((await members()).some(m=>m.contractor_id===id(3))).toBe(false);
 await db.query(`UPDATE contractors SET public_status='verified_active' WHERE id=$1`,[id(3)]);
 expect((await members()).find(m=>m.contractor_id===id(3))?.member_number).toBe(2);
});
test('competing attribution requests get unique numbers; repeated receipts stay idempotent',async()=>{
 const events=await Promise.all([receipt(4),receipt(5)]);await Promise.all(events.map(finish));
 const rows=await members();expect(rows.map(m=>m.member_number)).toEqual([1,2,3,4]);
 await Promise.all(events.map(finish));expect((await members()).length).toBe(4);
});
test('refund hides GOLD permanently, preserves number + audit; no recycling',async()=>{
 await db.query(`INSERT INTO stripe_webhook_events VALUES('evt_refund','charge.refunded',true,false,null,'{}')`);
 await db.query(`INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES($1,'deactivated','stripe_webhook','{"stripe_event_id":"evt_refund","livemode":true}')`,[id(4)]);
 expect((await members()).find(m=>m.contractor_id===id(4))).toMatchObject({member_number:3,status:'refunded'});
 await expect(db.query(`UPDATE contractor_gold_memberships SET status='active' WHERE contractor_id=$1`,[id(4)])).rejects.toThrow('gold_number_immutable');
 await finish(await receipt(6));expect((await members()).find(m=>m.contractor_id===id(6))?.member_number).toBe(5);
});
test('immutable number/owner/date and deletion prohibited',async()=>{
 await expect(db.exec(`UPDATE contractor_gold_memberships SET member_number=99 WHERE member_number=1`)).rejects.toThrow('gold_number_immutable');
 await expect(db.exec(`DELETE FROM contractor_gold_memberships WHERE member_number=1`)).rejects.toThrow('gold_history_immutable');
});
test('duplicate paid sessions before activation never allocate',async()=>{
 const e=await receipt(7,true,false);await finish(e);await finish(await receipt(7,true,false,'_duplicate'));
 await db.query(`UPDATE contractors SET public_status='verified_active' WHERE id=$1`,[id(7)]);
 expect((await members()).some(m=>m.contractor_id===id(7))).toBe(false);
});
test('unpaid or wrong currency never qualifies even if journal marked processed',async()=>{
 const unpaid=await receipt(20);await db.query(`UPDATE stripe_webhook_events SET payload=jsonb_set(payload,'{data,object,payment_status}','"unpaid"') WHERE stripe_event_id=$1`,[unpaid]);await finish(unpaid);
 const usd=await receipt(21);await db.query(`UPDATE stripe_webhook_events SET payload=jsonb_set(payload,'{data,object,currency}','"usd"') WHERE stripe_event_id=$1`,[usd]);await finish(usd);
 expect((await members()).filter(m=>[id(20),id(21)].includes(m.contractor_id))).toEqual([]);
});
test('draft configuration cannot invent a counter or grant memberships',async()=>{
 await db.exec(`UPDATE contractor_gold_config SET status='draft'`);
 expect((await db.query<{v:{available:number|null}}>(`SELECT gold_availability() v`)).rows[0].v.available).toBeNull();
 await finish(await receipt(22));expect((await members()).some(m=>m.contractor_id===id(22))).toBe(false);
 await db.exec(`UPDATE contractor_gold_config SET status='active'`);
});
test('RLS visitor sees active public only; owner sees refund, other user cannot; admin sees audit; no client write/RPC',async()=>{
 await db.exec(`SET ROLE anon`);
 expect((await db.query(`SELECT member_number FROM contractor_gold_memberships WHERE status='refunded'`)).rows).toEqual([]);
 await expect(db.exec(`INSERT INTO contractor_gold_memberships VALUES('${id(8)}',8,'active',now(),now(),now())`)).rejects.toThrow('permission denied');
 await expect(db.exec(`SELECT sync_contractor_gold('${id(8)}')`)).rejects.toThrow('permission denied');
 await db.exec(`RESET ROLE; SET ROLE authenticated`);
 await db.query(`SELECT set_config('qa.uid',$1,false)`,[id(4)]);
 expect((await db.query(`SELECT member_number FROM contractor_gold_memberships WHERE status='refunded'`)).rows).toEqual([{member_number:3}]);
 await db.query(`SELECT set_config('qa.uid',$1,false)`,[id(8)]);
 expect((await db.query(`SELECT member_number FROM contractor_gold_memberships WHERE status='refunded'`)).rows).toEqual([]);
 expect((await db.query(`SELECT * FROM contractor_gold_events`)).rows).toEqual([]);
 await db.query(`SELECT set_config('qa.uid',$1,false)`,[id(9999)]);
 expect((await db.query(`SELECT * FROM contractor_gold_events`)).rows.length).toBeGreaterThan(0);
 await db.exec('RESET ROLE');
});
test('limit 1000, real available counter includes refunds, never number 1001',async()=>{
 await db.exec(`INSERT INTO contractors SELECT ('00000000-0000-4000-8000-'||lpad(s::text,12,'0'))::uuid,null,'verified_active','active','activated' FROM generate_series(10006,11000) s;
 INSERT INTO contractor_gold_memberships(contractor_id,member_number,status,joined_at) SELECT ('00000000-0000-4000-8000-'||lpad((s+10000)::text,12,'0'))::uuid,s,'active',now() FROM generate_series(6,1000) s;`);
 await finish(await receipt(9));expect((await members()).some(m=>m.contractor_id===id(9))).toBe(false);
 expect((await db.query<{v:{available:number}}>(`SELECT gold_availability() v`)).rows[0].v.available).toBe(0);
 await expect(db.query(`INSERT INTO contractor_gold_memberships(contractor_id,member_number,status,joined_at) VALUES($1,1001,'active',now())`,[id(9)])).rejects.toThrow();
});
