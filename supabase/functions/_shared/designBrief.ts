const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface DesignBrief {
  before_file_id: string; after_file_id: string; after_kind: 'ai_concept';
  description: string; room_type: string | null; version_id: string | null;
}
export function designReferenceIds(raw: unknown): string[] | null {
  if(!raw || typeof raw!=='object')return null;
  const v=raw as Record<string,unknown>;
  const before=v.beforeFileId ?? v.before_file_id, after=v.afterFileId ?? v.after_file_id;
  return typeof before==='string' && typeof after==='string' && UUID.test(before) && UUID.test(after) && before!==after ? [before,after] : null;
}
export function isOwnedDesignFile(file: Record<string,unknown>, userId:string): boolean {
  return file.user_id===userId && file.storage_bucket==='property-photos' && typeof file.storage_path==='string'
    && file.storage_path.startsWith(`${userId}/clara/`) && !file.storage_path.includes('..')
    && ['image/jpeg','image/png','image/webp'].includes(String(file.mime)) && Number(file.bytes)>0 && Number(file.bytes)<=10*1024*1024;
}
export function canReadSharedDesign(viewerId:string, ownerId:string, contractorUserId:string, contractorId:string, sharedContractorId:unknown, primary:boolean):boolean {
  return viewerId===ownerId || (primary && viewerId===contractorUserId && sharedContractorId===contractorId);
}
export function isDesignContractorEligible(pro:Record<string,unknown>):boolean {
  const expiry=pro.rbq_expiry_date;
  return pro.public_status==='verified_active' && pro.account_status==='active' && pro.verification_status==='verified'
    && pro.is_accepting_appointments===true && pro.booking_enabled===true
    && typeof pro.rbq_number==='string' && !!pro.rbq_number.trim() && pro.rbq_compliance_status==='verified' && !!pro.rbq_verified_at
    && (!expiry || (Number.isFinite(Date.parse(String(expiry))) && Date.parse(String(expiry))>Date.now()));
}

// Uses the existing project_files catalog and private property-photos bucket.
// deno-lint-ignore no-explicit-any
export async function loadOwnedDesignBrief(db:any,userId:string,raw:unknown):Promise<DesignBrief|null> {
  const ids=designReferenceIds(raw);if(!ids)return null;
  const {data,error}=await db.from('project_files').select('id,user_id,storage_bucket,storage_path,mime,bytes').in('id',ids).eq('user_id',userId);
  if(error || !Array.isArray(data) || data.length!==2 || !data.every((file:Record<string,unknown>)=>isOwnedDesignFile(file,userId)))return null;
  const v=raw as Record<string,unknown>;
  return {before_file_id:ids[0],after_file_id:ids[1],after_kind:'ai_concept',description:typeof v.description==='string'?v.description.slice(0,2000):'',room_type:typeof v.room_type==='string'?v.room_type.slice(0,60):null,version_id:typeof v.version_id==='string'?v.version_id.slice(0,120):null};
}

// deno-lint-ignore no-explicit-any
export async function designAccessAction(db:any,userId:string,body:Record<string,unknown>):Promise<{status:number;body:Record<string,unknown>}> {
  const reply=(status:number,value:Record<string,unknown>)=>({status,body:value});
  const matchId=typeof body.match_id==='string' && UUID.test(body.match_id)?body.match_id:null;
  if(!matchId)return reply(400,{ok:false,error:'invalid_match'});
  const {data:match,error:matchError}=await db.from('matches').select('id,lead_id,contractor_id,status,response_status').eq('id',matchId).maybeSingle();
  if(matchError || !match)return reply(404,{ok:false,error:'match_not_found'});
  const {data:lead,error:leadError}=await db.from('leads').select('id,owner_profile_id,payload,assigned_match_id').eq('id',match.lead_id).maybeSingle();
  if(leadError || !lead)return reply(404,{ok:false,error:'lead_not_found'});
  const {data:pro}=await db.from('contractors').select('id,user_id,public_status,account_status,verification_status,is_accepting_appointments,booking_enabled,rbq_number,rbq_compliance_status,rbq_verified_at,rbq_expiry_date').eq('id',match.contractor_id).maybeSingle();
  const payload=lead.payload ?? {};
  const primary=match.status==='primary' && lead.assigned_match_id===match.id && !['declined','rejected','expired','cancelled','canceled'].includes(String(match.response_status ?? '').toLowerCase());
  if (userId!==lead.owner_profile_id && (!pro || !canReadSharedDesign(userId,lead.owner_profile_id,pro.user_id,pro.id,payload.design_shared_contractor_id,primary))) return reply(403,{ok:false,error:'photos_not_shared'});
  const brief=await loadOwnedDesignBrief(db,lead.owner_profile_id,payload.design_context);
  if(!brief)return reply(200,{ok:true,images:[],shared:false});
  if(body.action==='share_design') {
    if(lead.owner_profile_id!==userId || !primary || !pro || !isDesignContractorEligible(pro))return reply(403,{ok:false,error:'selection_not_allowed'});
    if(payload.design_shared_contractor_id===pro.id)return reply(200,{ok:true,shared:true,replayed:true});
    const updatedPayload={...payload,design_shared_contractor_id:pro.id,design_shared_at:new Date().toISOString()};
    let query=db.from('leads').update({payload:updatedPayload}).eq('id',lead.id).eq('owner_profile_id',userId);
    query=payload.design_shared_contractor_id ? query.eq('payload->>design_shared_contractor_id',payload.design_shared_contractor_id) : query.is('payload->>design_shared_contractor_id',null);
    const {data:updated,error}=await query.select('id').maybeSingle();
    if(error || !updated)return reply(409,{ok:false,error:'selection_changed_retry'});
    // One application notification, to this selected professional only; no SMS/email.
    if(pro.user_id)await db.from('notifications').insert({profile_id:pro.user_id,type:'design_brief',title:'Un projet avant/après vous est confié',body:'Le propriétaire a choisi votre entreprise et partagé ses photos avant/après.',channel:'in_app',status:'pending',entity_type:'lead',entity_id:lead.id,metadata:{match_id:match.id,lead_id:lead.id,url:'/pro/matched-leads'}});
    return reply(200,{ok:true,shared:true});
  }
  if(body.action!=='get_design_photos')return reply(400,{ok:false,error:'invalid_design_action'});
  if(!pro || !canReadSharedDesign(userId,lead.owner_profile_id,pro.user_id,pro.id,payload.design_shared_contractor_id,primary))return reply(403,{ok:false,error:'photos_not_shared'});
  const ids=[brief.before_file_id,brief.after_file_id];
  const {data:files,error:fileError}=await db.from('project_files').select('id,storage_path').in('id',ids).eq('user_id',lead.owner_profile_id);
  if(fileError || !files || files.length!==2)return reply(503,{ok:false,error:'photos_unavailable'});
  const images=[];
  for(let i=0;i<ids.length;i++) {
    const file=files.find((entry:{id:string})=>entry.id===ids[i]);
    if(!file)return reply(503,{ok:false,error:'photos_unavailable'});
    const {data,error}=await db.storage.from('property-photos').createSignedUrl(file.storage_path,300);
    if(error || !data?.signedUrl)return reply(503,{ok:false,error:'photos_unavailable'});
    images.push({role:i===0?'before':'after',label:i===0?'Avant — espace actuel':'Après — concept IA',url:data.signedUrl});
  }
  return reply(200,{ok:true,images,shared:payload.design_shared_contractor_id===pro.id});
}
