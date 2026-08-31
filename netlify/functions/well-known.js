// Serves the two OAuth "discovery" files Claude needs to find our login system.
// These have to live at the true root of southwestedge.net — Supabase can't host
// anything there, which is exactly why this piece moved here. The actual login
// screen and token exchange still live on Supabase; this file just points to them.

exports.handler = async (event) => {
  const path = event.path || '';

  if (path.includes('oauth-protected-resource')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        resource: 'https://ugtlyzwvnhmcphtqkbke.supabase.co/functions/v1/mcp-server',
        authorization_servers: ['https://southwestedge.net'],
      }),
    };
  }

  if (path.includes('oauth-authorization-server')) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        issuer: 'https://southwestedge.net',
        authorization_endpoint: 'https://southwestedge.net/authorize',
        token_endpoint: 'https://southwestedge.net/token',
        registration_endpoint: 'https://southwestedge.net/register',
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256', 'plain'],
        token_endpoint_auth_methods_supported: ['none'],
      }),
    };
  }

  return { statusCode: 404, body: 'Not found' };
};
