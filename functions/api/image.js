const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

function toBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  }
  return btoa(binary);
}

export async function onRequestOptions() { return new Response(null, { headers: cors }); }

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const imgUrl = url.searchParams.get('url');
    const token = url.searchParams.get('token');
    if (!imgUrl || !token) return new Response('missing', { status: 400, headers: cors });

    const email = await env.SIGNAL_KV.get('token:' + token);
    if (!email) return new Response('invalid token', { status: 403, headers: cors });

    const r = await fetch(imgUrl, { headers: { 'Referer': new URL(imgUrl).origin, 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return new Response('fetch failed', { status: 502, headers: cors });

    const buffer = await r.arrayBuffer();
    const mime = r.headers.get('content-type') || 'image/jpeg';
    return Response.json({ dataUrl: 'data:' + mime + ';base64,' + toBase64(buffer) }, { headers: cors });
  } catch (e) {
    return new Response('error: ' + e.message, { status: 500, headers: cors });
  }
}
