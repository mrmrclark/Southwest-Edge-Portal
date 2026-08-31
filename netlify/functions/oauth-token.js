// Proxies /token to the mcp-oauth Supabase function, server-side.
//
// This exists for the same reason authorize.html does: Netlify's built-in
// "redirect straight to an external URL" mechanism (the old netlify.toml rule
// that pointed /token directly at supabase.co) was found to mangle headers in
// transit — that's what broke /authorize's Content-Type. /token and /register
// used that identical mechanism, so they were likely silently affected too.
// Making the call ourselves, from Node, and setting the response headers
// explicitly avoids that proxy path entirely.

const TARGET = 'https://ugtlyzwvnhmcphtqkbke.supabase.co/functions/v1/mcp-oauth/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  console.log('[oauth-token] invoked', {
    method: event.httpMethod,
    isBase64Encoded: event.isBase64Encoded,
    bodyLength: event.body ? event.body.length : 0,
    headers: event.headers,
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'application/x-www-form-urlencoded';
    const rawBody = event.isBase64Encoded && event.body
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : (event.body || '');
    console.log('[oauth-token] forwarding', { contentType, rawBodyPreview: rawBody.slice(0, 300) });

    const res = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: rawBody,
    });
    const text = await res.text();
    console.log('[oauth-token] supabase responded', { status: res.status, bodyPreview: text.slice(0, 300) });
    return {
      statusCode: res.status,
      headers: {
        ...corsHeaders,
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
      body: text,
    };
  } catch (err) {
    console.log('[oauth-token] ERROR', String(err));
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'proxy_error', message: String(err) }),
    };
  }
};
