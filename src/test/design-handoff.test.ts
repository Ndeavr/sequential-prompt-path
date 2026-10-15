import { describe, it, expect } from 'vitest';
import { designAccessAction, designReferenceIds, isOwnedDesignFile, isDesignContractorEligible } from '../../supabase/functions/_shared/designBrief';
const owner='owner', proUser='pro-user', proId='pro';
const before='11111111-1111-1111-1111-111111111111', after='22222222-2222-2222-2222-222222222222', matchId='33333333-3333-3333-3333-333333333333';
const eligible={id:proId,user_id:proUser,public_status:'verified_active',account_status:'active',verification_status:'verified',is_accepting_appointments:true,booking_enabled:true,rbq_number:'123',rbq_compliance_status:'verified',rbq_verified_at:'2026-01-01',rbq_expiry_date:null};
function fixture(shared=false,primary=true) {
 const lead={id:'lead',owner_profile_id:owner,assigned_match_id:matchId,payload:{design_context:{before_file_id:before,after_file_id:after,description:'Blanc'},...(shared?{design_shared_contractor_id:proId}:{})}};
 const match={id:matchId,lead_id:'lead',contractor_id:proId,status:primary?'primary':'secondary',response_status:'pending'};
 const files=[before,after].map(id=>({id,user_id:owner,storage_bucket:'property-photos',storage_path:`${owner}/clara/${id}.jpg`,mime:'image/jpeg',bytes:1024}));
 let signed=0,notifications=0,updates=0;
 const db={from(table:string){let update: Record<string, unknown> | undefined;const q={select(){return q},in(){return q},eq(){return q},is(){return q},update(value:Record<string,unknown>){update=value;return q},insert(){notifications++;return Promise.resolve({error:null})},maybeSingle(){if(update){updates++;Object.assign(lead,update);return Promise.resolve({data:{id:'lead'},error:null})}return Promise.resolve({data:table==='matches'?match:table==='leads'?lead:eligible,error:null})},then(resolve:(v:unknown)=>unknown){return Promise.resolve({data:files,error:null}).then(resolve)}};return q},storage:{from(){return {createSignedUrl(path:string,seconds:number){expect(seconds).toBe(300);signed++;return Promise.resolve({data:{signedUrl:`https://private/${path}`},error:null})}}}}};
 return {db,counts:()=>({signed,notifications,updates})};
}
describe('design handoff uses the existing private files and chosen match',()=>{
 it('rejects invalid refs and files from another owner/public path',()=>{
  expect(designReferenceIds({beforeFileId:before,afterFileId:after})).toEqual([before,after]);
  expect(designReferenceIds({beforeFileId:before,afterFileId:before})).toBeNull();
  expect(isOwnedDesignFile({user_id:'outsider',storage_bucket:'property-photos',storage_path:`${owner}/clara/a.jpg`,mime:'image/jpeg',bytes:1},owner)).toBe(false);
  expect(isOwnedDesignFile({user_id:owner,storage_bucket:'public',storage_path:`${owner}/clara/a.jpg`,mime:'image/jpeg',bytes:1},owner)).toBe(false);
 });
 it('excludes unverified or expired contractors',()=>{
  expect(isDesignContractorEligible(eligible)).toBe(true);
  expect(isDesignContractorEligible({...eligible,public_status:'published_pending_verification'})).toBe(false);
  expect(isDesignContractorEligible({...eligible,rbq_expiry_date:'2000-01-01'})).toBe(false);
 });
 it('never signs photos for an unselected contractor or an outsider',async()=>{
  const f=fixture();expect((await designAccessAction(f.db,proUser,{action:'get_design_photos',match_id:matchId})).status).toBe(403);
  expect((await designAccessAction(f.db,'outsider',{action:'get_design_photos',match_id:matchId})).status).toBe(403);
  expect(f.counts().signed).toBe(0);
 });
 it('shares once to the primary recipient and grants short access',async()=>{
  const f=fixture();expect((await designAccessAction(f.db,owner,{action:'share_design',match_id:matchId})).body.shared).toBe(true);
  expect((await designAccessAction(f.db,owner,{action:'share_design',match_id:matchId})).body.replayed).toBe(true);
  const result=await designAccessAction(f.db,proUser,{action:'get_design_photos',match_id:matchId});
  expect(result.status).toBe(200);expect(result.body.images).toHaveLength(2);
  expect(f.counts()).toEqual({signed:2,notifications:1,updates:1});
 });
 it('revokes recipient access when the canonical match changes',async()=>{
  const f=fixture(true,false);expect((await designAccessAction(f.db,proUser,{action:'get_design_photos',match_id:matchId})).status).toBe(403);
  expect((await designAccessAction(f.db,owner,{action:'share_design',match_id:matchId})).status).toBe(403);
  expect(f.counts()).toEqual({signed:0,notifications:0,updates:0});
 });
});
