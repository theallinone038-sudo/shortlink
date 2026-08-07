const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmVvcWpzeXVnZHFkbmt2a2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjk1MzYsImV4cCI6MjEwMTUwNTUzNn0.e44l5TbebWxYDfqceiP2U7NmtLNCWo-QDB9TLidwi7Q";

async function requireCaller(event){
  const auth = event.headers.authorization || event.headers.Authorization;
  if(!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if(!res.ok) return null;
  return res.json();
}

exports.handler = async (event) => {
  const caller = await requireCaller(event);
  if(!caller){
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in' }) };
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!SERVICE_KEY){
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing service key).' }) };
  }

  try{
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    const data = await res.json();
    if(!res.ok){
      return { statusCode: res.status, body: JSON.stringify({ error: data.msg || 'Could not list users.' }) };
    }
    const users = (data.users || []).map(u => ({
      id: u.id, email: u.email, role: (u.user_metadata && u.user_metadata.role) || 'user',
      created_at: u.created_at
    }));
    return { statusCode: 200, body: JSON.stringify({ users }) };
  }catch(e){
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
