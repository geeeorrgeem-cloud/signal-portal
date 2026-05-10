const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { token, car } = body;

    if (!token || !car) {
      return Response.json({ error: 'missing token or car' }, { status: 400, headers: corsHeaders });
    }

    // Verify token is valid
    const validToken = await env.SIGNAL_KV.get('token:' + token);
    if (!validToken) {
      return Response.json({ error: 'invalid token' }, { status: 403, headers: corsHeaders });
    }

    await env.SIGNAL_KV.put('car:' + token, JSON.stringify(car));
    return Response.json({ ok: true }, { headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}
