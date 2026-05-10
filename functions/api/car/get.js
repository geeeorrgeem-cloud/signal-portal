const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

export async function onRequestOptions() { return new Response(null, { headers: cors }); }

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) return Response.json({ car: null }, { headers: cors });

    const data = await env.SIGNAL_KV.get('car:' + token);
    return Response.json({ car: data ? JSON.parse(data) : null }, { headers: cors });
  } catch (e) {
    return Response.json({ car: null }, { headers: cors });
  }
}
