// =============================================================================
// Cloudflare Pages Function: Single App Operations
// Route: /api/apps/:id
// Handles DELETE (admin delete app)
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse, verifyAdminSession } from '../../types';

export const onRequestDelete: PagesFunction<Env, 'id'> = async (context) => {
  const { env, params } = context;

  // 1. Verify Admin Session
  const isAdmin = await verifyAdminSession(context);
  if (!isAdmin) {
    return errorResponse('Unauthorized: Valid admin session required', 401);
  }

  const id = String(params.id || '').trim();
  if (!id) {
    return errorResponse('Missing app id', 400);
  }

  // 2. Delete from D1
  try {
    const result = await env.DB
      .prepare('DELETE FROM apps WHERE id = ?')
      .bind(id)
      .run();

    return jsonResponse({ success: true, deletedId: id, changes: result.meta?.changes ?? 1 }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Database error while deleting app: ${err?.message || 'Unknown error'}`, 500);
  }
};
