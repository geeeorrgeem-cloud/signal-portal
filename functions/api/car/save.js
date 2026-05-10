const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  try{
    const{token,car}=await request.json();
    if(!token||!car)return Response.json({error:'missing'},{status:400,headers:c});
    const email=await env.SIGNAL_KV.get('token:'+token);
    if(!email)return Response.json({error:'invalid token'},{status:403,headers:c});
    const raw=await env.SIGNAL_KV.get('user:'+email);
    if(!raw)return Response.json({error:'user not found'},{status:403,headers:c});
    const u=JSON.parse(raw);
    if(u.blocked||!u.active)return Response.json({error:'account disabled'},{status:403,headers:c});
    await env.SIGNAL_KV.put('car:'+token,JSON.stringify(car));
    return Response.json({ok:true},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
