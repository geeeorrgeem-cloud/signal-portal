import { verifyAdmin } from './_auth.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, x-admin-token' };

export async function onRequestOptions() { return new Response(null, { headers: cors }); }

export async function onRequestGet({ request, env }) {
  if (!verifyAdmin(request, env)) return Response.json({ error: 'unauthorized' }, { status: 403, headers: cors });

  try {
    const keys = await env.SIGNAL_KV.list({ prefix: 'user:' });
    const users = [];
    for (const key of keys.keys) {
      const raw = await env.SIGNAL_KV.get(key.name);
      if (raw) {
        const u = JSON.parse(raw);
        users.push({ email: u.email, name: u.name, active: u.active, blocked: u.blocked, usageCount: u.usageCount || 0, lastUsed: u.lastUsed, createdAt: u.createdAt });
      }
    }
    users.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return Response.json({ users }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
}
