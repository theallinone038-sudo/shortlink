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
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const caller = await requireCaller(event);
  if(!caller){
    return { statusCode: 401, body: JSON.stringify({ error: 'Not signed in' }) };
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!SERVICE_KEY){
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured (missing service key).' }) };
  }

  let body;
  try{ body = JSON.parse(event.body || '{}'); }catch(e){ body = {}; }
  const { userId } = body;
  if(!userId){
    return { statusCode: 400, body: JSON.stringify({ error: 'userId is required.' }) };
  }
  if(userId === caller.id){
    return { statusCode: 400, body: JSON.stringify({ error: "You can't delete your own account from here." }) };
  }

  try{
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    if(!res.ok){
      const data = await res.json().catch(()=>({}));
      return { statusCode: res.status, body: JSON.stringify({ error: data.msg || 'Could not delete user.' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }catch(e){
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
