/** Actual /design route, with all remote services mocked; no production writes. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium } from '@playwright/test';
const server = await createServer({ configFile:false, plugins:[react()], resolve:{alias:{'@':path.resolve('src')}}, optimizeDeps:{entries:[]}, server:{host:'127.0.0.1',port:8080,strictPort:true} });
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
let checks=0; const check=(condition,label)=>{assert.ok(condition,label);checks++;};
try {
 for(const width of [360,390,1280]) {
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
  let generations=0; let request;
  await context.route('**/*',async route=>{
    const url=route.request().url(); if(new URL(url).hostname==='127.0.0.1')return route.continue();
    if(url.includes('/functions/v1/design-generate')) {
      const body=route.request().postDataJSON();
      if(body.action==='identify_room')return route.fulfill({json:{room_type:'kitchen'}});
      if(body.action==='generate') {
        generations++; request=body;
        if(generations===1) { await new Promise(resolve=>setTimeout(resolve,2200)); return route.fulfill({status:503,json:{error:'Le service de génération est momentanément indisponible.'}}); }
        return route.fulfill({json:{versions:[{id:'qa-v1',imageUrl:'http://127.0.0.1:8080/src/assets/design-after-1.jpg'}]}});
      }
    }
    if(url.includes('/functions/v1/clara-session'))return route.fulfill({json:{session_id:'qa',session_token:'qa',messages:[],context:{},language:'fr',auth_state:'guest'}});
    return route.fulfill({json:[]});
  });
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8080/design',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'[title*="HUD"] { pointer-events:none!important; }'});
  const camera=page.getByRole('button',{name:'Prendre une photo',exact:true}); await camera.waitFor({timeout:90000});
  const cameraChooser=page.waitForEvent('filechooser');await camera.click();const chooser=await cameraChooser;
  check(await chooser.element().getAttribute('capture')==='environment',`${width}: camera uses rear-camera capture`);
  const galleryChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Galerie',exact:true}).click();const gallery=await galleryChooser;
  check(await gallery.element().getAttribute('capture')===null,`${width}: gallery is separate`);
  await gallery.setFiles('src/assets/design-before-1.jpg');
  await page.getByRole('button',{name:'Commencer le design',exact:true}).click();
  const prompt=page.getByPlaceholder('Décrivez les changements souhaités…');await prompt.waitFor();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no horizontal overflow`);
  check(await page.getByRole('button',{name:'Dupliquer cette version'}).isDisabled(),`${width}: no invalid version action`);
  await prompt.fill('Peindre les murs en blanc');
  const generate=page.getByRole('button',{name:'Générer 3 versions',exact:true}).filter({visible:true});await generate.click();
  await page.getByText('Le service de génération est momentanément indisponible.',{exact:true}).waitFor();
  await page.getByText('Votre design est en cours…',{exact:true}).waitFor({state:'hidden'});
  check(!(await page.getByText('Votre design est en cours…',{exact:true}).isVisible()),`${width}: signup overlay releases controls after failure`);
  check(await prompt.inputValue()==='Peindre les murs en blanc',`${width}: failed generation preserves prompt`);
  check(await generate.isEnabled(),`${width}: retry remains usable`);
  check(request.imageBase64.length<1_400_000,`${width}: bounded photo payload`);
  await generate.click();
  await page.getByRole('button',{name:'Dupliquer cette version'}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Dupliquer cette version"]').disabled);
  check(await page.getByRole('button',{name:'Dupliquer cette version'}).isEnabled(),`${width}: generated version unlocks actions`);
  if(width<1000){await page.setViewportSize({width,height:480}); await prompt.fill('Armoires vertes');check(await prompt.inputValue()==='Armoires vertes',`${width}: keyboard-height input preserved`);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: reduced viewport no overflow`);}
  check(errors.length===0,`${width}: no runtime errors: ${errors.join('; ')}`);
  await context.close();
 }
 console.log(`PASS ${checks} design real-DOM checks`);
} finally {await browser.close();await server.close();}
