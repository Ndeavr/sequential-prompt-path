import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from './server.mjs';
test('MCP authorization, discovery and fail-closed behavior',async()=>{
  await new Promise(resolve=>server.listen(0,resolve));
  const url='http://127.0.0.1:'+server.address().port+'/mcp';
  const post=(body,token='test-secret')=>fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
  try{
    let r=await post({jsonrpc:'2.0',id:1,method:'tools/list'},'wrong');assert.equal(r.status,401);
    r=await post({jsonrpc:'2.0',id:2,method:'tools/list'});assert.equal((await r.json()).result.tools.length,5);
    r=await post({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'create_booking',arguments:{consent:false}}});assert.equal((await r.json()).error.code,-32602);
    r=await post({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'search_contractors',arguments:{service:'toiture',city:'Laval'}}});assert.equal((await r.json()).result.isError,true);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
