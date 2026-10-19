import { describe, it, expect } from 'vitest';
import { captureInsulationTurn, evaluateInsulationRules, nextInsulationQuestion, sanitizeInsulationContext, type ProjectRule } from '../../supabase/functions/_shared/insulationProject';
import { resolveCompatibilityPack, validateCompatibilityPack } from '../../supabase/functions/_shared/compatibilityPackPolicy';
import { getCompatPack, packVisibleProjectQuestions } from '../config/compatibilityPacks';
import { createEmptyGraph } from '../lib/alexQualification/qualificationGraph';
import { pickNextQuestion } from '../lib/alexQualification/nextQuestionSelector';
import { materialize, mergeAnswers } from '../../supabase/functions/_shared/contractorCompatibility';
const rule = (condition: string, type='priority', source='declared'): ProjectRule => ({rule_type:type, payload:{condition},source,confirmed_by_contractor:true});
describe('isolation interventions — synthetic, no remote calls', () => {
 it('resolves isolation from existing domain and preserves stored excavation',()=>{
  expect(resolveCompatibilityPack(null,'Isolation')).toBe('isolation_entretoit');
  expect(resolveCompatibilityPack('excavation_fondation','Isolation')).toBe('excavation_fondation');
  expect(resolveCompatibilityPack(null,null,['Isolation entretoit'])).toBe('isolation_entretoit');
 });
 it('rejects arbitrary and unauthorized client packs',()=>{
  expect(()=>validateCompatibilityPack('fake',null,'Isolation',[],true)).toThrow('invalid_trade_pack');
  expect(()=>validateCompatibilityPack('isolation_entretoit',null,'Excavation',[],false)).toThrow('trade_pack_not_authorized');
  expect(validateCompatibilityPack('isolation_entretoit',null,'Excavation',[],true)).toBe('isolation_entretoit');
 });
 it('finalized isolation pack is preserved even when specialty differs',()=>{
  expect(validateCompatibilityPack('isolation_entretoit','isolation_entretoit','Excavation',[],false)).toBe('isolation_entretoit');
 });
 it('uses separate isolation and excavation catalogues',()=>{
  const iso=getCompatPack('isolation_entretoit');
  expect(iso.services.some(s=>s.slug==='retrait_isolant')).toBe(true);
  expect(iso.services.some(s=>s.slug==='amiante')).toBe(true);
  expect(iso.services.some(s=>s.slug==='drain_francais')).toBe(false);
  expect(packVisibleProjectQuestions(iso,{retrait_isolant:'priority'}).some(q=>q.key==='removal_before_install')).toBe(true);
  expect(getCompatPack('excavation_fondation').services.some(s=>s.slug==='drain_francais')).toBe(true);
 });
 it('explicit full removal prefers confirmed removal project acceptance',()=>{
  const c={insulation_scope:'removal_before_install'};
  expect(evaluateInsulationRules(c,[rule('attic:removal_before_install')]).boost).toBe(10);
  expect(evaluateInsulationRules(c,[rule('attic:top_up_only')]).boost).toBe(0);
 });
 it('top-up prefers top-up specialist and excludes confirmed removal-only refusal',()=>{
  const c={insulation_scope:'top_up_only'};
  expect(evaluateInsulationRules(c,[rule('attic:top_up_only')]).boost).toBe(10);
  expect(evaluateInsulationRules(c,[rule('attic:removal_before_install')]).boost).toBe(0);
  expect(evaluateInsulationRules(c,[rule('attic:top_up_only','hard_exclusion')]).eligible).toBe(false);
 });
 it('unknown or absent scope remains eligible with zero invented boost',()=>{
  for(const c of [{},{insulation_scope:'unknown'}]) expect(evaluateInsulationRules(c,[rule('attic:removal_before_install','hard_exclusion')])).toEqual({eligible:true,boost:0,reasons:[]});
 });
 it('ignores inferred or unconfirmed project refusals',()=>{
  const c={insulation_scope:'removal_before_install'};
  expect(evaluateInsulationRules(c,[rule('attic:removal_before_install','hard_exclusion','inferred')]).eligible).toBe(true);
  expect(evaluateInsulationRules(c,[{...rule('attic:removal_before_install','hard_exclusion'),confirmed_by_contractor:false}]).eligible).toBe(true);
 });
 it('damage and contamination favour assessment without forcing removal',()=>{
  for(const condition of ['damaged','contaminated']) {
   const c={insulation_condition:condition};
   expect(evaluateInsulationRules(c,[rule('attic:removal_before_install','hard_exclusion')]).eligible).toBe(true);
   expect(evaluateInsulationRules(c,[rule('attic:remediation_assessment')]).boost).toBe(10);
   expect(sanitizeInsulationContext(c).insulation_scope).toBeUndefined();
  }
 });
 it('openness to assessment is not an explicit full removal requirement',()=>{
  expect(evaluateInsulationRules({insulation_scope:'assessment'},[rule('attic:removal_before_install')]).boost).toBe(10);
  expect(evaluateInsulationRules({insulation_scope:'assessment'},[rule('attic:removal_before_install','hard_exclusion')]).eligible).toBe(true);
 });
 it.each(['vermiculite','asbestos'])('%s never reaches ordinary removal specialists even with declared priority',material=>{
  expect(evaluateInsulationRules({contamination_suspected:material},[rule('attic:removal_before_install')]).eligible).toBe(false);
 });
 it('depends adds clarification, not refusal or invented boost',()=>{
  const r=evaluateInsulationRules({insulation_scope:'removal_before_install'},[rule('attic:removal_before_install','soft_preference')]);
  expect(r.eligible).toBe(true);expect(r.boost).toBe(0);expect(r.reasons.length).toBe(1);
 });
 it('two actual conversation turns keep condition separate from scope',()=>{
  let c=captureInsulationTurn({},'Je veux isoler mon entretoit.');
  const q=nextInsulationQuestion(c);expect(q?.field).toBe('project_context.insulation_condition');
  c=captureInsulationTurn(c,'Je ne sais pas',q?.q);
  const scope=nextInsulationQuestion(c);expect(scope?.field).toBe('project_context.insulation_scope');
  c=captureInsulationTurn(c,'Tout retirer et recommencer',scope?.q);
  expect(c.insulation_condition).toBe('unknown');expect(c.insulation_scope).toBe('removal_before_install');expect(nextInsulationQuestion(c)).toBeNull();
 });
 it('moisture/mold/ice dams never imply full removal',()=>{
  for(const s of ['Il y a des barrages de glace','Humidité dans le grenier','Moisissure dans le grenier']) expect(captureInsulationTurn({insulation_zone:'attic'},s).insulation_scope).toBeUndefined();
 });
 it('dry sound insulation and top-up retain independent facts',()=>{
  let c=captureInsulationTurn({},'Mon isolant du grenier est sec et en bon état');
  c=captureInsulationTurn(c,'Je veux ajouter seulement sans retrait');
  expect(c.insulation_condition).toBe('sound_dry');expect(c.insulation_scope).toBe('top_up_only');
 });
 it('unknown condition advances once, with one neutral next question',()=>{
  const g=createEmptyGraph();g.problem={category:'insulation',sub_type:'attic',description:'isolant'};g.property={...g.property,address:'1 rue QA',confirmed:true};
  expect(pickNextQuestion(g)?.field).toBe('project_context.insulation_condition');
  g.project_context.insulation_condition='unknown';expect(pickNextQuestion(g)?.field).toBe('project_context.insulation_scope');
 });
 it('edits preserve previous explicit confirmations and materialize yes project rules',async()=>{
  const a=mergeAnswers({projects:{'attic:top_up_only':{answer:'no'}},services:{retrait_isolant:{stance:'priority'}}},{projects:{'attic:removal_before_install':{answer:'yes'}}});
  expect(a.projects?.['attic:top_up_only'].answer).toBe('no');
  const captured:any[]=[];let disables=0;
  const db={from(table:string){const c:any={};for(const method of ['upsert','update','eq','delete','select','not']) c[method]=()=>c;
   c.then=(resolve:any)=>resolve({data:[],error:null});
   if(table==='contractor_matching_rules'){c.upsert=(rows:any[])=>{captured.push(...rows);return c};c.update=()=>{disables++;return c};}return c;}};
  await materialize(db,'synthetic',a,{finalize:true});await materialize(db,'synthetic',a,{finalize:true});
  expect(disables).toBe(2);expect(captured.filter(r=>r.rule_key==='project:attic:removal_before_install').every(r=>r.rule_type==='priority')).toBe(true);
  expect(captured.some(r=>r.rule_key==='project:attic:top_up_only'&&r.rule_type==='hard_exclusion')).toBe(true);
 });
 it('invalid context cannot supply a verification or arbitrary matching key',()=>{
  expect(sanitizeInsulationContext({insulation_scope:'total_removal_diagnosed',verified:true,insulation_condition:'unknown'})).toEqual({insulation_condition:'unknown'});
 });
});
