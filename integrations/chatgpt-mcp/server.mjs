import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.UNPRO_MCP_TOKEN;
const BACKEND = process.env.UNPRO_INTERNAL_API_URL;
const BACKEND_TOKEN = process.env.UNPRO_INTERNAL_API_TOKEN;
const allowed = new Set(['search_contractors','get_contractor_details','get_appointment_slots','create_booking','get_booking_status']);
const definitions = [
  {name:'search_contractors',description:'Find verified Québec renovation contractors for a homeowner. Returns actual backend matches only.',inputSchema:{type:'object',additionalProperties:false,required:['service','city'],properties:{service:{type:'string',minLength:2},city:{type:'string',minLength:2},postal_code:{type:'string'},language:{type:'string',enum:['fr','en']},urgency:{type:'string'},budget_range:{type:'string'}}}},
  {name:'get_contractor_details',description:'Retrieve public verified contractor information.',inputSchema:{type:'object',additionalProperties:false,required:['contractor_id'],properties:{contractor_id:{type:'string'}}}},
  {name:'get_appointment_slots',description:'Check real appointment availability; no invented slots.',inputSchema:{type:'object',additionalProperties:false,required:['contractor_id','request_id','date_from','date_to'],properties:{contractor_id:{type:'string'},request_id:{type:'string'},date_from:{type:'string'},date_to:{type:'string'}}}},
  {name:'create_booking',description:'Book only after explicit homeowner consent; revalidate availability and use an idempotency key.',inputSchema:{type:'object',additionalProperties:false,required:['contractor_id','request_id','slot_id','homeowner','consent','idempotency_key'],properties:{contractor_id:{type:'string'},request_id:{type:'string'},slot_id:{type:'string'},homeowner:{type:'object',required:['name','email'],additionalProperties:false,properties:{name:{type:'string'},email:{type:'string'},phone:{type:'string'}}},consent:{type:'boolean',const:true},idempotency_key:{type:'string',minLength:8}}}},
  {name:'get_booking_status',description:'Retrieve backend-confirmed booking status.',inputSchema:{type:'object',additionalProperties:false,required:['booking_id'],properties:{booking_id:{type:'string'}}}}
];
function authorized(req) {
  if (!TOKEN) return false;
  const actual = req.headers.authorization || '';
  const expected = 'Bearer '+TOKEN;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
function reply(res,status,data){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'none'});res.end(JSON.stringify(data));}
function rpc(id,result){return {jsonrpc:'2.0',id,result};}
function error(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
function validate(schema,value){
  if(schema.const!==undefined && value!==schema.const)return false;
  if(schema.enum && !schema.enum.includes(value))return false;
  if(schema.type==='string')return typeof value==='string' && (!schema.minLength || value.length>=schema.minLength) && value.length<=2048;
  if(schema.type==='boolean')return typeof value==='boolean';
  if(schema.type==='object')return !!value && typeof value==='object' && !Array.isArray(value) && (schema.required||[]).every(k=>k in value) && (schema.additionalProperties!==false || Object.keys(value).every(k=>k in (schema.properties||{}))) && Object.entries(value).every(([k,v])=>!schema.properties?.[k] || validate(schema.properties[k],v));
  return true;
}
async function callBackend(name,args){
  if(!BACKEND || !BACKEND_TOKEN)throw new Error('Backend integration is not configured');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const url=new URL('/internal/chatgpt/'+name,BACKEND);
    if(url.protocol!=='https:' && url.hostname!=='localhost')throw new Error('Backend must use HTTPS');
    const response=await fetch(url,{method:'POST',headers:{'authorization':'Bearer '+BACKEND_TOKEN,'content-type':'application/json','x-unpro-source':'chatgpt_app','x-request-id':randomUUID()},body:JSON.stringify(args),signal:controller.signal,redirect:'error'});
    if(!response.ok)throw new Error('Backend returned '+response.status);
    const data=await response.json();
    if(!data || typeof data!=='object' || Array.isArray(data))throw new Error('Invalid backend response');
    return data;
  }finally{clearTimeout(timer);}
}
export const server=http.createServer(async(req,res)=>{
  if(req.url==='/health' && req.method==='GET')return reply(res,200,{status:'ok',backendConfigured:!!(BACKEND&&BACKEND_TOKEN)});
  if(req.url!=='/mcp' || req.method!=='POST')return reply(res,404,{error:'Not found'});
  if(!authorized(req))return reply(res,401,{error:'Unauthorized'});
  let body='';
  try{
    for await(const chunk of req){body+=chunk;if(body.length>65536)throw new Error('Request too large');}
    const msg=JSON.parse(body);
    if(msg.jsonrpc!=='2.0' || typeof msg.method!=='string')return reply(res,400,error(msg.id??null,-32600,'Invalid request'));
    if(msg.method==='initialize')return reply(res,200,rpc(msg.id,{protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'unpro-contractor-booking',version:'0.1.0'}}));
    if(msg.method==='notifications/initialized')return reply(res,202,{});
    if(msg.method==='tools/list')return reply(res,200,rpc(msg.id,{tools:definitions}));
    if(msg.method!=='tools/call')return reply(res,200,error(msg.id,-32601,'Method not found'));
    const name=msg.params?.name,args=msg.params?.arguments;
    if(!allowed.has(name))return reply(res,200,error(msg.id,-32602,'Unknown tool'));
    const def=definitions.find(d=>d.name===name);
    if(!validate(def.inputSchema,args))return reply(res,200,error(msg.id,-32602,'Invalid arguments'));
    try{
      const data=await callBackend(name,args);
      return reply(res,200,rpc(msg.id,{content:[{type:'text',text:JSON.stringify(data)}]}));
    }catch(e){
      console.error('Tool failed',name,e.message);
      return reply(res,200,rpc(msg.id,{isError:true,content:[{type:'text',text:'UNPRO could not verify this request with its live backend. No appointment or availability is confirmed.'}]}));
    }
  }catch(e){return reply(res,400,error(null,-32700,'Invalid JSON or request size'));}
});
if(process.env.NODE_ENV!=='test')server.listen(PORT,()=>console.log('UNPRO MCP listening on '+PORT));
