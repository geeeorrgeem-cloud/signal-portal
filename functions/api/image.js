const c={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
function toB64(buf){let s='';const b=new Uint8Array(buf);for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,Math.min(i+8192,b.length)));return btoa(s);}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS')return new Response(null,{headers:c});
  try{
    const u=new URL(request.url);
    const imgUrl=u.searchParams.get('url');
    const token=u.searchParams.get('token');
    if(!imgUrl||!token)return new Response('missing',{status:400,headers:c});
    const email=await env.SIGNAL_KV.get('token:'+token);
    if(!email)return new Response('invalid token',{status:403,headers:c});
    const r=await fetch(imgUrl,{headers:{Referer:new URL(imgUrl).origin,'User-Agent':'Mozilla/5.0'}});
    if(!r.ok)return new Response('fetch failed',{status:502,headers:c});
    const buf=await r.arrayBuffer();
    const mime=r.headers.get('content-type')||'image/jpeg';
    return Response.json({dataUrl:'data:'+mime+';base64,'+toB64(buf)},{headers:c});
  }catch(e){return new Response('error:'+e.message,{status:500,headers:c});}
}
