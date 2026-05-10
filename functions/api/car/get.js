const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
export async function onRequestOptions(){return new Response(null,{headers:c});}
export async function onRequestGet({request,env}){
  try{
    const token=new URL(request.url).searchParams.get('token');
    if(!token)return Response.json({car:null},{headers:c});
    const data=await env.SIGNAL_KV.get('car:'+token);
    return Response.json({car:data?JSON.parse(data):null},{headers:c});
  }catch(e){return Response.json({car:null},{headers:c});}
}
