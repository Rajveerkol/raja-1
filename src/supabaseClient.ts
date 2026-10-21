import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppItem, SiteSettings } from './types';

// Load Supabase credentials from environment or localStorage
const SUPABASE_URL_KEY = 'raxo_supabase_url';
const SUPABASE_KEY_KEY = 'raxo_supabase_anon_key';

const DEFAULT_SUPABASE_URL = 'https://mpxbnwcospmifvhcteqi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGJud2Nvc3BtaWZ2aGN0ZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDQwNzAsImV4cCI6MjEwNzk4MDA3MH0.ry7cfxKeatvVN_86V_4TEZcy69sYV5W3WG9-rv5k0LU';

export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
  let storedUrl = (localStorage.getItem(SUPABASE_URL_KEY) || '').trim();
  let storedKey = (localStorage.getItem(SUPABASE_KEY_KEY) || '').trim();

  // If stored URL is empty or invalid, fallback to the pre-configured project credentials
  if (!storedUrl || !storedUrl.startsWith('http')) {
    storedUrl = DEFAULT_SUPABASE_URL;
  }
  if (!storedKey || storedKey.length < 20) {
    storedKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  const url = envUrl || storedUrl;
  const key = envKey || storedKey;

  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
  supabaseInstance = null; // Clear cached instance on credentials update
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  try {
    if (!supabaseInstance) {
      supabaseInstance = createClient(url, key);
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.includes('supabase.co'));
}

// Convert DB snake_case row to AppItem camelCase
function rowToAppItem(row: any): AppItem {
  let description = row.description || '';
  let apkFileName: string | undefined = undefined;
  let buttonText: string | undefined = undefined;

  // Extract metadata safely from description if present
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

  return {
    id: String(row.id),
    name: row.name,
    logo: row.logo || '',
    downloadUrl: row.download_url,
    rating: Number(row.rating) || 4.9,
    badge: row.badge || 'Verified',
    category: row.category || 'Games',
    size: row.size || '45 MB',
    downloads: Number(row.downloads) || 0,
    status: (row.status === 'inactive' ? 'inactive' : 'active'),
    sortOrder: Number(row.sort_order) || 0,
    description,
    apkFileName: apkFileName || row.apk_file_name || undefined,
    buttonText: buttonText || row.button_text || undefined
  };
}

// Convert AppItem camelCase to DB snake_case matching remote Supabase columns
function appItemToRow(app: AppItem): any {
  let desc = app.description || '';
  if (app.apkFileName || app.buttonText) {
    const meta = JSON.stringify({
      apkFileName: app.apkFileName,
      buttonText: app.buttonText
    });
    desc = desc.replace(/<!--METADATA:[^>]+-->/g, '').trim();
    desc = `<!--METADATA:${meta}-->${desc ? '\n' + desc : ''}`;
  }

  return {
    id: app.id,
    name: app.name,
    logo: app.logo,
    download_url: app.downloadUrl,
    rating: app.rating,
    badge: app.badge,
    category: app.category,
    size: app.size,
    downloads: app.downloads,
    status: app.status,
    sort_order: app.sortOrder,
    description: desc
  };
}

export interface UploadApkResult {
  url: string | null;
  error?: string;
}

/**
 * Upload an APK file directly to Supabase storage if available
 */
export async function uploadSupabaseApk(file: File): Promise<UploadApkResult> {
  const client = getSupabaseClient();
  if (!client) return { url: null, error: 'Supabase client is not configured' };
  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${Date.now()}_${cleanName}`;
    const { error } = await client.storage
      .from('apks')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/vnd.android.package-archive'
      });

    if (error) {
      console.warn('Storage upload error:', error.message);
      return { url: null, error: error.message };
    }

    const { data } = client.storage.from('apks').getPublicUrl(filePath);
    return { url: data.publicUrl };
  } catch (err: any) {
    console.error('Error uploading APK to Supabase:', err);
    return { url: null, error: err?.message || 'Storage upload failed' };
  }
}

/**
 * Fetch all apps from Supabase
 */
export async function fetchSupabaseApps(): Promise<AppItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('apps')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error, fallback to local:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data.map(rowToAppItem);
    }
    return [];
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return null;
  }
}

/**
 * Insert or Update an App in Supabase
 */
export async function upsertSupabaseApp(app: AppItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = appItemToRow(app);
    const { error } = await client
      .from('apps')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to upsert to Supabase:', err);
    return false;
  }
}

/**
 * Delete an App from Supabase
 */
export async function deleteSupabaseApp(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('apps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete from Supabase:', err);
    return false;
  }
}

/**
 * Increment Download Counter in Supabase
 */
export async function incrementSupabaseDownloads(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data } = await client
      .from('apps')
      .select('downloads')
      .eq('id', id)
      .single();

    if (data) {
      await client
        .from('apps')
        .update({ downloads: (data.downloads || 0) + 1 })
        .eq('id', id);
    }
  } catch (err) {
    console.error('Error incrementing download in Supabase:', err);
  }
}

/**
 * Fetch Settings from Supabase
 */
export async function fetchSupabaseSettings(): Promise<SiteSettings | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return null;

    return {
      siteName: data.site_name === 'Raxo' ? 'Appvizo' : (data.site_name || 'Appvizo'),
      siteTagline: data.site_tagline || 'Discover & Download Verified Apps & Games',
      siteDescription: data.site_description || 'Download verified safe apps and games with direct links on Appvizo.',
      footerText: data.footer_text?.includes('Raxo') ? '© 2026 Appvizo. All rights reserved.' : (data.footer_text || '© 2026 Appvizo. All rights reserved.'),
      telegramLink: data.telegram_link || 'https://t.me/appvizo_official'
    };
  } catch (err) {
    return null;
  }
}

/**
 * Update Settings in Supabase
 */
export async function updateSupabaseSettings(settings: SiteSettings): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('settings')
      .upsert({
        id: 1,
        site_name: settings.siteName,
        site_tagline: settings.siteTagline,
        site_description: settings.siteDescription,
        footer_text: settings.footerText,
        telegram_link: settings.telegramLink
      });

    return !error;
  } catch (err) {
    return false;
  }
}
