export async function onRequestPost(context) {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;
  const body = await context.request.json();
  const { email, password, isAdmin } = body;

  const res = await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { role: isAdmin ? 'admin' : 'user' }
    })
  });
  const data = await res.json();
  if (!res.ok) return new Response(JSON.stringify({ error: data.msg || 'Failed to create user' }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
                                                                                                    }
