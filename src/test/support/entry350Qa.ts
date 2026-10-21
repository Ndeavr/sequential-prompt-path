import { PGlite } from "@electric-sql/pglite";
import Stripe from "stripe";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import * as guards from "../../../supabase/functions/_shared/checkoutGuards";
import * as identity from "../../../supabase/functions/_shared/contractorIdentity";
import * as fallback from "../../../supabase/functions/_shared/fallbackCredit350";
import { revokeEntry350 } from "../../../supabase/functions/_shared/entry350Revocation";
import { reverseEntry350Commission, entry350SessionRevoked } from "../../../supabase/functions/_shared/entry350CommissionReversal";
import { OFFER } from "../../../supabase/functions/_shared/offerCopy";
import * as entryTax from "../../../supabase/functions/_shared/entry350Tax";

export const OWNER = "00000000-0000-4000-8000-000000000001";
export const OTHER = "00000000-0000-4000-8000-000000000002";
const LOCAL_ORIGIN = "http://127.0.0.1:8799";
const CORE = new Set(["contractors", "contractor_pricing_quotes", "contractor_subscriptions", "contractor_activation_ledger", "stripe_webhook_events", "user_roles", "contractor_entitlements", "profiles", "contractor_prospects"]);
type Row = Record<string, any>;

// Test-only environment. Never reads process.env or .env, never connects remotely.
// PGlite enforces actual Postgres roles/RLS; auth and peripheral RPCs are adapters,
// not a hosted Auth/PostgREST/Edge stack. Stripe uses its actual HMAC verifier.
export async function createQa(taxApproved = true) {
  const db = new PGlite();
  const secret = randomBytes(32).toString("hex");
  const testSecret = randomBytes(32).toString("hex");
  const authSecret = randomBytes(32);
  const serviceKey = randomBytes(32).toString("hex");
  const peripheral = new Map<string, Row[]>();
  const sessions: Row[] = [];
  const configs: Row[] = [];
  const calls: string[] = [];
  let deliveryLive = true;
  let failTable: string | null = null;
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid primary key, email text unique, user_metadata jsonb default '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
    CREATE TABLE public.user_roles(user_id uuid, role text, UNIQUE(user_id,role));
    GRANT SELECT ON public.user_roles TO authenticated;
    GRANT ALL ON public.user_roles TO service_role;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION public.has_role(_u uuid,_r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
      SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_u AND role=_r) $$;
    CREATE POLICY own_roles ON public.user_roles FOR SELECT USING(auth.uid()=user_id);
    CREATE POLICY admin_roles ON public.user_roles FOR ALL TO authenticated USING(has_role(auth.uid(),'admin'));
    CREATE FUNCTION public.canonical_plan_code(_p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT lower(_p) $$;
    CREATE TABLE public.contractors(
      id uuid primary key default gen_random_uuid(), user_id uuid unique not null,
      business_name text, city text, specialty text, website text, email text, phone text,
      address text, province text, account_status text default 'active', activation_status text default 'pending',
      verification_status text default 'pending', onboarding_status text, is_published boolean default false,
      is_discoverable boolean default false, published_at timestamptz, updated_at timestamptz default now());
    GRANT SELECT,INSERT,UPDATE ON public.contractors TO authenticated;
    GRANT SELECT ON public.contractors TO anon;
    GRANT ALL ON public.contractors TO service_role;
    ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_read ON public.contractors FOR SELECT USING(auth.uid()=user_id);
    CREATE POLICY public_verified ON public.contractors FOR SELECT USING(verification_status='verified');
    CREATE POLICY own_insert ON public.contractors FOR INSERT WITH CHECK(auth.uid()=user_id);
    CREATE POLICY own_update ON public.contractors FOR UPDATE USING(auth.uid()=user_id);
    CREATE POLICY admin_all ON public.contractors FOR ALL USING(has_role(auth.uid(),'admin'));
    CREATE TABLE public.contractor_pricing_quotes(id uuid primary key, user_id uuid, contractor_id uuid,
      company_name text, city text, trade_primary text, input_payload jsonb, pricing_explanation jsonb,
      guaranteed_appointments integer, total_price_cents integer, pricing_status text default 'offered',
      stripe_checkout_session_id text, updated_at timestamptz default now());
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.contractor_pricing_quotes TO authenticated;
    GRANT ALL ON public.contractor_pricing_quotes TO service_role;
    ALTER TABLE public.contractor_pricing_quotes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_quote_read ON public.contractor_pricing_quotes FOR SELECT TO authenticated USING(auth.uid()=user_id OR has_role(auth.uid(),'admin'));
    CREATE POLICY own_quote_insert ON public.contractor_pricing_quotes FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id OR has_role(auth.uid(),'admin'));
    CREATE POLICY own_quote_update ON public.contractor_pricing_quotes FOR UPDATE TO authenticated USING(auth.uid()=user_id OR has_role(auth.uid(),'admin')) WITH CHECK(auth.uid()=user_id OR has_role(auth.uid(),'admin'));
    CREATE POLICY admin_quote_delete ON public.contractor_pricing_quotes FOR DELETE TO authenticated USING(has_role(auth.uid(),'admin'));
    CREATE TABLE public.contractor_subscriptions(id uuid default gen_random_uuid(), contractor_id uuid,
      plan_id text, status text, payment_status text, activation_source text, activated_by uuid,
      activation_note text, updated_at timestamptz default now());
    GRANT SELECT ON public.contractor_subscriptions TO authenticated;
    GRANT ALL ON public.contractor_subscriptions TO service_role;
    ALTER TABLE public.contractor_subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_sub ON public.contractor_subscriptions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM contractors c WHERE c.id=contractor_id AND c.user_id=auth.uid()));
    CREATE POLICY admin_sub ON public.contractor_subscriptions FOR ALL TO authenticated USING(has_role(auth.uid(),'admin'));
    CREATE TABLE public.contractor_entitlements(contractor_id uuid, feature text);
    GRANT SELECT ON public.contractor_entitlements TO authenticated;
    GRANT ALL ON public.contractor_entitlements TO service_role;
    ALTER TABLE public.contractor_entitlements ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_ent ON public.contractor_entitlements FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM contractors c WHERE c.id=contractor_id AND c.user_id=auth.uid()));
    CREATE POLICY admin_ent ON public.contractor_entitlements FOR ALL TO authenticated USING(has_role(auth.uid(),'admin')) WITH CHECK(has_role(auth.uid(),'admin'));
    CREATE TABLE public.contractor_activation_ledger(id uuid default gen_random_uuid(), contractor_id uuid,
      action text, source text, actor_id uuid, plan_id text, before_state jsonb, after_state jsonb,
      metadata jsonb, created_at timestamptz default now());
    GRANT SELECT ON public.contractor_activation_ledger TO authenticated;
    GRANT ALL ON public.contractor_activation_ledger TO service_role;
    ALTER TABLE public.contractor_activation_ledger ENABLE ROW LEVEL SECURITY;
    CREATE POLICY admin_ledger ON public.contractor_activation_ledger FOR SELECT USING(has_role(auth.uid(),'admin'));
    CREATE TABLE public.stripe_webhook_events(stripe_event_id text unique, event_type text,
      received_at timestamptz, contractor_id uuid, prospect_id uuid, payment_intent_id text,
      session_id text, livemode boolean, attribution jsonb, payload jsonb, processing_status text,
      error_message text, last_retry_at timestamptz, retry_count integer, processed_at timestamptz, success boolean);
    GRANT SELECT ON public.stripe_webhook_events TO authenticated;
    GRANT ALL ON public.stripe_webhook_events TO service_role;
    ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY admin_events ON public.stripe_webhook_events FOR SELECT TO authenticated USING(has_role(auth.uid(),'admin'));
    CREATE TABLE public.profiles(user_id uuid, email text);
    GRANT ALL ON public.profiles TO service_role;
    CREATE TABLE public.contractor_prospects(contractor_id uuid, activation_status text, payment_status text, updated_at timestamptz);
    GRANT ALL ON public.contractor_prospects TO service_role;
  `);
  await db.exec(readFileSync("drizzle/migrations/0014_entry_activation_350_ledger_action.sql", "utf8"));
  await db.exec(readFileSync("drizzle/migrations/0023_entry_350_presence_entitlement.sql", "utf8"));
  await db.exec(`REVOKE ALL ON FUNCTION public.contractor_plan_code(uuid) FROM PUBLIC,anon;
    GRANT EXECUTE ON FUNCTION public.contractor_plan_code(uuid) TO authenticated,service_role;`);
  // Relevant live RPC semantics captured read-only: passing any p_plan_id creates
  // an active paid subscription. Peripheral telemetry is deliberately not emulated.
  await db.exec(`CREATE FUNCTION public.activate_contractor_unified(p_contractor_id uuid,p_source text,p_plan_id text,p_actor uuid,p_metadata jsonb)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
    BEGIN
      UPDATE contractors SET is_published=true,published_at=coalesce(published_at,now()) WHERE id=p_contractor_id;
      IF p_plan_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM contractor_subscriptions WHERE contractor_id=p_contractor_id AND status IN ('active','trialing')) THEN
        INSERT INTO contractor_subscriptions(contractor_id,plan_id,status,payment_status,activation_source) VALUES(p_contractor_id,p_plan_id,'active','paid',p_source);
      END IF;
      UPDATE contractor_prospects SET activation_status='activated',payment_status='paid',updated_at=now() WHERE contractor_id=p_contractor_id;
      INSERT INTO contractor_activation_ledger(contractor_id,action,source,actor_id,plan_id,metadata) VALUES(p_contractor_id,'noop',p_source,p_actor,p_plan_id,p_metadata);
      RETURN jsonb_build_object('ok',true);
    END $$;`);

  async function register(id: string, email: string) {
    await db.query("insert into auth.users values ($1,$2,'{}')", [id,email]);
    await db.query("insert into public.profiles values ($1,$2)", [id,email]);
    const data = Buffer.from(JSON.stringify({ sub:id, exp:Math.floor(Date.now()/1000)+3600 })).toString("base64url");
    return `${data}.${createHmac('sha256',authSecret).update(data).digest('base64url')}`;
  }
  async function user(token?: string) {
    if (!token) return null;
    const [data,sig] = token.split('.');
    const expected = createHmac('sha256',authSecret).update(data).digest();
    const received = Buffer.from(sig ?? '', 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received,expected)) return null;
    const claims = JSON.parse(Buffer.from(data,'base64url').toString());
    if (claims.exp < Date.now()/1000) return null;
    const result = await db.query<Row>('select * from auth.users where id=$1',[claims.sub]);
    return result.rows[0] ?? null;
  }
  const ownerToken = await register(OWNER,"owner-one@qa.invalid");
  const otherToken = await register(OTHER,"owner-two@qa.invalid");
  async function asRole<T>(uid: string | null, role: string, action: () => Promise<T>): Promise<T> {
    if (!['anon','authenticated','service_role'].includes(role)) throw new Error('Invalid local role');
    await db.exec(`SET ROLE ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid ?? '']);
    try { return await action(); } finally { await db.exec('RESET ROLE'); await db.query("select set_config('request.jwt.claim.sub','',false)"); }
  }
  function client(role: string, uid: string | null) {
    return {
      auth: { getUser: async () => ({data:{user:uid ? (await db.query<Row>('select * from auth.users where id=$1',[uid])).rows[0] : null},error:uid ? null : {message:'Unauthorized'}}),
        admin: {
          getUserById: async (id: string) => ({data:{user:(await db.query<Row>('select * from auth.users where id=$1',[id])).rows[0]},error:null}),
          createUser: async (v: Row) => {
            const existing = await db.query<Row>('select * from auth.users where email=$1',[v.email]);
            if (existing.rows.length) return {data:{user:null},error:{message:'Already registered'}};
            const result = await db.query<Row>('insert into auth.users values(gen_random_uuid(),$1,$2) returning *',[v.email,JSON.stringify(v.user_metadata ?? {})]);
            return {data:{user:result.rows[0]},error:null};
          },
        },
      },
      functions: { invoke: async (name: string) => { calls.push(`blocked-function:${name}`); return {data:null,error:{message:'Disabled in isolated QA'}}; } },
      rpc: async (name: string, args: Row) => {
        calls.push(name);
        if (name === 'activate_contractor_unified') {
          const r = await db.query<Row>('select activate_contractor_unified($1,$2,$3,$4,$5) data',[args.p_contractor_id,args.p_source,args.p_plan_id,args.p_actor,JSON.stringify(args.p_metadata)]);
          return {data:r.rows[0].data,error:null};
        }
        if (name === 'has_role') return {data:false,error:null};
        return {data:null,error:null}; // Explicit peripheral analytics/affiliate mocks.
      },
      from(table: string) {
        if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid table');
        let operation='read', payload: Row | Row[] | undefined, limit=1000, single=false, conflict='', columns='*';
        const filters: [string,string,unknown][]=[];
        const q: any = {
          select: (v='*') => {columns=v;return q;}, eq:(k:string,v:unknown)=>{filters.push([k,'=',v]);return q;},
          neq:(k:string,v:unknown)=>{filters.push([k,'<>',v]);return q;}, is:(k:string,v:unknown)=>{filters.push([k,'is',v]);return q;},
          limit:(v:number)=>{limit=v;return q;}, order:()=>q,
          insert:(v:Row|Row[])=>{operation='insert';payload=v;return q;},
          update:(v:Row)=>{operation='update';payload=v;return q;},
          upsert:(v:Row|Row[],opts:Row={})=>{operation='upsert';payload=v;conflict=opts.onConflict ?? '';return q;},
          maybeSingle:()=>{single=true;return execute();},
          then:(res:any,rej:any)=>execute().then(res,rej),
        };
        async function execute() {
          if (failTable===table && operation!=='read') {failTable=null;return {data:null,error:{message:'Injected isolated failure'}};}
          if (!CORE.has(table)) {
            const rows=peripheral.get(table) ?? [];
            const val=(r:Row,k:string)=>k.split('->>').reduce((a:any,b:string)=>a?.[b],r);
            const matches=(r:Row)=>filters.every(([k,op,v])=>op==='=' ? val(r,k)===v : op==='is' ? val(r,k)==null : val(r,k)!==v);
            if (operation==='insert'||operation==='upsert') rows.push(...(Array.isArray(payload)?payload:[payload ?? {}]));
            if (operation==='update') rows.filter(matches).forEach(r=>Object.assign(r,payload));
            peripheral.set(table,rows);
            const found=rows.filter(matches).slice(0,limit);
            return {data:single ? found[0] ?? null : found,error:null};
          }
          try {
            return await asRole(uid,role,async()=>{
              const args: unknown[]=[];
              const bind=(v:unknown)=>{args.push(v!==null && typeof v==='object'?JSON.stringify(v):v);return `$${args.length}`;};
              const col=(k:string)=>{if(!/^[a-z_]+(->>?[a-z_]+)*$/.test(k))throw new Error('Unsafe identifier');return k.replace(/(->>?)([a-z_]+)/g,"$1'$2'");};
              const where=()=>filters.length ? ' WHERE '+filters.map(([k,op,v])=>op==='is'?`${col(k)} IS NULL`:`${col(k)} ${op} ${bind(v)}`).join(' AND ') : '';
              let result: any;
              if(operation==='insert'||operation==='upsert') {
                const values=Array.isArray(payload)?payload:[payload ?? {}]; const all:Row[]=[];
                for(const row of values) {
                  const keys=Object.keys(row); keys.forEach(col);args.length=0;
                  const updates=keys.filter(k=>!conflict.split(',').includes(k));
                  const update=conflict ? ` ON CONFLICT (${conflict}) ${updates.length ? 'DO UPDATE SET '+updates.map(k=>`${k}=excluded.${k}`).join(',') : 'DO NOTHING'}` : '';
                  const r=await db.query<Row>(`INSERT INTO public.${table}(${keys.join(',')}) VALUES(${keys.map(k=>bind(row[k])).join(',')})${update} RETURNING *`,args);all.push(...r.rows);
                }
                result={rows:all};
              } else if(operation==='update') {
                const row=payload as Row;const keys=Object.keys(row);keys.forEach(col);
                result=await db.query<Row>(`UPDATE public.${table} SET ${keys.map(k=>`${k}=${bind(row[k])}`).join(',')}${where()} RETURNING *`,args);
              } else {
                // Columns retain production shape; only simple selectors supported.
                if(columns!=='*')columns.split(',').map(k=>k.trim()).forEach(col);
                result=await db.query<Row>(`SELECT ${columns} FROM public.${table}${where()} LIMIT ${limit}`,args);
              }
              return {data:single ? result.rows[0] ?? null : result.rows,error:null};
            });
          }catch(e){console.error('isolated SQL adapter',table,operation,e instanceof Error?e.message:String(e));return {data:null,error:{message:e instanceof Error?e.message:String(e)}};}
        }
        return q;
      },
    };
  }
  const env:Row={SUPABASE_URL:LOCAL_ORIGIN,SUPABASE_SERVICE_ROLE_KEY:serviceKey,SUPABASE_ANON_KEY:'local-anon',STRIPE_SECRET_KEY:'sk_live_local_fixture_only',STRIPE_TEST_SECRET_KEY:'sk_test_local_fixture_only',STRIPE_WEBHOOK_SECRET:secret,STRIPE_TEST_WEBHOOK_SECRET:testSecret};
  class LocalStripe {
    webhooks=new Stripe('sk_test_local_fixture_only').webhooks;
    taxRates={list:async()=>({data:[{id:'tax_gst',metadata:{unpro_tax:'gst_5'},inclusive:false,percentage:5,country:'CA'},{id:'tax_qst',metadata:{unpro_tax:'qst_9975'},inclusive:false,percentage:9.975,country:'CA',state:'QC'}]})};
    checkout={sessions:{create:async(config:Row)=>{
      configs.push(config);
      const item=config.line_items[0];const subtotal=item.price_data.unit_amount;
      const tax=item.tax_rates ? Math.round(subtotal*0.05)+Math.round(subtotal*0.09975):0;
      const s={id:`cs_test_local${sessions.length.toString().padStart(12,'0')}`,object:'checkout.session',status:'open',payment_status:'unpaid',mode:config.mode,currency:item.price_data.currency,amount_subtotal:subtotal,amount_total:subtotal+tax,total_details:{amount_tax:tax,amount_discount:0},metadata:config.metadata,customer_email:config.customer_email,customer_details:{email:config.customer_email},payment_intent:`pi_local_${sessions.length}`,url:`${LOCAL_ORIGIN}/mock-checkout/${sessions.length}`};
      sessions.push(s);return s;
    },retrieve:async(id:string)=>({...sessions.find(s=>s.id===id),payment_status:'paid',status:'complete',livemode:deliveryLive}),
    listLineItems:async(id:string)=>({has_more:false,data:[{quantity:1,currency:'cad',amount_subtotal:35000,amount_total:40241,amount_discount:0,amount_tax:5241,taxes:[{amount:1750,rate:{metadata:{unpro_tax:'gst_5'},percentage:5,inclusive:false,country:'CA'}},{amount:3491,rate:{metadata:{unpro_tax:'qst_9975'},percentage:9.975,inclusive:false,country:'CA',state:'QC'}}]}]})}};
  }
  async function load(name:string) {
    const path=`supabase/functions/${name}/index.ts`;
    const raw=readFileSync(path,'utf8').replace(/^import[\s\S]*?;\n/gm,'');
    const {code}=await transform(raw,{loader:'ts',target:'es2022'});
    let handler:((r:Request)=>Promise<Response>)|undefined;
    const imports={...guards,...identity,...fallback,...entryTax,entry350TaxCollectionApproved:()=>taxApproved,revokeEntry350,reverseEntry350Commission,entry350SessionRevoked,OFFER,
      resolveStripeEnv:(v:unknown)=>v===true?'test':'live',stripeKeyFor:(v:string)=>v==='test'?env.STRIPE_TEST_SECRET_KEY:env.STRIPE_SECRET_KEY};
    new Function('Deno','Stripe','createClient','fetch',...Object.keys(imports),code)(
      {env:{get:(k:string)=>env[k]},serve:(fn:typeof handler)=>{handler=fn;}},LocalStripe,
      (url:string,key:string,opts:Row={})=>{
        if(url!==LOCAL_ORIGIN)throw new Error('Nonlocal backend forbidden');
        // The outer request prevalidates the synthetic signed session.
        const uid=opts.global?.headers?.Authorization?.slice(7);
        return client(key===serviceKey?'service_role':'authenticated',uid ?? null);
      },()=>{throw new Error('Network disabled in QA');},...Object.values(imports));
    if(!handler)throw new Error('Handler missing');return handler;
  }
  const handlers={personal:await load('create-checkout-session'),invited:await load('create-activation-checkout'),webhook:await load('stripe-webhook')};
  async function checkout(kind:'personal'|'invited',body:Row,token?:string) {
    const u=await user(token);
    const headers:Row={'Content-Type':'application/json',origin:'http://localhost:8080'};
    if(u)headers.Authorization=`Bearer ${u.id}`;
    const r=await handlers[kind](new Request(`${LOCAL_ORIGIN}/${kind}`,{method:'POST',headers,body:JSON.stringify(body)}));
    return {status:r.status,body:await r.json()};
  }
  async function deliver(s:Row,opts:{live?:boolean;type?:string;eventId?:string;signature?:'bad'|'missing'|'test';object?:Row}={}) {
    deliveryLive = opts.live !== false;
    const event={id:opts.eventId ?? `evt_local_${sessions.indexOf(s)}`,type:opts.type ?? 'checkout.session.completed',livemode:opts.live!==false,api_version:'2018-02-28',data:{object:opts.object ?? {...s,status:'complete',payment_status:'paid'}}};
    const payload=JSON.stringify(event);
    const signature=Stripe.webhooks.generateTestHeaderString({payload,secret:opts.signature==='test'?testSecret:secret});
    const headers:Row={'Content-Type':'application/json'};
    if(opts.signature!=='missing')headers['stripe-signature']=opts.signature==='bad'?signature+'bad':signature;
    const r=await handlers.webhook(new Request(`${LOCAL_ORIGIN}/webhook`,{method:'POST',headers,body:payload}));
    return {status:r.status,body:await r.json()};
  }
  async function queryAs(token:string|null,query:string,params:unknown[]=[]) {
    const u=await user(token ?? undefined);
    return asRole(u?.id ?? null,u?'authenticated':'anon',()=>db.query<Row>(query,params));
  }
  return {db,ownerToken,otherToken,checkout,deliver,queryAs,sessions,configs,peripheral,calls,
    failNext:(table:string)=>{failTable=table;},
    close:()=>db.close()};
}