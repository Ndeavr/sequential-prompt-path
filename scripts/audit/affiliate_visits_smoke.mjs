// Real DOM of the shipped summary/hook. All network data is fixture-only.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { chromium, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = '<html><body><div id="root"></div><script type="module" src="/qa-affiliate-entry.tsx"></script></body></html>';
const entry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {AffiliateVisitSummary} from '/src/components/affiliate/AffiliateVisitSummary.tsx';
import '/src/index.css';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AffiliateVisitSummary affiliateId="qa-affiliate" /></QueryClientProvider>);`;
const server = await createServer({root, configFile:false, cacheDir:'node_modules/.vite-affiliate-qa',
  plugins:[react(), {
    name:'affiliate-qa-fixtures', enforce:'pre',
    resolveId(id) { if(id==='/qa-affiliate-entry.tsx') return path.join(root,'qa-affiliate-entry.tsx'); },
    load(id) { if(id===path.join(root,'qa-affiliate-entry.tsx')) return entry; if(id===path.join(root,'src/hooks/useAuth.ts')) return 'export const useAuth=()=>({user:{id:"qa-user"}});'; },
    configureServer(s) { s.middlewares.use('/qa-affiliate',async (_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-affiliate',html));}); },
  }], resolve:{alias:{'@':path.join(root,'src')}},
  optimizeDeps:{include:['react','react-dom/client','@tanstack/react-query']},
  server:{host:'127.0.0.1',port:8095,strictPort:true},
});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
let checks=0;
try {
  for(const width of [360,390,1280]) {
    const context=await browser.newContext({viewport:{width,height:844}});
    let mode='loading', calls=0, release;
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1') return route.continue();
      if(url.pathname.endsWith('/rpc/get_affiliate_visit_stats')) {
        calls++;
        assert.deepEqual(route.request().postDataJSON(),{p_affiliate_id:'qa-affiliate'});
        if(mode==='loading') await new Promise(resolve=>{release=resolve;});
        if(mode==='error') return route.fulfill({status:503,json:{message:'fixture unavailable'}});
        return route.fulfill({json:[{affiliate_id:'qa-affiliate',total_sessions:40,internal_sessions:2,attributed_sessions:38}]});
      }
      return route.fulfill({json:[]});
    });
    const page=await context.newPage(), errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    await page.goto('http://127.0.0.1:8095/qa-affiliate');
    await expect(page.getByRole('status')).toHaveText('Chargement des visites…'); checks++;
    await expect.poll(()=>typeof release).toBe('function');
    mode='error';release();
    await expect(page.getByRole('alert')).toContainText('temporairement indisponibles');checks++;
    assert.equal(await page.getByText('0',{exact:true}).count(),0);checks++;
    mode='success';await page.getByRole('button',{name:'Réessayer'}).click();
    await expect(page.getByText('38',{exact:true})).toBeVisible();checks++;
    await expect(page.getByText('2',{exact:true})).toBeVisible();checks++;
    await expect(page.getByText(/40 sessions enregistrées/)).toBeVisible();checks++;
    assert.equal(calls,2); checks++;
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
    assert.deepEqual(errors,[]);checks++;
    await context.close();
  }
  console.log(`PASS ${checks} affiliate visit DOM checks (360, 390, 1280 px); fixture-only network.`);
} finally {await browser.close();await server.close();}
