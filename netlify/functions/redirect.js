exports.handler = async (event) => {
  const SUPABASE_URL = "https://pcneoqjsyugdqdnkvkaf.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmVvcWpzeXVnZHFkbmt2a2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjk1MzYsImV4cCI6MjEwMTUwNTUzNn0.e44l5TbebWxYDfqceiP2U7NmtLNCWo-QDB9TLidwi7Q";

  try {
    const code = event.path.split('/').filter(Boolean).pop();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const rows = await res.json();
    const data = rows && rows[0];

    if (!data) {
      return { statusCode: 302, headers: { Location: "/index.html" } };
    }

    const ua = event.headers['user-agent'] || '';
    const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Googlebot/i;

    if (BOT_UA.test(ua)) {
      const title = data.title || "ShortLink";
      const desc = data.description || "";
      const img = data.image_url || "";
      const html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>" + title + "</title><meta property=\"og:title\" content=\"" + title + "\"><meta property=\"og:description\" content=\"" + desc + "\"><meta property=\"og:image\" content=\"" + img + "\"><meta property=\"og:url\" content=\"https://" + event.headers.host + "/" + code + "\"><meta property=\"og:type\" content=\"website\"></head><body>Redirecting…</body></html>";
      return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
    }

    fetch(`${SUPABASE_URL}/rest/v1/links?code=eq.${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ clicks: (data.clicks || 0) + 1 })
    }).catch(() => {});

    return { statusCode: 302, headers: { Location: data.destination_url } };
  } catch (e) {
    return { statusCode: 302, headers: { Location: "/index.html" } };
  }
};
