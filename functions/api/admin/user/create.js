import{verifyAdmin}from'../_auth.js';
const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-token'};
function genTok(){const ch='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';let t='';for(let i=0;i<32;i++)t+=ch[Math.floor(Math.random()*ch.length)];return t;}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  if(!verifyAdmin(request,env))return Response.json({error:'unauthorized'},{status:403,headers:c});
  try{
    const{email,password,name}=await request.json();
    if(!email||!password)return Response.json({error:'missing'},{status:400,headers:c});
    const key='user:'+email.toLowerCase();
    if(await env.SIGNAL_KV.get(key))return Response.json({error:'exists'},{status:409,headers:c});
    const token=genTok();
    const user={email:email.toLowerCase(),password,name:name||'',token,active:true,blocked:false,usageCount:0,createdAt:new Date().toISOString(),lastUsed:null};
    await env.SIGNAL_KV.put(key,JSON.stringify(user));
    await env.SIGNAL_KV.put('token:'+token,email.toLowerCase());
    return Response.json({ok:true,token},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
