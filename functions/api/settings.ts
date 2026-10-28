// =============================================================================
// Cloudflare Pages Function: Site Settings Endpoint
// Route: /api/settings
// Handles GET (public site settings) and PUT (admin update settings)
// =============================================================================

import { PagesFunction, Env, jsonResponse, errorResponse, verifyAdminSession } from '../types';

interface D1SettingsRow {
  id: number;
  site_name: string;
  site_tagline: string;
  site_description: string;
  footer_text: string;
  telegram_link: string;
}

// GET: Public Site Settings
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const row = await env.DB
      .prepare('SELECT * FROM settings WHERE id = 1')
      .first<D1SettingsRow>();

    if (!row) {
      return jsonResponse({
        siteName: 'Appvizo',
        siteTagline: 'Discover & Download Verified Apps & Games',
        siteDescription: 'Appvizo provides fast, safe and verified direct download links for top trending games and utilities.',
        footerText: '© 2026 Appvizo. All rights reserved.',
        telegramLink: 'https://t.me/appvizo_official'
      }, 200, {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      });
    }

    return jsonResponse({
      siteName: row.site_name || 'Appvizo',
      siteTagline: row.site_tagline || 'Discover & Download Verified Apps & Games',
      siteDescription: row.site_description || 'Appvizo provides fast, safe and verified direct download links for top trending games and utilities.',
      footerText: row.footer_text || '© 2026 Appvizo. All rights reserved.',
      telegramLink: row.telegram_link || 'https://t.me/appvizo_official'
    }, 200, {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    });
  } catch (err: any) {
    return errorResponse(`Failed to fetch settings: ${err?.message || 'Database error'}`, 500);
  }
};

// PUT: Admin Settings Update
export const onRequestPut: PagesFunction<Env> = async (context) => {
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

  const siteName = String(body.siteName || 'Appvizo').trim();
  const siteTagline = String(body.siteTagline || '').trim();
  const siteDescription = String(body.siteDescription || '').trim();
  const footerText = String(body.footerText || '').trim();
  const telegramLink = String(body.telegramLink || '').trim();

  // 3. Update Settings in D1
  try {
    await env.DB
      .prepare(`
        UPDATE settings SET
          site_name = ?,
          site_tagline = ?,
          site_description = ?,
          footer_text = ?,
          telegram_link = ?
        WHERE id = 1;
      `)
      .bind(siteName, siteTagline, siteDescription, footerText, telegramLink)
      .run();

    return jsonResponse({ success: true }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
  } catch (err: any) {
    return errorResponse(`Database error while updating settings: ${err?.message || 'Unknown error'}`, 500);
  }
};
