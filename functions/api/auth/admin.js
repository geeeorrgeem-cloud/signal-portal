const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-token'};

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  if(request.method!=='POST')return new Response('Method Not Allowed',{status:405,headers:c});
  try{
    const{password}=await request.json();
    if(!env.ADMIN_PASSWORD||password!==env.ADMIN_PASSWORD)
      return Response.json({error:'wrong password'},{status:403,headers:c});
    const adminToken=btoa('admin:'+env.ADMIN_PASSWORD);
    return Response.json({adminToken},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
