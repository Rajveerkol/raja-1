// =============================================================================
// Cloudflare Pages Function: Admin Logo Upload Endpoint
// Route: /api/admin/upload-logo
// Accepts multipart image file upload, validates format,
// and streams directly into private Cloudflare R2 bucket under logos/
// (Replaces old Base64 embedding with binary R2 storage)
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
    return errorResponse('A valid image file must be provided in the "file" field', 400);
  }

  // 5 MB max limit for icons
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (fileEntry.size > MAX_SIZE_BYTES) {
    return errorResponse('Logo image exceeds the maximum 5 MB size limit', 400);
  }

  // 3. Validate image format
  const mimeType = fileEntry.type.toLowerCase();
  let ext = '';
  if (mimeType === 'image/png' || fileEntry.name.toLowerCase().endsWith('.png')) {
    ext = 'png';
  } else if (mimeType === 'image/jpeg' || fileEntry.name.toLowerCase().endsWith('.jpg') || fileEntry.name.toLowerCase().endsWith('.jpeg')) {
    ext = 'jpg';
  } else if (mimeType === 'image/webp' || fileEntry.name.toLowerCase().endsWith('.webp')) {
    ext = 'webp';
  } else {
    return errorResponse('Unsupported image type. Permitted formats: PNG, JPG/JPEG, WEBP', 400);
  }

  // 4. Generate clean safe storage key
  const baseName = fileEntry.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'logo';
  const r2Key = `logos/${baseName}_${Date.now()}.${ext}`;

  // 5. Stream directly into private Cloudflare R2 bucket
  try {
    await env.RAXO_ASSETS.put(r2Key, fileEntry.stream(), {
      httpMetadata: {
        contentType: mimeType.startsWith('image/') ? mimeType : (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg')
      }
    });

    return jsonResponse({
      success: true,
      key: r2Key,
      url: `/assets/${r2Key}`,
      sizeBytes: fileEntry.size
    }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Failed to upload logo to R2: ${err?.message || 'Storage error'}`, 500);
  }
};
