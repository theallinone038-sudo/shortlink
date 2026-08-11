const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://pcneoqjsyugdqdnkvkaf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmVvcWpzeXVnZHFkbmt2a2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5Mjk1MzYsImV4cCI6MjEwMTUwNTUzNn0.e44l5TbebWxYDfqceiP2U7NmtLNCWo-QDB9TLidwi7Q"
);

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Googlebot/i;

exports.handler = async (event) => {
  const code = event.path.split('/').filter(Boolean).pop();
  const { data } = await supabase.from('links').select('*').eq('code', code).maybeSingle();

  if (!data) {
    return { statusCode: 404, body: "Link not found" };
  }

  const ua = event.headers['user-agent'] || '';

  if (BOT_UA.test(ua)) {
    const title = data.title || "ShortLink";
    const desc = data.description || "";
    const img = data.image_url || "";
    const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<title>${title}</title>
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="https://${event.headers.host}/${code}">
<meta property="og:type" content="website">
</head><body>Redirecting…</body></html>`;
    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  }

  supabase.from('links').update({ clicks: (data.clicks || 0) + 1 }).eq('code', code).then(() => {});
  return { statusCode: 302, headers: { Location: data.destination_url } };
};
