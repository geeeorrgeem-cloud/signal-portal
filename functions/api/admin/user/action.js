const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-token'};
function vA(req,env){const t=req.headers.get('x-admin-token');if(!t||!env.ADMIN_PASSWORD)return false;return t===btoa('admin:'+env.ADMIN_PASSWORD);}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  if(!vA(request,env))return Response.json({error:'unauthorized'},{status:403,headers:c});
  try{
    const{email,action}=await request.json();
    const key='user:'+email.toLowerCase();
    const raw=await env.SIGNAL_KV.get(key);
    if(!raw)return Response.json({error:'not found'},{status:404,headers:c});
    const u=JSON.parse(raw);
    if(action==='activate'){u.active=true;u.blocked=false;}
    else if(action==='deactivate'){u.active=false;}
    else if(action==='block'){u.blocked=true;u.active=false;}
    else if(action==='unblock'){u.blocked=false;u.active=true;}
    await env.SIGNAL_KV.put(key,JSON.stringify(u));
    return Response.json({ok:true},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
