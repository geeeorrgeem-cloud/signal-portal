const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.json({ car: null }, { headers: corsHeaders });
    }

    const data = await env.SIGNAL_KV.get('car:' + token);
    const car = data ? JSON.parse(data) : null;

    return Response.json({ car }, { headers: corsHeaders });

  } catch (e) {
    return Response.json({ car: null }, { headers: corsHeaders });
  }
}
