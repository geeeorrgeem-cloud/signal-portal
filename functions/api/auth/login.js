const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };

export async function onRequestOptions() { return new Response(null, { headers: cors }); }

export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return Response.json({ error: 'missing' }, { status: 400, headers: cors });

    const raw = await env.SIGNAL_KV.get('user:' + email.toLowerCase());
    if (!raw) return Response.json({ error: 'invalid' }, { status: 401, headers: cors });

    const user = JSON.parse(raw);
    if (user.password !== password) return Response.json({ error: 'invalid' }, { status: 401, headers: cors });
    if (user.blocked) return Response.json({ error: 'blocked' }, { status: 403, headers: cors });
    if (!user.active) return Response.json({ error: 'inactive' }, { status: 403, headers: cors });

    // Update last used
    user.lastUsed = new Date().toISOString();
    user.usageCount = (user.usageCount || 0) + 1;
    await env.SIGNAL_KV.put('user:' + email.toLowerCase(), JSON.stringify(user));

    return Response.json({ token: user.token, email: user.email, name: user.name }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
