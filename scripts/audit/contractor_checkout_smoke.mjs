// Execute the actual Edge handler with fake DB/provider adapters. No network or payment.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {createServer} from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true}});
try {
const identity=await server.ssrLoadModule('/supabase/functions/_shared/contractorIdentity.ts');
const fallback=await server.ssrLoadModule('/supabase/functions/_shared/fallbackCredit350.ts');
const source=(await readFile('supabase/functions/create-checkout-session/index.ts','utf8')).replace(/^import[\s\S]*?;\n/gm,'');
const js=(await transform(source,{loader:'ts',format:'iife'})).code;
let handler,writes=[],quote,existing,lookupFail=false,providerCalls=0;
const db={auth:{getUser:async()=>({data:{user:{id:'qa-user',email:'qa@example.com'}},error:null})},from(table){let cols='',filter={},insert,update;const q={select(v){cols=v;return q},eq(k,v){filter[k]=v;return q},insert(v){insert=v;writes.push({table,insert:v});return q},update(v){update=v;writes.push({table,update:v});return q},maybeSingle:async()=>{if(table==='contractor_pricing_quotes')return {data:quote,error:null};if(table==='contractors'){if(cols==='activation_status')return {data:{activation_status:'active'},error:null};if(filter.id)return {data:filter.id==='foreign'?null:existing,error:null};if(lookupFail)return {data:null,error:{message:'QA lookup failure'}};if(insert)return {data:{id:'created',...insert},error:null};return {data:existing,error:null}}return {data:null,error:null}},then(resolve){return Promise.resolve({error:null}).then(resolve)}};return q}};
class FakeStripe {checkout={sessions:{create:async()=>{providerCalls++;throw new Error('No external calls permitted')}}};}
const deno={env:{get:key=>key==='SUPABASE_URL'?'https://qa.invalid':'qa-placeholder'},serve:fn=>{handler=fn}};
const names=['Deno','Stripe','createClient',...Object.keys(identity),...Object.keys(fallback)];new Function(...names,js)(deno,FakeStripe,()=>db,...Object.values(identity),...Object.values(fallback));
const run=()=>handler(new Request('https://qa.invalid/checkout',{method:'POST',headers:{Authorization:'Bearer qa-fixture','Content-Type':'application/json'},body:JSON.stringify({entryActivation:true,quoteId:'quote'})}));
let checks=0;const check=(v,l)=>{assert.ok(v,l);checks++};
for(const test of [{quote:null,status:400},{quote:{user_id:'another-owner'},status:403},{quote:{user_id:null,contractor_id:'foreign'},status:403}]){quote=test.quote;writes=[];const res=await run();check(res.status===test.status,'unknown or foreign quote refused');check(writes.length===0,'refusal occurs before profile mutation');}
quote={user_id:'qa-user',company_name:'Atelier confirmé',city:'Laval',trade_primary:'Cuisine',input_payload:{website_url:'atelier.example',business_phone:'123',business_address:'Adresse QA'}};existing=null;writes=[];let res=await run();check(res.status===409,'test stops at active guard without charging');const created=writes.find(w=>w.insert)?.insert;check(created.business_name==='Atelier confirmé'&&created.city==='Laval'&&created.specialty==='Cuisine'&&created.website==='https://atelier.example/'&&created.phone==='123','actual checkout creates complete confirmed identity');
existing={id:'owned',business_name:'Nom corrigé',city:'Québec',specialty:'Cuisine',website:'https://owner.example/',phone:'456',address:''};writes=[];res=await run();check(res.status===409,'existing profile no charge');check(!writes.some(w=>w.insert),'existing profile is reused');check(JSON.stringify(writes[0].update)===JSON.stringify({address:'Adresse QA'}),'manual corrections preserved, only missing address filled');
lookupFail=true;writes=[];res=await run();check(res.status===500&&writes.length===0,'failed lookup cannot create duplicate profile');check(providerCalls===0,'no Stripe sessions created');
console.log(JSON.stringify({checks,handler:'create-checkout-session',all_external_services:'mocked'}));
}finally{await server.close()}
