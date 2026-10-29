// =============================================================================
// Cloudflare Pages Function: Apps Endpoint
// Route: /api/apps
// Handles GET (public app listing) and POST (admin upsert)
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse, verifyAdminSession } from '../../types';

interface D1AppRow {
  id: string;
  name: string;
  logo: string;
  download_url: string;
  rating: number;
  badge: string;
  category: string;
  size: string;
  downloads: number;
  status: string;
  sort_order: number;
  description: string;
  created_at?: string;
}

function formatRowToAppItem(row: D1AppRow) {
  let description = row.description || '';
  let apkFileName: string | undefined = undefined;
  let buttonText: string | undefined = undefined;

  // Extract embedded metadata
  const metaMatch = description.match(/<!--METADATA:({.*?})-->/s);
  if (metaMatch) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      apkFileName = parsed.apkFileName;
      buttonText = parsed.buttonText;
      description = description.replace(metaMatch[0], '').trim();
    } catch (e) {
      // ignore
    }
  }

  // Normalize logo to /assets/ if stored as R2 key
  let logoUrl = row.logo || '';
  if (logoUrl.startsWith('logos/')) {
    logoUrl = `/assets/${logoUrl}`;
  }

  // Normalize download_url to /assets/ if stored as R2 key
  let downloadUrl = row.download_url || '';
  if (downloadUrl.startsWith('apks/')) {
    downloadUrl = `/assets/${downloadUrl}`;
  }

  return {
    id: String(row.id),
    name: row.name,
    logo: logoUrl,
    downloadUrl,
    rating: Number(row.rating) || 4.9,
    badge: row.badge || 'Verified',
    category: row.category || 'Games',
    size: row.size || '45 MB',
    downloads: Number(row.downloads) || 0,
    status: row.status === 'inactive' ? 'inactive' : 'active',
    sortOrder: Number(row.sort_order) || 0,
    description,
    apkFileName,
    buttonText
  };
}

// GET: Public Listing of Apps
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const { results } = await env.DB
      .prepare('SELECT * FROM apps ORDER BY sort_order ASC, created_at DESC')
      .all<D1AppRow>();

    const apps = (results || []).map(formatRowToAppItem);

    return jsonResponse(apps, 200, {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    });
  } catch (err: any) {
    return errorResponse(`Failed to fetch apps: ${err?.message || 'Database error'}`, 500);
  }
};

// POST: Admin App Upsert (Create or Update)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Verify Admin Session
  const isAdmin = await verifyAdminSession(context);
  if (!isAdmin) {
    return errorResponse('Unauthorized: Valid admin session required', 401);
  }

  // 2. Parse & Validate Payload
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('Invalid JSON payload', 400);
  }

  const id = String(body.id || '').trim();
  const name = String(body.name || '').trim();
  let logo = String(body.logo || '').trim();
  let downloadUrl = String(body.downloadUrl || '').trim();

  if (!id) return errorResponse('Field "id" is required', 400);
  if (!name) return errorResponse('Field "name" is required', 400);

  // 3. Prevent Base64 Image Embedding in D1
  if (logo.startsWith('data:') || logo.length > 8192) {
    return errorResponse('Base64 image embedding is forbidden. Please upload logo to R2 storage.', 400);
  }

  // Normalize /assets/ prefix back to relative R2 key for database storage
  if (logo.startsWith('/assets/')) {
    logo = logo.replace(/^\/assets\//, '');
  }
  if (downloadUrl.startsWith('/assets/')) {
    downloadUrl = downloadUrl.replace(/^\/assets\//, '');
  }

  const rating = Number(body.rating) || 4.9;
  const badge = String(body.badge || 'Verified').trim();
  const category = String(body.category || 'Games').trim();
  const size = String(body.size || '45 MB').trim();
  const downloads = Number(body.downloads) || 0;
  const status = body.status === 'inactive' ? 'inactive' : 'active';
  const sortOrder = Number(body.sortOrder) || 0;
  let description = String(body.description || '').trim();

  // Embed metadata comment
  if (body.apkFileName || body.buttonText) {
    const meta = JSON.stringify({
      apkFileName: body.apkFileName ? String(body.apkFileName).trim() : undefined,
      buttonText: body.buttonText ? String(body.buttonText).trim() : undefined
    });
    description = description.replace(/<!--METADATA:[^>]+-->/g, '').trim();
    description = `<!--METADATA:${meta}-->${description ? '\n' + description : ''}`;
  }

  // 4. Execute Upsert in D1
  try {
    await env.DB
      .prepare(`
        INSERT INTO apps (
          id, name, logo, download_url, rating, badge, category, size, downloads, status, sort_order, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          logo = excluded.logo,
          download_url = excluded.download_url,
          rating = excluded.rating,
          badge = excluded.badge,
          category = excluded.category,
          size = excluded.size,
          downloads = excluded.downloads,
          status = excluded.status,
          sort_order = excluded.sort_order,
          description = excluded.description;
      `)
      .bind(
        id, name, logo, downloadUrl, rating, badge, category, size, downloads, status, sortOrder, description
      )
      .run();

    return jsonResponse({ success: true, id }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Database error while saving app: ${err?.message || 'Unknown error'}`, 500);
  }
};
