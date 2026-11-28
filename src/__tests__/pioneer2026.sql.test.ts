// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, expect, test } from 'vitest';
const db = new PGlite();
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
beforeAll(async () => {
 await db.exec(`CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('qa.uid',true),'')::uuid$$;
 CREATE FUNCTION has_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT $1='${id(9999)}'::uuid AND $2='admin'$$;
 CREATE TABLE contractors(id uuid PRIMARY KEY,user_id uuid,public_status text,account_status text,activation_status text);
 GRANT SELECT(id,public_status) ON contractors TO anon; GRANT SELECT ON contractors TO authenticated;
 CREATE TABLE contractor_activation_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contractor_id uuid,action text,source text,metadata jsonb,created_at timestamptz DEFAULT now());
 CREATE TABLE stripe_webhook_events(stripe_event_id text PRIMARY KEY,event_type text,livemode boolean,success boolean,processed_at timestamptz,payload jsonb);
 CREATE TABLE contractor_checkout_reservations(id uuid PRIMARY KEY,contractor_id uuid,stripe_mode text,kind text,includes_presence boolean,quote_id text,status text,stripe_session_id text,session_expires_at timestamptz,updated_at timestamptz DEFAULT now());`);
 await db.exec(readFileSync(new URL('../../supabase/staged/unpro-gold/migration.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../../supabase/staged/pioneer-2026/migration.sql',import.meta.url),'utf8'));
},30000);
afterAll(async()=>db.close());
async function reservation(n:number, mode='live', verified=true) {
 await db.query(`INSERT INTO contractors VALUES($1,$1,$2,'active','activated') ON CONFLICT DO NOTHING`,[id(n),verified?'verified_active':'published_pending_verification']);
 await db.query(`INSERT INTO contractor_checkout_reservations(id,contractor_id,stripe_mode,kind,includes_presence,status,session_expires_at) VALUES($1,$1,$2,'entry_350',true,'reserved',now()+interval '1 hour')`,[id(n),mode]);
}
async function hold(n:number) {return (await db.query<{v:{ok:boolean;code?:string;member_number?:number}}>(`SELECT reserve_pioneer_checkout($1) v`,[id(n)])).rows[0].v;}
async function inventory() {
 const v=(await db.query<{v:{pioneer_available:number|null;pioneer_next_number:number|null;pioneer_sales:number|null}}>(`SELECT gold_availability() v`)).rows[0].v;
 return {available:v.pioneer_available,next_number:v.pioneer_next_number,sales:v.pioneer_sales};
}
async function paid(n:number, live=true) {
 const slot=await hold(n); const sid=`cs_synthetic_${n}`; const event=`evt_synthetic_${n}`;
 await db.query(`UPDATE contractor_checkout_reservations SET status='paid',stripe_session_id=$2 WHERE id=$1`,[id(n),sid]);
 const payload={created:Math.floor(Date.now()/1000),data:{object:{id:sid,currency:'cad',payment_status:'paid',amount_subtotal:35000,amount_total:40241,total_details:{amount_discount:0},metadata:{contractor_id:id(n),offer:'entry_activation_350',pioneer_offer:'pioneer_2026',pioneer_member_number:String(slot.member_number),checkout_reservation_id:id(n),presence_ia_months:'12'}}}};
 await db.query(`INSERT INTO stripe_webhook_events VALUES($1,'checkout.session.completed',$2,false,null,$3)`,[event,live,JSON.stringify(payload)]);
 await db.query(`INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES($1,'entry_activation_350_paid','stripe_webhook',$2)`,[id(n),JSON.stringify({stripe_event_id:event,stripe_session_id:sid,livemode:live,amount_cents:40241,amount_discount_cents:0})]);
 return event;
}
async function finish(e:string) {await db.query(`UPDATE stripe_webhook_events SET success=true,processed_at=now() WHERE stripe_event_id=$1`,[e]);}
test('draft never reports availability or releases payment capacity',async()=>{
 await reservation(2); expect(await hold(2)).toMatchObject({ok:false,code:'pioneer_unavailable'});
 expect((await inventory()).available).toBeNull();
 await db.exec(`UPDATE contractor_gold_config SET status='active',pioneer_status='active',pioneer_checkout_ready=true`);
});
test('unknown first member reserves 0001, next 0002, zero sales; idempotent holds',async()=>{
 expect(await inventory()).toMatchObject({available:999,next_number:2,sales:0});
 expect(await hold(2)).toMatchObject({ok:true,member_number:2});
 expect(await hold(2)).toMatchObject({ok:true,member_number:2});
 expect((await inventory()).available).toBe(998);
});
test('parallel requests cannot allocate the same number',async()=>{
 await reservation(3); await reservation(4);
 const rows=await Promise.all([hold(3),hold(4)]);
 expect(rows.map(r=>r.member_number)).toEqual([3,4]);
});
test('unknown Stripe state retains hold; confirmed expiration frees only unissued number',async()=>{
 expect((await inventory()).available).toBe(996);
 await db.exec(`UPDATE contractor_checkout_reservations SET session_expires_at=now()-interval '1 hour' WHERE id='${id(4)}'`);
 expect((await inventory()).available).toBe(996);
 await db.exec(`UPDATE contractor_checkout_reservations SET status='expired' WHERE id='${id(4)}'`);
 expect((await inventory()).available).toBe(997);
});
test('signed paid LIVE receipt required; replay never adds a sale',async()=>{
 const e=await paid(2);
 expect((await db.query(`SELECT * FROM contractor_gold_memberships`)).rows).toEqual([]);
 await finish(e); await finish(e);
 expect((await db.query(`SELECT member_number,pioneer_2026,status FROM contractor_gold_memberships`)).rows).toEqual([{member_number:2,pioneer_2026:true,status:'active'}]);
 expect((await inventory()).sales).toBe(1);
});
test('TEST neither assigns a badge nor consumes live inventory',async()=>{
 const before=(await inventory()).available;
 await reservation(5,'test'); await finish(await paid(5,false));
 expect((await inventory()).available).toBe(before);
 expect((await db.query(`SELECT * FROM contractor_gold_memberships WHERE contractor_id='${id(5)}'`)).rows).toEqual([]);
});
test('eligibility pending cannot reserve',async()=>{
 await reservation(6,'live',false); expect(await hold(6)).toMatchObject({ok:false,code:'pioneer_eligibility_pending'});
});
test('refund removes sale but preserves historical badge, number and audit',async()=>{
 await db.exec(`INSERT INTO stripe_webhook_events VALUES('evt_refund','charge.refunded',true,false,null,'{}');
 INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES('${id(2)}','deactivated','stripe_webhook','{"stripe_event_id":"evt_refund","livemode":true}');`);
 expect((await inventory()).sales).toBe(0);
 expect((await db.query(`SELECT member_number,pioneer_2026,status FROM contractor_gold_memberships WHERE contractor_id='${id(2)}'`)).rows).toEqual([{member_number:2,pioneer_2026:true,status:'refunded'}]);
 await expect(db.exec(`UPDATE contractor_gold_memberships SET pioneer_2026=false WHERE contractor_id='${id(2)}'`)).rejects.toThrow('immutable');
});
test('historical public badge readable, client reservation/write denied; audit admin only',async()=>{
 await db.exec(`SET ROLE anon`);
 expect((await db.query(`SELECT member_number,pioneer_2026 FROM contractor_gold_memberships`)).rows).toEqual([{member_number:2,pioneer_2026:true}]);
 await expect(db.exec(`SELECT reserve_pioneer_checkout('${id(3)}')`)).rejects.toThrow('permission denied');
 await expect(db.exec(`UPDATE contractor_gold_memberships SET pioneer_2026=true`)).rejects.toThrow('permission denied');
 await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('qa.uid','${id(77)}',false)`);
 expect((await db.query(`SELECT * FROM contractor_gold_events`)).rows).toEqual([]);
 await db.exec(`SELECT set_config('qa.uid','${id(9999)}',false)`);
 expect((await db.query(`SELECT * FROM contractor_gold_events`)).rows.length).toBe(2);
 await db.exec('RESET ROLE');
});
test('server cutoff refuses without fallback pricing',async()=>{
 await db.exec(`UPDATE contractor_gold_config SET pioneer_closes_at='2000-01-01'`);
 expect(await hold(3)).toMatchObject({ok:false,code:'pioneer_closed'});
 expect((await inventory()).available).toBeNull();
 await db.exec(`UPDATE contractor_gold_config SET pioneer_closes_at='2099-01-01'`);
});
test('all 1000 numbers occupied includes refunds; never allocate 1001',async()=>{
 await db.exec(`INSERT INTO contractors SELECT ('00000000-0000-4000-8000-'||lpad(s::text,12,'0'))::uuid,null,'verified_active','active','activated' FROM generate_series(10004,11000) s;
 INSERT INTO contractor_gold_memberships(contractor_id,member_number,status,joined_at,pioneer_2026) SELECT ('00000000-0000-4000-8000-'||lpad((s+10000)::text,12,'0'))::uuid,s,'active',now(),true FROM generate_series(4,1000) s;`);
 expect((await inventory()).available).toBe(0);
 await reservation(7); expect(await hold(7)).toMatchObject({ok:false,code:'pioneer_full'});
});
test('only server-identified pilot can hold 0001; requires signed payment before badge', async()=>{
 await reservation(8);
 await db.query('UPDATE contractor_gold_config SET pilot_contractor_id=$1',[id(8)]);
 expect(await hold(8)).toMatchObject({ok:true,member_number:1});
 expect((await db.query('SELECT * FROM contractor_gold_memberships WHERE member_number=1')).rows).toEqual([]);
 await finish(await paid(8));
 expect((await db.query('SELECT member_number,pioneer_2026 FROM contractor_gold_memberships WHERE member_number=1')).rows).toEqual([{member_number:1,pioneer_2026:true}]);
});
