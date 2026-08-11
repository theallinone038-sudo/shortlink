export async function onRequestGet(context) {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;
  const auth = context.request.headers.get('Authorization') || '';
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const res = await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY }
  });
  const data = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: data.msg || 'Failed to list users' }), { status: 500 });

  const users = (data.users || []).map(u => ({
    id: u.id, email: u.email, role: (u.user_metadata && u.user_metadata.role) || 'user'
  }));
  return new Response(JSON.stringify({ users }), { headers: { 'Content-Type': 'application/json' } });
}
