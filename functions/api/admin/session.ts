// =============================================================================
// Cloudflare Pages Function: Admin Session Verification
// Route: /api/admin/session
// Checks whether the incoming request carries a valid signed session cookie
// =============================================================================

import { PagesFunction, Env, jsonResponse, verifyAdminSession } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const isAuthenticated = await verifyAdminSession(context);

  return jsonResponse({ authenticated: isAuthenticated }, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
};
