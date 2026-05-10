const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function toBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const imgUrl = url.searchParams.get('url');
    const token = url.searchParams.get('token');

    if (!imgUrl || !token) {
      return new Response('missing params', { status: 400, headers: corsHeaders });
    }

    // Verify token
    const validToken = await env.SIGNAL_KV.get('token:' + token);
    if (!validToken) {
      return new Response('invalid token', { status: 403, headers: corsHeaders });
    }

    const imgOrigin = new URL(imgUrl).origin;

    const r = await fetch(imgUrl, {
      headers: {
        'Referer': imgOrigin,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    if (!r.ok) {
      return new Response('image fetch failed: ' + r.status, { status: 502, headers: corsHeaders });
    }

    const buffer = await r.arrayBuffer();
    const mime = r.headers.get('content-type') || 'image/jpeg';
    const base64 = toBase64(buffer);

    return Response.json(
      { dataUrl: 'data:' + mime + ';base64,' + base64 },
      { headers: corsHeaders }
    );

  } catch (e) {
    return new Response('error: ' + e.message, { status: 500, headers: corsHeaders });
  }
}
