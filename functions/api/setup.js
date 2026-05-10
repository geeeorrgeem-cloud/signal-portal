// POST /api/setup  { adminPassword, tokenLabel }
// Creates a new bookmarklet token
// Requires ADMIN_PASSWORD env var to be set in Cloudflare dashboard

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { adminPassword, tokenLabel } = body;

    if (!env.ADMIN_PASSWORD) {
      return Response.json({ error: 'ADMIN_PASSWORD env var not set' }, { status: 500, headers: corsHeaders });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
      return Response.json({ error: 'wrong password' }, { status: 403, headers: corsHeaders });
    }

    // Check if a token already exists for this label
    const existing = await env.SIGNAL_KV.get('label:' + (tokenLabel || 'default'));
    if (existing) {
      return Response.json({ token: existing, existing: true }, { headers: corsHeaders });
    }

    const token = generateToken();
    const label = tokenLabel || 'default';

    // Store token
    await env.SIGNAL_KV.put('token:' + token, label);
    await env.SIGNAL_KV.put('label:' + label, token);

    return Response.json({ token, existing: false }, { headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
}
