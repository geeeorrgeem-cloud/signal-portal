export function verifyAdmin(request, env) {
  const token = request.headers.get('x-admin-token');
  if (!token || !env.ADMIN_PASSWORD) return false;
  const expected = btoa('admin:' + env.ADMIN_PASSWORD);
  return token === expected;
}
