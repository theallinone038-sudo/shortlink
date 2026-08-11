export async function onRequest(context) {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmVvcWpzeXVnZHFkbmt2a2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjk1MzYsImV4cCI6MjEwMTUwNTUzNn0.e44l5TbebWxYDfqceiP2U7NmtLNCWo-QDB9TLidwi7Q";

  const url = new URL(context.request.url);
  const code = url.pathname.split('/').filter(Boolean).pop();

  if (!code || code.toLowerCase() === 'index.html') {
    return context.next();
  }

  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/links?code=eq." + encodeURIComponent(code) + "&select=*", {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY }
    });
    const rows = await res.json();
    const data = rows && rows[0];

    if (!data) {
      return context.next();
    }

    const ua = context.request.headers.get('user-agent') || '';
    const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Googlebot/i;

    if (BOT_UA.test(ua)) {
      const title = data.title || "ShortLink";
      const desc = data.description || "";
      const img = data.image_url || "";
      const html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>" + title + "</title><meta property=\"og:title\" content=\"" + title + "\"><meta property=\"og:description\" content=\"" + desc + "\"><meta property=\"og:image\" content=\"" + img + "\"><meta property=\"og:url\" content=\"https://" + url.host + "/" + code + "\"><meta property=\"og:type\" content=\"website\"></head><body>Redirecting…</body></html>";
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    fetch(SUPABASE_URL + "/rest/v1/links?code=eq." + encodeURIComponent(code), {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ clicks: (data.clicks || 0) + 1 })
    }).catch(() => {});

    return Response.redirect(data.destination_url, 302);
  } catch (e) {
    return context.next();
  }
}
