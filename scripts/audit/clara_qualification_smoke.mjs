/** Mobile/desktop real DOM. All services are fixtures; no production writes. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {chromium} from '@playwright/test';
const server=await createServer({configFile:false,plugins:[react()],resolve:{alias:{'@':path.resolve('src')}},optimizeDeps:{entries:[]},server:{host:'127.0.0.1',port:8080,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
try {
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    localStorage.setItem('unpro_clara_session_token','qa-token');
    localStorage.setItem('unpro_clara_contractor_qualification',JSON.stringify({business_name:'Entreprise QA',google_place_id:'qa-place',primary_trade:'Isolation',customer_type:'Résidentiel',business_city:'Terrebonne',service_areas:['Laval'],goals:['Plus de contrats'],provenance:{primary_trade:'declared'}}));
    sessionStorage.setItem('unpro_clara_contractor_flow',JSON.stringify({priority:'contracts',contract_goal:3,session_token:'qa-token'}));
  });
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).hostname==='127.0.0.1') return route.continue();
    const url=route.request().url();
    if(url.includes('/functions/v1/clara-session'))return route.fulfill({json:{session_id:'qa',session_token:'qa-token',messages:[],context:{},language:'fr',current_step:'chat',auth_state:'guest',resumed:false}});
    if(url.includes('/functions/v1/ai-recommendation-audit'))return route.fulfill({json:{ok:true,audit_id:'qa',token:'qa-audit',generated_at:new Date().toISOString(),readiness_score:null,baseline:{facts:[],missions:[],level:'partial',matched:{merged_sources:[]}},gaps:[]}});
    if(url.includes('/functions/v1/alex-chat'))return route.fulfill({json:{patch:{preferred_work:['Isolation'],excluded_areas:['Montréal'],preferred_project_sizes:["Projets d’envergure"]},clarification:null}});
    return route.fulfill({json:[]});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
  // The dev-only auth HUD is absent from production and overlaps controls at 390px.
  await page.addStyleTag({content:'[title*="HUD"] { pointer-events: none !important; }'});
  await page.getByRole('button',{name:'Je suis entrepreneur',exact:true}).click({timeout:90000});
  const goal = page.getByRole('button',{name:'Obtenir plus de contrats',exact:true});
  if(await goal.isVisible()) { await goal.click(); await page.getByRole('button',{name:'Continuer',exact:true}).click(); }
  
  await page.getByText('Décrivez-moi le contrat idéal pour vous : qu’est-ce qui vous donne envie de le prendre?',{exact:true}).waitFor({timeout:30000});
  const composer=page.locator('.home-clara-textarea');
  await composer.fill("J'aime les gros travaux d'isolation, mais je ne travaille jamais à Montréal.");
  await page.getByRole('button',{name:/^(Envoyer|Send)$/}).click();
  const summary=page.getByRole('article',{name:'Votre profil se construit'});
  await summary.waitFor({timeout:30000});
  check(await page.locator('#clara-criterion-excluded_areas').evaluate(el=>Number(getComputedStyle(el).color.match(/\d+/)[0])>150),`${width}: readable criterion text`);
  check(await page.locator('#clara-criterion-excluded_areas').inputValue()==='Montréal',`${width}: useful exclusion`);
  check(await page.locator('#clara-criterion-preferred_project_sizes').inputValue()==="Projets d’envergure",`${width}: contract size`);
  const validation = page.getByRole('button',{name:'C’est bien ça',exact:true});
  const contractGoal = page.getByRole('button',{name:'3',exact:true});
  await validation.or(contractGoal).first().waitFor({timeout:30000});
  if(await contractGoal.isVisible()) await contractGoal.click();
  await validation.waitFor();
  await page.locator('#clara-criterion-excluded_areas').fill('Québec');
  await page.getByRole('button',{name:'C’est bien ça',exact:true}).click();
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('unpro_clara_contractor_qualification')).excluded_areas[0])==='Québec',`${width}: correction saved`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no horizontal overflow`);
  check(errors.length===0,`${width}: no runtime error: ${errors.join(';')}`);
  await page.screenshot({path:`/workspace/scratch/763541eb4bf7/clara-summary-${width}.png`,fullPage:false});
  await context.close();
 }
 console.log(`PASS ${checks} Clara qualification DOM checks`);
}finally{await browser.close();await server.close();}
