// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const prefix = 'docs/migrations-staged/20261023_sms_event_attribution';
const uuidA = '11111111-1111-4111-8111-111111111111';
const uuidB = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
let sequence = 0;
const sid = () => 'SM' + (++sequence).toString(16).padStart(32, '0');
const call = (s: string, payload: unknown, kind = 'delivered') => db.query('SELECT public.record_outreach_sms_event($1,$2,$3) AS id', [s, kind, JSON.stringify(payload)]);
const row = async (s: string) => (await db.query<Record<string, any>>('SELECT * FROM outreach_sms_events WHERE message_sid=$1', [s])).rows[0];
describe('staged existing SMS RPC — isolated Postgres only', { timeout: 30_000 }, () => {
 beforeAll(async () => {
  db = new PGlite();
  const migration = readFileSync('supabase/migrations/20260624023123_b2baecdb-6312-4c8a-895c-27719420fd64.sql','utf8');
  await db.exec(migration.slice(migration.indexOf('CREATE TABLE IF NOT EXISTS public.outreach_sms_events'), migration.indexOf('CREATE INDEX IF NOT EXISTS idx_ose_recipient')));
  await db.exec('CREATE TABLE acq_sms_logs(id uuid DEFAULT gen_random_uuid(),provider_message_id text,prospect_id uuid,contractor_id uuid,recipient_phone text,is_simulation boolean,is_test_e2e boolean)');
  await db.exec(readFileSync(prefix + '.sql','utf8'));
 });
 afterAll(async () => { await db.close(); });
 it('new exact SID stores valid attribution, not arbitrary PII metadata/body/errors', async () => {
  const s=sid(); await call(s,{ prospect_id:uuidA,contractor_id:uuidB,recipient:'+15145550000', body:'private body', email:'private@example.invalid', token:'private-token',error:'PII private',backfilled:true });
  const r=await row(s); expect([r.prospect_id,r.contractor_id,r.recipient]).toEqual([uuidA,uuidB,'+15145550000']);
  expect(r.metadata).toEqual({backfilled:true}); expect(r.body).toBeNull(); expect(r.last_error).toBeNull();
 });
 it('existing generic row gains only missing attribution and preserves historical evidence', async () => {
  const s=sid(); await call(s,{}); const first=await row(s);
  await call(s,{prospect_id:uuidA,recipient:'+15145550000'});
  const r=await row(s); expect(r.prospect_id).toBe(uuidA); expect(r.recipient).toBe('+15145550000'); expect(r.delivered_at).toEqual(first.delivered_at); expect(r.id).toBe(first.id);
 });
 it('malformed/incomplete IDs never cast, invent attribution or expose raw payload', async () => {
  for(const payload of [{prospect_id:'x',contractor_id:'',recipient:'unknown'},null,[],{prospect_id:uuidA+'junk',recipient:'555'}]) {
   const s=sid(); await call(s,payload); const r=await row(s); expect(r.prospect_id).toBeNull(); expect(r.contractor_id).toBeNull(); expect(r.recipient).toBe('unknown'); expect(r.metadata).toEqual({});
  }
  await expect(call('AU'+'a'.repeat(32),{})).rejects.toThrow('invalid_sms_sid');
 });
 it('identity or recipient conflict cannot fill other gaps or overwrite verified values', async () => {
  const s=sid(); await call(s,{prospect_id:uuidA}); await call(s,{prospect_id:uuidB,contractor_id:uuidB,recipient:'+15145550000'});
  const r=await row(s); expect(r.prospect_id).toBe(uuidA); expect(r.contractor_id).toBeNull(); expect(r.recipient).toBe('unknown');
  const t=sid(); await call(t,{recipient:'+15145550000'}); await call(t,{recipient:'+15145550001',prospect_id:uuidA}); expect((await row(t)).prospect_id).toBeNull();
 });
 it('concurrent double callback produces one record and same ID', async () => {
  const s=sid(), payload={prospect_id:uuidA,recipient:'+15145550000'};
  const results=await Promise.all([call(s,payload),call(s,payload)]); expect(results[0].rows).toEqual(results[1].rows);
  expect((await db.query('SELECT count(*)::int AS n FROM outreach_sms_events WHERE message_sid=$1',[s])).rows).toEqual([{n:1}]);
 });
 it('preview is read-only, rejects ambiguous/test/unmatched SIDs, outputs no PII', async () => {
  await db.exec('TRUNCATE outreach_sms_events,acq_sms_logs');
  for(let i=0;i<4;i++) { const s=sid(); await call(s,{}); if(i<3) await db.query('INSERT INTO acq_sms_logs(provider_message_id,prospect_id,recipient_phone,is_simulation,is_test_e2e) VALUES($1,$2,$3,false,$4)',[s,uuidA,'+15145550000',i===2]); if(i===1) await db.query('INSERT INTO acq_sms_logs(provider_message_id,is_simulation,is_test_e2e) VALUES($1,false,false)',[s]); }
  const before=await db.query('SELECT * FROM outreach_sms_events ORDER BY id');
  await db.exec('BEGIN READ ONLY');
  const result=await db.query(readFileSync(prefix+'.preview.sql','utf8')); await db.exec('ROLLBACK');
  expect(result.rows).toEqual([{decision:'eligible_preview',events:1},{decision:'unresolved',events:3}]); expect(JSON.stringify(result.rows)).not.toContain(uuidA);
  expect((await db.query('SELECT * FROM outreach_sms_events ORDER BY id')).rows).toEqual(before.rows);
 });
 it('rollback restores original function, never deletes attribution rows', async () => {
  const before=await db.query('SELECT * FROM outreach_sms_events ORDER BY id');
  await db.exec(readFileSync(prefix+'.rollback.sql','utf8'));
  expect((await db.query('SELECT * FROM outreach_sms_events ORDER BY id')).rows).toEqual(before.rows);
  const def=await db.query<{definition:string}>("SELECT pg_get_functiondef('public.record_outreach_sms_event(text,text,jsonb)'::regprocedure) AS definition");
  expect(def.rows[0].definition).toContain("NULLIF(p_payload->>'contractor_id','')::uuid");
 });
});
