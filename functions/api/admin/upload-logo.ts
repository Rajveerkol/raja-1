// =============================================================================
// Cloudflare Pages Function: Admin Logo Upload Endpoint
// Route: /api/admin/upload-logo
// Accepts multipart image file upload, validates format,
// and streams directly into private Cloudflare R2 bucket under logos/
// Supports PNG, JPG/JPEG, WEBP, SVG, GIF, AVIF, ICO, BMP
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

  // 10 MB max limit for icons/logos
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;
  if (fileEntry.size > MAX_SIZE_BYTES) {
    return errorResponse('Logo image exceeds the maximum 10 MB size limit', 400);
  }

  // 3. Validate image format & resolve extension + content-type
  const rawType = (fileEntry.type || '').toLowerCase();
  const lowerName = (fileEntry.name || '').toLowerCase();

  let ext = 'png';
  let resolvedContentType = 'image/png';

  if (rawType.includes('svg') || lowerName.endsWith('.svg')) {
    ext = 'svg';
    resolvedContentType = 'image/svg+xml';
  } else if (rawType.includes('webp') || lowerName.endsWith('.webp')) {
    ext = 'webp';
    resolvedContentType = 'image/webp';
  } else if (rawType.includes('png') || lowerName.endsWith('.png')) {
    ext = 'png';
    resolvedContentType = 'image/png';
  } else if (rawType.includes('jpeg') || rawType.includes('jpg') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.jfif')) {
    ext = 'jpg';
    resolvedContentType = 'image/jpeg';
  } else if (rawType.includes('gif') || lowerName.endsWith('.gif')) {
    ext = 'gif';
    resolvedContentType = 'image/gif';
  } else if (rawType.includes('avif') || lowerName.endsWith('.avif')) {
    ext = 'avif';
    resolvedContentType = 'image/avif';
  } else if (rawType.includes('icon') || rawType.includes('ico') || lowerName.endsWith('.ico')) {
    ext = 'ico';
    resolvedContentType = 'image/x-icon';
  } else if (rawType.includes('bmp') || lowerName.endsWith('.bmp')) {
    ext = 'bmp';
    resolvedContentType = 'image/bmp';
  } else if (rawType.startsWith('image/')) {
    // Other generic image types
    ext = 'png';
    resolvedContentType = rawType;
  } else {
    return errorResponse('Unsupported image type. Permitted formats: PNG, JPG/JPEG, WEBP, SVG, GIF, AVIF, ICO', 400);
  }

  // 4. Generate clean safe storage key
  const baseName = fileEntry.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'logo';
  const r2Key = `logos/${baseName}_${Date.now()}.${ext}`;

  // 5. Stream directly into private Cloudflare R2 bucket
  try {
    await env.RAXO_ASSETS.put(r2Key, fileEntry.stream(), {
      httpMetadata: {
        contentType: resolvedContentType
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
