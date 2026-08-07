function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

exports.handler = async (event) => {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmVvcWpzeXVnZHFkbmt2a2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjk1MzYsImV4cCI6MjEwMTUwNTUzNn0.e44l5TbebWxYDfqceiP2U7NmtLNCWo-QDB9TLidwi7Q";
  let code = event.queryStringParameters && event.queryStringParameters.code;
  if(!code){
    // fallback: read from path, e.g. /.netlify/functions/l/ABC123
    const m = event.path.match(/\/l\/(.+)$/);
    if(m) code = decodeURIComponent(m[1]);
  }

  if(!code){
    return { statusCode: 302, headers: { Location: '/' } };
  }

  try{
    const res = await fetch(`${SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}&select=*`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    const rows = await res.json();
    const link = rows && rows[0];

    if(!link){
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Link not found</title></head><body><p>This link doesn't exist or was removed.</p></body></html>`
      };
    }

    // fire-and-forget click count
    fetch(`${SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ clicks: (link.clicks || 0) + 1 })
    }).catch(()=>{});

    const title = escapeHtml(link.title || 'Link');
    const desc = escapeHtml(link.description || '');
    const img = link.image_url ? escapeHtml(link.image_url) : '';
    const dest = escapeHtml(link.destination_url);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
${img ? `<meta property="og:image" content="${img}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta property="og:type" content="website">
<meta http-equiv="refresh" content="0;url=${dest}">
</head>
<body>
<p>Redirecting… <a href="${dest}">Click here if you are not redirected</a></p>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: html
    };
  }catch(e){
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html><html><body><p>Something went wrong: ${escapeHtml(e.message)}</p></body></html>`
    };
  }
};
