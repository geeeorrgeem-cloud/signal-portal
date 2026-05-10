const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  try{
    const token=new URL(request.url).searchParams.get('token');
    if(!token)return Response.json({car:null},{headers:c});
    const data=await env.SIGNAL_KV.get('car:'+token);
    return Response.json({car:data?JSON.parse(data):null},{headers:c});
  }catch(e){return Response.json({car:null},{headers:c});}
}
