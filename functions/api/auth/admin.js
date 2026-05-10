const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,x-admin-token'};
export async function onRequestOptions(){return new Response(null,{headers:c});}
export async function onRequestPost({request,env}){
  try{
    const{password}=await request.json();
    if(!env.ADMIN_PASSWORD||password!==env.ADMIN_PASSWORD)return Response.json({error:'wrong password'},{status:403,headers:c});
    const adminToken=btoa('admin:'+env.ADMIN_PASSWORD);
    return Response.json({adminToken},{headers:c});
  }catch(e){return Response.json({error:e.message},{status:500,headers:c});}
}
