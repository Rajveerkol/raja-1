// =============================================================================
// Cloudflare Pages Function: Atomic Download Counter
// Route: /api/apps/:id/download
// Atomically increments download count in D1 when a user downloads an app.
// Validates that the app exists; returns 404 if the app id is not found.
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse } from '../../../types';

export const onRequestPost: PagesFunction<Env, 'id'> = async (context) => {
  const { env, params } = context;

  const id = String(params.id || '').trim();
  if (!id) {
    return errorResponse('Missing app id parameter', 400);
  }

  try {
    const result = await env.DB
      .prepare('UPDATE apps SET downloads = downloads + 1 WHERE id = ?')
      .bind(id)
      .run();

    // Verify row was actually matched and updated
    const changes = result.meta?.changes ?? 0;
    if (changes === 0) {
      return errorResponse(`App not found with id: ${id}`, 404);
    }

    return jsonResponse({ success: true, id, downloadsIncremented: true }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Failed to increment download counter: ${err?.message || 'Database error'}`, 500);
  }
};
