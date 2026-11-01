/** Mobile/desktop real DOM. All services are fixtures; no production writes. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {chromium} from '@playwright/test';
const server=await createServer({cacheDir:path.resolve("node_modules/.vite-clara-qualification"),configFile:false,plugins:[react()],resolve:{alias:{'@':path.resolve('src')}},optimizeDeps:{entries:[]},server:{host:'127.0.0.1',port:8080,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for (const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>{
   if(new URL(route.request().url()).hostname==='127.0.0.1') return route.continue();
   if(route.request().url().includes('/functions/v1/clara-session')) return route.fulfill({json:{session_id:'qa',session_token:'qa-token',messages:[{id:'photo-prompt',role:'assistant',text:'Une photo du grenier? [[CHOIX: Ajouter une photo | Continuer sans photo]]'}],context:{},language:'fr',current_step:'chat',auth_state:'guest',resumed:true}});
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();
  let pickers=0; page.on('filechooser',()=>pickers++);
  await page.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'[title*="HUD"] { pointer-events:none!important; }'});
  await page.getByRole('button',{name:'📷 Ajouter une photo',exact:true}).click({timeout:90000});
  const menu=page.getByRole('menu',{name:'Ajouter une photo ou un document'});
  await menu.waitFor({state:'visible'});
  assert.equal(pickers,0,'Suggestion must not open camera or file picker');
  const rect=await menu.boundingBox();assert.ok(rect.x>=0 && rect.x+rect.width<=width && rect.y>=0 && rect.y+rect.height<=900,'Menu fits viewport');
  const chooser=page.waitForEvent('filechooser');
  await menu.getByRole('menuitem',{name:'Ajouter une photo',exact:true}).click();
  const gallery=await chooser;
  assert.equal(await gallery.element().getAttribute('capture'),null,'Gallery must not force camera');
  await page.getByRole('button',{name:'Ajouter une photo ou un document',exact:true}).click();
  const camera=page.waitForEvent('filechooser');
  await menu.getByRole('menuitem',{name:'Prendre une photo',exact:true}).click();
  assert.equal(await (await camera).element().getAttribute('capture'),'environment');
  await page.getByRole('button',{name:'Ajouter une photo ou un document',exact:true}).click();
  await page.keyboard.press('Escape');
  assert.equal(await menu.count(),0);
  console.log(`PASS ${width}px: suggestion opens shared menu, gallery/camera choices and Escape work`);
  await context.close();
 }
} finally {await browser.close();await server.close();}
