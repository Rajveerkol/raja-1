import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppItem, SiteSettings } from './types';

// Load Supabase credentials from environment or localStorage
const SUPABASE_URL_KEY = 'raxo_supabase_url';
const SUPABASE_KEY_KEY = 'raxo_supabase_anon_key';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const storedUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
  const storedKey = localStorage.getItem(SUPABASE_KEY_KEY) || '';

  const url = (envUrl && envUrl !== 'https://your-project-id.supabase.co') ? envUrl : storedUrl;
  const key = (envKey && envKey !== 'your-anon-public-key') ? envKey : storedKey;

  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
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
    description: row.description || ''
  };
}

// Convert AppItem camelCase to DB snake_case
function appItemToRow(app: AppItem): any {
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
    description: app.description || ''
  };
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
      siteName: data.site_name || 'Raxo',
      siteTagline: data.site_tagline || 'Discover & Download Verified Apps & Games',
      siteDescription: data.site_description || 'Download verified safe apps and games with direct links on Raxo.',
      footerText: data.footer_text || '© 2026 Raxo. All rights reserved.',
      telegramLink: data.telegram_link || ''
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
