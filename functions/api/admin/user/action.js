import { verifyAdmin } from '../_auth.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };

export async function onRequestOptions() { return new Response(null, { headers: cors }); }

export async function onRequestPost({ request, env }) {
  if (!verifyAdmin(request, env)) return Response.json({ error: 'unauthorized' }, { status: 403, headers: cors });

  try {
    const { email, action } = await request.json();
    const key = 'user:' + email.toLowerCase();
    const raw = await env.SIGNAL_KV.get(key);
    if (!raw) return Response.json({ error: 'not found' }, { status: 404, headers: cors });

    const user = JSON.parse(raw);
    if (action === 'activate') { user.active = true; user.blocked = false; }
    else if (action === 'deactivate') { user.active = false; }
    else if (action === 'block') { user.blocked = true; user.active = false; }
    else if (action === 'unblock') { user.blocked = false; user.active = true; }
    else return Response.json({ error: 'unknown action' }, { status: 400, headers: cors });

    await env.SIGNAL_KV.put(key, JSON.stringify(user));
    return Response.json({ ok: true }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
