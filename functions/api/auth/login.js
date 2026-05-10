const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-token'};
export async function onRequestOptions(){return new Response(null,{headers:c});}
export async function onRequestPost({request,env}){
  try{
    const{email,password}=await request.json();
    if(!email||!password)return Response.json({error:'missing'},{status:400,headers:c});
    const raw=await env.SIGNAL_KV.get('user:'+email.toLowerCase());
    if(!raw)return Response.json({error:'invalid'},{status:401,headers:c});
    const u=JSON.parse(raw);
    if(u.password!==password)return Response.json({error:'invalid'},{status:401,headers:c});
    if(u.blocked)return Response.json({error:'blocked'},{status:403,headers:c});
    if(!u.active)return Response.json({error:'inactive'},{status:403,headers:c});
    u.lastUsed=new Date().toISOString();u.usageCount=(u.usageCount||0)+1;
    await env.SIGNAL_KV.put('user:'+email.toLowerCase(),JSON.stringify(u));
    return Response.json({token:u.token,email:u.email,name:u.name},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
