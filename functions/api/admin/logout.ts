// =============================================================================
// Cloudflare Pages Function: Admin Logout Endpoint
// Route: /api/admin/logout
// Clears the HttpOnly session cookie by setting Max-Age=0
// =============================================================================

import { PagesFunction, Env, jsonResponse, buildSessionCookieHeader } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Clear cookie immediately
  const clearCookieHeader = buildSessionCookieHeader('', 0, context.request);

  return jsonResponse({ success: true, authenticated: false }, 200, {
    'Set-Cookie': clearCookieHeader,
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
};
