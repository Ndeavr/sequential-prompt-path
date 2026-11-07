// Offline reconstruction: no changes under active Edge directories, no remote calls.
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '../../..');
const temp = mkdtempSync(join(tmpdir(), 'unpro-postfire-'));
after(() => rmSync(temp, {recursive:true, force:true}));
for (const path of ['supabase/functions/_shared/insulationProject.ts','supabase/functions/alex-chat/index.ts']) {
  mkdirSync(dirname(join(temp,path)), {recursive:true});
  copyFileSync(join(root,path),join(temp,path));
}
execFileSync('git',['apply','--check',join(dir,'server.patch')],{cwd:temp});
execFileSync('git',['apply',join(dir,'server.patch')],{cwd:temp});
const {captureInsulationTurn:capture,nextInsulationQuestion:next,sanitizeInsulationContext:clean,evaluateInsulationRules:fit,postFireGuidance:guidance} = await import(pathToFileURL(join(temp,'supabase/functions/_shared/insulationProject.ts')));
const start=()=>capture({},'Isolation de mon immeuble suite à un feu');
const answer=(c,value)=>capture(c,value,next(c)?.q);
test('post-fire intake survives canonical JSON sanitization without invented readiness',()=>{
 const c=start();assert.deepEqual(clean(JSON.parse(JSON.stringify(c))),{insulation_post_fire:'declared'});
 assert.equal(next(c).field,'project_context.post_fire_access');
});
test('access, surface and preparation are asked separately; unknown stops site qualification',()=>{
 let c=answer(start(),'authorized_declared');assert.equal(next(c).field,'project_context.insulation_zone');
 c=answer(c,'walls');assert.equal(next(c).field,'project_context.post_fire_preparation');
 c=answer(c,'pending');assert.equal(next(c),null);assert.equal(c.insulation_zone,'walls');
 assert.equal(c.insulation_scope,undefined);assert.equal(fit(c,[]).eligible,false);
});
for(const access of ['prohibited','unknown']) test(`access ${access} suspends qualification and never requests photos`,()=>{
 const c=answer(start(),access);assert.equal(next(c),null);assert.match(guidance(c),/suspendre la qualification/);assert.match(guidance(c),/ni nouvelles photos/);
});
test('generic yes and unpaired enum do not manufacture access authorization',()=>{
 assert.equal(capture(start(),'oui',next(start()).q).post_fire_access,undefined);
 assert.equal(capture(start(),'authorized_declared','Quel est votre budget?').post_fire_access,undefined);
});
test('unknown or client supplied verification flags are discarded',()=>{
 assert.deepEqual(clean({...start(),verified:true,consent:true,post_fire_access:'verified',post_fire_preparation:'certified'}),start());
});
test('negative and hypothetical references do not establish post-fire scope',()=>{
 for(const message of ['Pas après un incendie','Si après un incendie','Not after a fire','Isolation sans incendie']) assert.equal(capture({},message).insulation_post_fire,undefined);
});
test('English declaration is retained',()=>assert.equal(capture({},'Insulation after a fire').insulation_post_fire,'declared'));
test('prior walls choice cannot silently become attic from a conversational mention',()=>{
 const c={...start(),insulation_zone:'walls'};assert.equal(capture(c,'Il y a aussi un grenier').insulation_zone,'walls');
});
test('declared completion and contractor priority cannot release specialized matching',()=>{
 const c={...start(),post_fire_access:'authorized_declared',post_fire_preparation:'completed_declared',insulation_zone:'attic',insulation_scope:'top_up_only'};
 assert.equal(fit(c,[{source:'declared',confirmed_by_contractor:true,rule_type:'priority',payload:{condition:'attic:top_up_only'}}]).eligible,false);
});
test('non-attic surfaces do not receive attic matching',()=>{
 for(const zone of ['walls','floors','multiple','unknown']) assert.equal(fit({insulation_zone:zone,insulation_scope:'top_up_only'},[]).eligible,false);
});
test('existing attic scope and condition remain independent',()=>{
 let c=capture({},'Mon isolant du grenier est sec et en bon état');
 c=capture(c,'Je veux ajouter seulement sans retrait');
 assert.equal(c.insulation_condition,'sound_dry');assert.equal(c.insulation_scope,'top_up_only');assert.equal(next(c),null);assert.equal(fit(c,[]).eligible,true);
});
test('special materials still fail closed and moisture never implies removal',()=>{
 for(const material of ['asbestos','vermiculite']) assert.equal(fit({contamination_suspected:material},[]).eligible,false);
 assert.equal(capture({insulation_zone:'attic'},'Il y a de la moisissure').insulation_scope,undefined);
});
test('runtime patch attaches policy only in existing homeowner branch',()=>{
 const source=readFileSync(join(temp,'supabase/functions/alex-chat/index.ts'),'utf8');
 assert.ok(source.includes('audience === "homeowner" && (insulationContext.insulation_zone === "attic" || insulationContext.insulation_post_fire === "declared")'));
 assert.ok(source.includes('systemPrompt += "\\n" + postFireGuidance(insulationContext)'));
});
