export async function onRequestPost(context) {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;
  const body = await context.request.json();
  const { userId } = body;

  const res = await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + userId, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: data.msg || 'Failed to delete user' }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
