const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-token'
};

function ok(data) { return Response.json(data, { headers: cors }); }
function err(msg, status) { return Response.json({ error: msg }, { status, headers: cors }); }

function vAdmin(req, env) {
  const t = req.headers.get('x-admin-token');
  if (!t || !env.ADMIN_PASSWORD) return false;
  return t === btoa('admin:' + env.ADMIN_PASSWORD);
}

function genToken() {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let t = '';
  for (let i = 0; i < 32; i++) t += ch[Math.floor(Math.random() * ch.length)];
  return t;
}

function toB64(buf) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 8192)
    s += String.fromCharCode(...b.subarray(i, Math.min(i + 8192, b.length)));
  return btoa(s);
}

export async function onRequest({ request, env, params }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/auth/admin
  if (path.endsWith('/auth/admin')) {
    try {
      const { password } = await request.json();
      if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return err('wrong password', 403);
      return ok({ adminToken: btoa('admin:' + env.ADMIN_PASSWORD) });
    } catch (e) { return err(e.message, 500); }
  }

  // POST /api/auth/login
  if (path.endsWith('/auth/login')) {
    try {
      const { email, password } = await request.json();
      if (!email || !password) return err('missing', 400);
      const raw = await env.SIGNAL_KV.get('user:' + email.toLowerCase());
      if (!raw) return err('invalid', 401);
      const u = JSON.parse(raw);
      if (u.password !== password) return err('invalid', 401);
      if (u.blocked) return err('blocked', 403);
      if (!u.active) return err('inactive', 403);
      u.lastUsed = new Date().toISOString();
      u.usageCount = (u.usageCount || 0) + 1;
      await env.SIGNAL_KV.put('user:' + email.toLowerCase(), JSON.stringify(u));
      return ok({ token: u.token, email: u.email, name: u.name });
    } catch (e) { return err(e.message, 500); }
  }

  // GET /api/admin/users
  if (path.endsWith('/admin/users')) {
    if (!vAdmin(request, env)) return err('unauthorized', 403);
    try {
      const keys = await env.SIGNAL_KV.list({ prefix: 'user:' });
      const users = [];
      for (const key of keys.keys) {
        const raw = await env.SIGNAL_KV.get(key.name);
        if (raw) {
          const u = JSON.parse(raw);
          users.push({ email: u.email, name: u.name, active: u.active, blocked: u.blocked, usageCount: u.usageCount || 0, lastUsed: u.lastUsed });
        }
      }
      users.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      return ok({ users });
    } catch (e) { return err(e.message, 500); }
  }

  // POST /api/admin/user/create
  if (path.endsWith('/admin/user/create')) {
    if (!vAdmin(request, env)) return err('unauthorized', 403);
    try {
      const { email, password, name } = await request.json();
      if (!email || !password) return err('missing', 400);
      const key = 'user:' + email.toLowerCase();
      if (await env.SIGNAL_KV.get(key)) return err('exists', 409);
      const token = genToken();
      const user = { email: email.toLowerCase(), password, name: name || '', token, active: true, blocked: false, usageCount: 0, createdAt: new Date().toISOString(), lastUsed: null };
      await env.SIGNAL_KV.put(key, JSON.stringify(user));
      await env.SIGNAL_KV.put('token:' + token, email.toLowerCase());
      return ok({ ok: true, token });
    } catch (e) { return err(e.message, 500); }
  }

  // POST /api/admin/user/action
  if (path.endsWith('/admin/user/action')) {
    if (!vAdmin(request, env)) return err('unauthorized', 403);
    try {
      const { email, action } = await request.json();
      const key = 'user:' + email.toLowerCase();
      const raw = await env.SIGNAL_KV.get(key);
      if (!raw) return err('not found', 404);
      const u = JSON.parse(raw);
      if (action === 'activate') { u.active = true; u.blocked = false; }
      else if (action === 'deactivate') { u.active = false; }
      else if (action === 'block') { u.blocked = true; u.active = false; }
      else if (action === 'unblock') { u.blocked = false; u.active = true; }
      await env.SIGNAL_KV.put(key, JSON.stringify(u));
      return ok({ ok: true });
    } catch (e) { return err(e.message, 500); }
  }

  // POST /api/car/save
  if (path.endsWith('/car/save')) {
    try {
      const { token, car } = await request.json();
      if (!token || !car) return err('missing', 400);
      const email = await env.SIGNAL_KV.get('token:' + token);
      if (!email) return err('invalid token', 403);
      const raw = await env.SIGNAL_KV.get('user:' + email);
      if (!raw) return err('user not found', 403);
      const u = JSON.parse(raw);
      if (u.blocked || !u.active) return err('account disabled', 403);
      await env.SIGNAL_KV.put('car:' + token, JSON.stringify(car));
      return ok({ ok: true });
    } catch (e) { return err(e.message, 500); }
  }

  // GET /api/car/get
  if (path.endsWith('/car/get')) {
    try {
      const token = url.searchParams.get('token');
      if (!token) return ok({ car: null });
      const data = await env.SIGNAL_KV.get('car:' + token);
      return ok({ car: data ? JSON.parse(data) : null });
    } catch (e) { return ok({ car: null }); }
  }

  // GET /api/image
  if (path.endsWith('/image')) {
    try {
      const imgUrl = url.searchParams.get('url');
      const token = url.searchParams.get('token');
      if (!imgUrl || !token) return new Response('missing', { status: 400, headers: cors });
      const email = await env.SIGNAL_KV.get('token:' + token);
      if (!email) return new Response('invalid token', { status: 403, headers: cors });
      const r = await fetch(imgUrl, { headers: { Referer: new URL(imgUrl).origin, 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) return new Response('fetch failed', { status: 502, headers: cors });
      const buf = await r.arrayBuffer();
      const mime = r.headers.get('content-type') || 'image/jpeg';
      return ok({ dataUrl: 'data:' + mime + ';base64,' + toB64(buf) });
    } catch (e) { return new Response('error:' + e.message, { status: 500, headers: cors }); }
  }

  return new Response('Not found', { status: 404, headers: cors });
}
