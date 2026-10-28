// =============================================================================
// Cloudflare Pages Function: Admin Login Endpoint
// Route: /api/admin/login
// Verifies master admin password against env.ADMIN_PASSWORD
// and issues an HttpOnly, Secure, SameSite=Lax signed session cookie.
// (Zero hardcoded fallback passwords; fails safely if secret is missing)
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse, verifyPassword, createSessionToken, getSessionSecret, buildSessionCookieHeader } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON body', 400);
  }

  const password = String(body.password || '');

  // Verify password against secure environment variable (fails safely if unconfigured)
  const authResult = verifyPassword(password, env);
  if (authResult.error) {
    return errorResponse(authResult.error, authResult.error.startsWith('Server configuration') ? 500 : 400);
  }
  if (!authResult.valid) {
    return errorResponse('Invalid admin password', 401);
  }

  // Create cryptographically signed HMAC-SHA256 session token
  const secret = getSessionSecret(env);
  if (!secret) {
    return errorResponse('Server configuration error: SESSION_SECRET or ADMIN_PASSWORD must be configured', 500);
  }

  const sessionToken = await createSessionToken(secret);

  // Set-Cookie: 24-hour lifetime, HttpOnly, Secure (on HTTPS), SameSite=Lax
  const cookieHeader = buildSessionCookieHeader(sessionToken, 86400, request);

  return jsonResponse({ success: true, authenticated: true }, 200, {
    'Set-Cookie': cookieHeader,
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
};
