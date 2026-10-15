import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium } from '@playwright/test';
const htmlPath=path.resolve('design-photos-validation-tmp.html');
await writeFile(htmlPath,`<html><body><div id="root" style="padding:44px;max-width:672px;margin:auto;box-sizing:border-box"></div><script type="module">
import '/src/index.css';import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import Photos from '/src/components/design/DesignProjectPhotos.tsx';
createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(Photos,{matchId:'33333333-3333-3333-3333-333333333333',allowSelection:!location.search,contractorName:'Entrepreneur de validation'})));
</script></body></html>`);
const server=await createServer({configFile:false,plugins:[react()],resolve:{alias:{'@':path.resolve('src')}},optimizeDeps:{entries:[]},server:{host:'127.0.0.1',port:8081,strictPort:true}});
await server.listen();const {designAccessAction}=await server.ssrLoadModule('/supabase/functions/_shared/designBrief.ts');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
let checks=0;const check=(v,l)=>{assert.ok(v,l);checks++;};
try{for(const width of [360,390,1280]){
const owner='owner',proUser='pro-user',proId='pro',matchId='33333333-3333-3333-3333-333333333333';
const before='11111111-1111-1111-1111-111111111111',after='22222222-2222-2222-2222-222222222222';
const lead={id:'lead',owner_profile_id:owner,assigned_match_id:matchId,payload:{design_context:{before_file_id:before,after_file_id:after,description:'Projet de validation'}}};
const match={id:matchId,lead_id:'lead',contractor_id:proId,status:'primary',response_status:'pending'};
const pro={id:proId,user_id:proUser,public_status:'verified_active',account_status:'active',verification_status:'verified',is_accepting_appointments:true,booking_enabled:true,rbq_number:'TEST',rbq_compliance_status:'verified',rbq_verified_at:'2026-01-01',rbq_expiry_date:null};
const files=[before,after].map(id=>({id,user_id:owner,storage_bucket:'property-photos',storage_path:`${owner}/clara/${id}.jpg`,mime:'image/jpeg',bytes:1024}));let shares=0,notifications=0,signed=0;
const db={from(table){let update;const q={select(){return q},in(){return q},eq(){return q},is(){return q},update(v){update=v;return q},insert(){notifications++;return Promise.resolve({error:null})},maybeSingle(){if(update){Object.assign(lead,update);return Promise.resolve({data:{id:'lead'},error:null})}return Promise.resolve({data:table==='matches'?match:table==='leads'?lead:pro,error:null})},then(resolve){return Promise.resolve({data:files,error:null}).then(resolve)}};return q},storage:{from(){return {createSignedUrl(p,seconds){check(seconds===300,`${width}: 300 second access`);signed++;return Promise.resolve({data:{signedUrl:`http://127.0.0.1:8081/src/assets/design-${p.includes(before)?'before':'after'}-1.jpg`},error:null})}}}}};
const context=await browser.newContext({viewport:{width,height:850}});let actor=owner;
await context.route('**/*',async route=>{const u=route.request().url();if(new URL(u).hostname==='127.0.0.1')return route.continue();if(u.includes('/functions/v1/create-project-unified')){const body=route.request().postDataJSON();if(body.action==='share_design')shares++;const result=await designAccessAction(db,actor,body);return route.fulfill({status:result.status,json:result.body});}return route.fulfill({json:[]});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8081/design-photos-validation-tmp.html');
await page.getByText('Après — concept IA',{exact:true}).waitFor();
await page.waitForFunction(()=>document.images.length===2 && [...document.images].every(i=>i.complete && i.naturalWidth>0));
check(await page.getByText('Avant — espace actuel',{exact:true}).isVisible(),`${width}: before caption from server renders`);
check(await page.getByRole('img',{name:'Après — concept IA',exact:true}).isVisible(),`${width}: after accessible label renders`);
await page.waitForFunction(()=>[...document.images].every(i=>i.complete && i.naturalWidth>0));
check(await page.getByRole('button',{name:'Choisir cet entrepreneur et transmettre mon avant/après',exact:true}).evaluate(b=>{const r=b.getBoundingClientRect();const parent=b.closest('section').getBoundingClientRect();return r.left>=parent.left-1 && r.right<=parent.right+1 && r.right<=innerWidth;}),`${width}: selection CTA stays fully inside recommendation card`);
check(shares===0&&notifications===0,`${width}: never automatically transmits`);
const denied=await designAccessAction(db,proUser,{action:'get_design_photos',match_id:matchId});check(denied.status===403,`${width}: contractor has no access before selection`);
await page.getByRole('button',{name:'Choisir cet entrepreneur et transmettre mon avant/après',exact:true}).click();
await page.getByRole('status').waitFor();check((await page.getByRole('status').innerText()).includes('Entrepreneur de validation'),`${width}: selected recipient is confirmed`);
check(shares===1&&notifications===1,`${width}: exactly one share and notification`);
await designAccessAction(db,owner,{action:'share_design',match_id:matchId});check(notifications===1,`${width}: retry does not duplicate notification`);
actor=proUser;await page.goto('http://127.0.0.1:8081/design-photos-validation-tmp.html?contractor');
await page.getByText('Après — concept IA',{exact:true}).waitFor();await page.waitForFunction(()=>document.images.length===2 && [...document.images].every(i=>i.complete && i.naturalWidth>0));check(await page.getByRole('img',{name:'Avant — espace actuel'}).isVisible(),`${width}: selected contractor receives both images`);
check(await page.getByRole('button',{name:'Choisir cet entrepreneur et transmettre mon avant/après',exact:true}).count()===0,`${width}: contractor cannot choose another recipient`);
const priorSigned=signed;const outsider=await designAccessAction(db,'outsider',{action:'get_design_photos',match_id:matchId});check(outsider.status===403&&signed===priorSigned,`${width}: outsider cannot get signed URLs`);
check(errors.length===0,`${width}: no runtime errors`);await context.close();
}
console.log(`PASS ${checks} browser/server photo integration checks, 360/390/1280 px; all external writes mocked`);
}finally{await browser.close();await server.close();await unlink(htmlPath);}
