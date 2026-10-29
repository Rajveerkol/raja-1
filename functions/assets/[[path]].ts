// =============================================================================
// Cloudflare Pages Function: Private R2 Asset Delivery Endpoint
// Route: /assets/*
// Delivers private R2 objects (logos and APKs) with strict security, path sanitization,
// edge caching, and Content-Disposition headers for direct APK downloads.
// =============================================================================

import { PagesFunction, Env, errorResponse } from '../types';

export const onRequestGet: PagesFunction<Env, 'path'> = async (context) => {
  const { request, env, params } = context;

  // Resolve requested object key
  let assetPath = '';
  if (Array.isArray(params.path)) {
    assetPath = params.path.join('/');
  } else if (typeof params.path === 'string') {
    assetPath = params.path;
  }

  // 1. Path sanitization & traversal prevention
  if (!assetPath || assetPath.includes('..') || assetPath.includes('\\') || assetPath.includes('\0')) {
    return errorResponse('Invalid asset path', 400);
  }

  // Normalize path
  assetPath = assetPath.replace(/^\/+/, '');

  // 2. Strict whitelist validation: Must be either logos/ or apks/
  const isLogo = assetPath.startsWith('logos/');
  const isApk = assetPath.startsWith('apks/');

  if (!isLogo && !isApk) {
    return errorResponse('Asset path not allowed', 403);
  }

  // Validate filename pattern
  const filename = assetPath.split('/').pop() || '';
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return errorResponse('Invalid characters in asset filename', 400);
  }

  // 3. Extension and MIME type resolution
  let contentType = 'application/octet-stream';
  if (isLogo) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif') contentType = 'image/jpeg';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'svg') contentType = 'image/svg+xml';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'avif') contentType = 'image/avif';
    else if (ext === 'ico') contentType = 'image/x-icon';
    else if (ext === 'bmp') contentType = 'image/bmp';
    else {
      contentType = 'image/png';
    }
  } else if (isApk) {
    if (!filename.toLowerCase().endsWith('.apk')) {
      return errorResponse('Only .apk packages are permitted', 400);
    }
    contentType = 'application/vnd.android.package-archive';
  }

  // 4. Retrieve object from private R2 bucket
  let object: R2ObjectBody | null = null;
  try {
    object = await env.RAXO_ASSETS.get(assetPath);
  } catch (err: any) {
    return errorResponse(`Failed to retrieve asset from storage: ${err?.message || 'R2 error'}`, 500);
  }

  if (!object) {
    return errorResponse('Asset not found', 404);
  }

  // 5. HTTP Conditional Requests (Cache Revalidation)
  const clientEtag = request.headers.get('if-none-match');
  if (clientEtag && clientEtag === object.httpEtag) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': object.httpEtag,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': isLogo 
          ? 'public, max-age=604800, stale-while-revalidate=86400' 
          : 'public, max-age=86400'
      }
    });
  }

  // 6. Build response headers
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Length', object.size.toString());
  headers.set('ETag', object.httpEtag);
  headers.set('Access-Control-Allow-Origin', '*');

  if (isLogo) {
    // 7 days browser cache, 1 day stale-while-revalidate for logos
    headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  } else if (isApk) {
    // Determine friendly download filename from query param or fallback
    const url = new URL(request.url);
    let requestedDownloadName = url.searchParams.get('download') || filename;

    // Sanitize download filename: strip non-alphanumeric chars except .-_
    requestedDownloadName = requestedDownloadName.replace(/[^a-zA-Z0-9.-]/g, '_');
    if (!requestedDownloadName.toLowerCase().endsWith('.apk')) {
      requestedDownloadName += '.apk';
    }

    // Direct download attachment header
    headers.set('Content-Disposition', `attachment; filename="${requestedDownloadName}"`);
    headers.set('Cache-Control', 'public, max-age=86400');
  }

  return new Response(object.body as ReadableStream, {
    status: 200,
    headers
  });
};
