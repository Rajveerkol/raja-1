// =============================================================================
// Cloudflare Pages Function: Admin APK Upload Endpoint
// Route: /api/admin/upload-apk
// Accepts multipart APK file upload, validates extension, sanitizes filename,
// and streams directly into private Cloudflare R2 bucket under apks/
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse, verifyAdminSession } from '../../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Verify Admin Session
  const isAdmin = await verifyAdminSession(context);
  if (!isAdmin) {
    return errorResponse('Unauthorized: Valid admin session required', 401);
  }

  // 2. Parse Multipart Form Data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err: any) {
    return errorResponse('Invalid form data payload', 400);
  }

  const fileEntry = formData.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return errorResponse('A valid APK file must be provided in the "file" field', 400);
  }

  const preferredName = formData.get('preferredName')?.toString() || '';
  const originalName = fileEntry.name || 'app.apk';

  // 3. Validation
  if (!originalName.toLowerCase().endsWith('.apk') && !preferredName.toLowerCase().endsWith('.apk')) {
    return errorResponse('File must be an Android Package (.apk)', 400);
  }

  // 150 MB max limit
  const MAX_SIZE_BYTES = 150 * 1024 * 1024;
  if (fileEntry.size > MAX_SIZE_BYTES) {
    return errorResponse('APK file exceeds the maximum 150 MB size limit', 400);
  }

  // 4. Sanitize and clean filename
  let cleanName = preferredName.trim();
  if (!cleanName) {
    let base = originalName.replace(/\.apk$/i, '');
    // Strip trailing random affiliate/package hash suffixes
    base = base.replace(/_[A-Za-z0-9]{8,15}$/, '').replace(/__\d+_$/, '').replace(/__\d+$/, '');
    cleanName = base.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  if (!cleanName.toLowerCase().endsWith('.apk')) {
    cleanName = `${cleanName}.apk`;
  }

  const safeStorageBase = cleanName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const r2Key = `apks/${Date.now()}_${safeStorageBase}`;

  // 5. Stream directly into private Cloudflare R2 bucket
  try {
    await env.RAXO_ASSETS.put(r2Key, fileEntry.stream(), {
      httpMetadata: {
        contentType: 'application/vnd.android.package-archive'
      }
    });

    return jsonResponse({
      success: true,
      key: r2Key,
      url: `/assets/${r2Key}`,
      fileName: cleanName,
      sizeBytes: fileEntry.size
    }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Failed to upload APK to R2: ${err?.message || 'Storage error'}`, 500);
  }
};
