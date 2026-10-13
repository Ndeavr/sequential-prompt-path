/** Real DOM regression: canonical homepage and contractor audit route.
 * Run: node scripts/audit/clara_embedded_smoke.mjs
 * All external requests are fixtures; no account, SMS or payment is created.
 * Optional CHROMIUM_EXECUTABLE_PATH selects a locally installed browser.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const server = await createServer({
  root, configFile: false, plugins: [react()],
  resolve: { alias: { '@': path.join(root, 'src') } },
  optimizeDeps: { entries: [] },
  server: { host: '127.0.0.1', port: 8080, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
let checks = 0;
const check = (value, name) => { assert.ok(value, name); checks++; console.log('PASS', name); };
async function fixture(route, contractor = false) {
  const req = route.request();
  if (new URL(req.url()).hostname === '127.0.0.1') return route.continue();
  if (req.url().includes('/functions/v1/clara-session')) {
    const body = req.postDataJSON() || {};
    const messages = Array.from({length:18}, (_, i) => ({id:`m${i}`, role:i%2?'assistant':'user', text:'Message de test pour vérifier le défilement. '.repeat(4)}));
    messages.push({id:'last',role:'assistant',text:'Quelle option préférez-vous ?'});
    return route.fulfill({json:{session_id:'00000000-0000-0000-0000-000000000001',session_token:body.session_token,messages,context:contractor ? {current_intent:"CONTRACTOR"} : {},resumed:true,language:'fr',current_step:'chat',auth_state:'guest',role:null}});
  }
  return route.fulfill({json:[]});
}
async function visibleIn(page, selector, container) {
  return page.locator(selector).last().evaluate((el, parentSelector) => {
    const r=el.getBoundingClientRect(), p=parentSelector ? document.querySelector(parentSelector)?.getBoundingClientRect() : null;
    const top=Math.max(visualViewport.offsetTop,p?.top??0), bottom=Math.min(visualViewport.offsetTop+visualViewport.height,p?.bottom??Infinity);
    return r.height>0 && r.top>=top-1 && r.bottom<=bottom+1 && r.left>=-1 && r.right<=innerWidth+1;
  },container);
}
try {
  for (const [width,height] of [[360,740],[390,844],[844,390],[1280,900]]) {
    const context=await browser.newContext({viewport:{width,height}});
    await context.route('**/*',fixture);
    await context.addInitScript(() => {
      const vv=new EventTarget(); Object.assign(vv,{height:innerHeight,width:innerWidth,offsetTop:0,offsetLeft:0,scale:1});
      Object.defineProperty(window,'visualViewport',{value:vv,configurable:true});
    });
    const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8080/entrepreneurs/audit-ia',{waitUntil:'domcontentloaded'});
    await page.locator('.clara-form-assistant-desktop .home-clara-message').first().waitFor({state:'attached',timeout:90000});
    check(await page.evaluate(()=>!document.documentElement.hasAttribute('data-clara-conversation-active')),`${width}: embedded assistant does not lock form`);
    await page.evaluate(()=>window.scrollTo(0,300));
    check(await page.evaluate(()=>window.scrollY>0),`${width}: form remains scrollable`);
    const mobile=width<1024;
    if(mobile) await page.getByRole('button',{name:'Demander à Clara',exact:true}).click();
    const host=mobile?'.clara-form-assistant-sheet':'.clara-form-assistant-desktop';
    const field=page.locator(`${host} .home-clara-textarea`);
    await field.waitFor({state:'visible'});await field.focus();
    if(mobile) await page.evaluate(()=>{visualViewport.height=innerHeight-Math.min(300,innerHeight/2);visualViewport.offsetTop=24;visualViewport.dispatchEvent(new Event('resize'))});
    await page.waitForTimeout(600);
    check(await visibleIn(page,`${host} .home-clara-composer`,host),`${width}: assistant composer visible`);
    check(await visibleIn(page,`${host} [data-chat-row="commands"]`,host),`${width}: assistant commands visible`);
    await field.fill('Une longue réponse à Clara.\n'.repeat(12));
    check(await field.evaluate(e=>e.scrollHeight>e.clientHeight && getComputedStyle(e).overflowY==='auto'),`${width}: long draft scrollable`);
    if(mobile){await page.getByRole('button',{name:'Retour au formulaire',exact:false}).click();
      check(await page.evaluate(()=>!document.documentElement.hasAttribute('data-clara-conversation-active')),`${width}: closing assistance leaves form unlocked`);}
    await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
    await page.locator('.home-clara-textarea').waitFor();
    await page.locator('.home-clara-message').last().waitFor();
    check(await page.evaluate(()=>document.documentElement.dataset.claraConversationActive==='true'),`${width}: homepage owns conversation layout`);
    await page.locator('.home-clara-textarea').focus();
    if(mobile) await page.evaluate(()=>{visualViewport.height=innerHeight-Math.min(300,innerHeight/2);visualViewport.offsetTop=24;visualViewport.dispatchEvent(new Event('resize'))});
    await page.waitForTimeout(600);
    check(await visibleIn(page,'.home-clara-composer'),`${width}: homepage composer visible`);
    const scroller=page.locator('.home-clara-conversation > div').first();
    await scroller.evaluate(e=>e.scrollTop=0);await page.waitForTimeout(150);
    const before=await scroller.evaluate(e=>e.scrollTop);
    await page.locator('.home-clara-message').last().evaluate(e=>e.append(document.createTextNode(' Streaming text. '.repeat(100))));
    await page.waitForTimeout(300);
    check(Math.abs(await scroller.evaluate(e=>e.scrollTop)-before)<2,`${width}: manual history reading preserved`);
    check(errors.length===0,`${width}: no browser runtime errors: ${errors.join('; ')}`);
    await context.close();
  }
  for (const width of [360, 390]) {
    const context = await browser.newContext({viewport:{width,height:844}});
    await context.route('**/*', route => fixture(route, true));
    await context.addInitScript(() => {
      localStorage.setItem('unpro_clara_session_token','qa-contractor-token');
      localStorage.setItem('unpro_clara_contractor_qualification',JSON.stringify({google_place_id:'qa-place',business_name:'Entreprise de test',trade:'Rénovation'}));
      sessionStorage.setItem('unpro_clara_contractor_flow',JSON.stringify({active:true,session_token:'qa-contractor-token'}));
    });
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
    const goals=page.getByRole('group',{name:'Objectifs',exact:true});
    await goals.waitFor({timeout:60000});
    const buttons=goals.locator('button');
    check(await buttons.count()===4,`${width}: actual contractor goals rendered`);
    for(const button of await buttons.all()) {
      const fits=await button.evaluate(e=>{
        const r=e.getBoundingClientRect(), container=e.closest('.home-clara-conversation').getBoundingClientRect();
        return r.left>=container.left && r.right<=container.right && e.scrollWidth<=e.clientWidth+1 && getComputedStyle(e).whiteSpace==='normal';
      });
      check(fits,`${width}: complete goal label fits: ${await button.innerText()}`);
    }
    await buttons.first().click();
    check(await buttons.first().getAttribute('aria-pressed')==='true',`${width}: wrapped goal remains selectable`);
    check(await page.getByRole('button',{name:'Continuer',exact:true}).isEnabled(),`${width}: goal selection enables Continue`);
    await context.close();
  }
  console.log(`PASS ${checks} real-DOM checks; external services mocked, physical keyboard unverified.`);
} finally {await browser.close();await server.close();}
