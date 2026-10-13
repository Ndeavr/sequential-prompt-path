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
async function fixture(route) {
  if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
  if (route.request().url().includes('/functions/v1/clara-session')) {
    return route.fulfill({json:{session_id:'00000000-0000-0000-0000-000000000001',session_token:'qa-reveal',messages:[],context:{},resumed:false,language:'fr',current_step:'chat',auth_state:'guest',role:null}});
  }
  return route.fulfill({json:[]});
}
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion});
    await context.route('**/*',fixture);
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>{ window.__sawClaraShrink=false; new MutationObserver(()=>{if(document.querySelector('.home-clara-shell.is-opening-page')) window.__sawClaraShrink=true;}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']}); });
    await page.getByRole('button',{name:'Analyser 3 soumissions',exact:true}).click({timeout:90000});
    const message=page.getByText('Je vous ouvre la page. Je reste ici si vous avez une question.',{exact:true});
    await message.waitFor();
    check(await message.isVisible(),`${reducedMotion}: opening message displayed`);
    await page.waitForTimeout(600);
    check(new URL(page.url()).pathname==='/',`${reducedMotion}: reading pause before navigation`);
    await page.waitForURL('**/compare-quotes');
    if(reducedMotion==='no-preference') check(await page.evaluate(()=>window.__sawClaraShrink),'chat shrinks after reading pause');
    await page.locator('.compare-quotes-page').waitFor();
    check(await page.getByRole('button',{name:'Demander à Clara',exact:true}).isVisible(),`${reducedMotion}: Clara minimized beside destination`);
    check(await page.locator('.home-clara-shell').count()===0,`${reducedMotion}: page revealed without expanded chat`);
    check(await page.evaluate(()=>!document.documentElement.hasAttribute('data-clara-conversation-active')),`${reducedMotion}: page unlocked`);
    await page.getByRole('button',{name:'Demander à Clara',exact:true}).click();
    check(await page.locator('.clara-form-assistant-panel').isVisible(),`${reducedMotion}: assistance can reopen`);
    await page.getByRole('button',{name:'Réduire Clara',exact:true}).click();
    check(await page.locator('.clara-form-assistant-panel').isHidden(),`${reducedMotion}: assistance can minimize again`);
    check(errors.length===0,`${reducedMotion}: no runtime errors: ${errors.join('; ')}`);
    await context.close();
  }
  console.log(`PASS ${checks} page-reveal checks`);
} finally { await browser.close();await server.close(); }
