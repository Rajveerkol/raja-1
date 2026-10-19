import { AppItem, SiteSettings } from './types';

export const INITIAL_APPS: AppItem[] = [
  {
    id: 'app-1',
    name: 'Nexo 45',
    logo: '/uploads/logos/nexo.svg',
    downloadUrl: 'https://example.com/download/nexo45',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '52 MB',
    downloads: 12450,
    status: 'active',
    sortOrder: 1,
    description: 'High-speed thrilling arcade gaming experience with verified security.'
  },
  {
    id: 'app-2',
    name: 'Classic 200',
    logo: '/uploads/logos/classic200.svg',
    downloadUrl: 'https://example.com/download/classic200',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '64 MB',
    downloads: 9820,
    status: 'active',
    sortOrder: 2,
    description: 'Retro classic gaming reimagined with modern controls.'
  },
  {
    id: 'app-3',
    name: 'Khelo 567',
    logo: '/uploads/logos/khelo567.svg',
    downloadUrl: 'https://example.com/download/khelo567',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '48 MB',
    downloads: 24100,
    status: 'active',
    sortOrder: 3,
    description: 'Popular multiplayer gaming portal with instant rewards.'
  },
  {
    id: 'app-4',
    name: 'Fifa 202',
    logo: '/uploads/logos/fifa202.svg',
    downloadUrl: 'https://example.com/download/fifa202',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '78 MB',
    downloads: 31500,
    status: 'active',
    sortOrder: 4,
    description: 'Championship football tournament simulation with updated rosters.'
  },
  {
    id: 'app-5',
    name: 'Ram 404',
    logo: '/uploads/logos/ram404.svg',
    downloadUrl: 'https://example.com/download/ram404',
    rating: 4.9,
    badge: 'Verified',
    category: 'Utilities',
    size: '24 MB',
    downloads: 8740,
    status: 'active',
    sortOrder: 5,
    description: 'Ultra-light memory booster and device performance utility.'
  },
  {
    id: 'app-6',
    name: 'Mkm Vex',
    logo: '/uploads/logos/mkmvex.svg',
    downloadUrl: 'https://example.com/download/mkmvex',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '60 MB',
    downloads: 15320,
    status: 'active',
    sortOrder: 6,
    description: 'Fast action survival platformer with custom levels.'
  },
  {
    id: 'app-7',
    name: 'Aqua 888',
    logo: '/uploads/logos/aqua888.svg',
    downloadUrl: 'https://example.com/download/aqua888',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '55 MB',
    downloads: 18900,
    status: 'active',
    sortOrder: 7,
    description: 'Underwater ocean exploration and puzzle adventure.'
  },
  {
    id: 'app-8',
    name: 'Zivo 67',
    logo: '/uploads/logos/zivo67.svg',
    downloadUrl: 'https://example.com/download/zivo67',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '42 MB',
    downloads: 11200,
    status: 'active',
    sortOrder: 8,
    description: 'Strategic racing and arena battle royale.'
  },
  {
    id: 'app-9',
    name: 'Yoho 888',
    logo: '/uploads/logos/yoho888.svg',
    downloadUrl: 'https://example.com/download/yoho888',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '50 MB',
    downloads: 14750,
    status: 'active',
    sortOrder: 9,
    description: 'Multiplayer social party games with live chat.'
  },
  {
    id: 'app-10',
    name: 'Ludo 567',
    logo: '/uploads/logos/ludo567.svg',
    downloadUrl: 'https://example.com/download/ludo567',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '38 MB',
    downloads: 45200,
    status: 'active',
    sortOrder: 10,
    description: 'The classic Indian board game with friends and online multiplayer.'
  },
  {
    id: 'app-11',
    name: 'Classic 500',
    logo: '/uploads/logos/classic500.svg',
    downloadUrl: 'https://example.com/download/classic500',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '68 MB',
    downloads: 13400,
    status: 'active',
    sortOrder: 11,
    description: 'Card and strategic board challenges.'
  },
  {
    id: 'app-12',
    name: 'Monkey games',
    logo: '/uploads/logos/monkeygames.svg',
    downloadUrl: 'https://example.com/download/monkeygames',
    rating: 4.9,
    badge: 'Verified',
    category: 'Games',
    size: '72 MB',
    downloads: 22100,
    status: 'active',
    sortOrder: 12,
    description: 'Jungle runner and acrobatic swinging obstacles.'
  }
];

export const INITIAL_SETTINGS: SiteSettings = {
  siteName: 'Appvizo',
  siteTagline: 'Discover & Download Verified Apps & Games',
  siteDescription: 'Appvizo provides fast, safe and verified direct download links for top trending games, utilities, and apps.',
  footerText: '© 2026 Appvizo. All rights reserved.',
  telegramLink: 'https://t.me/appvizo_official'
};

const APPS_STORAGE_KEY = 'appvizo_apps_data';
const SETTINGS_STORAGE_KEY = 'appvizo_site_settings';
const PASSWORD_STORAGE_KEY = 'appvizo_admin_password';

// Legacy keys for migration
const LEGACY_APPS_STORAGE_KEY = 'raxo_apps_data';
const LEGACY_SETTINGS_STORAGE_KEY = 'raxo_site_settings';
const LEGACY_PASSWORD_STORAGE_KEY = 'raxo_admin_password';

export function loadStoredApps(): AppItem[] {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY) || localStorage.getItem(LEGACY_APPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading stored apps', err);
  }
  return INITIAL_APPS;
}

export function saveStoredApps(apps: AppItem[]): void {
  try {
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.error('Error saving apps', err);
  }
}

export function loadStoredSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged: SiteSettings = { ...INITIAL_SETTINGS, ...parsed };
      // Migrate legacy name if present
      if (merged.siteName === 'Raxo') {
        merged.siteName = 'Appvizo';
      }
      if (merged.footerText?.includes('Raxo')) {
        merged.footerText = '© 2026 Appvizo. All rights reserved.';
      }
      if (merged.telegramLink?.includes('raxo')) {
        merged.telegramLink = 'https://t.me/appvizo_official';
      }
      return merged;
    }
  } catch (err) {
    console.error('Error loading stored settings', err);
  }
  return INITIAL_SETTINGS;
}

export function saveStoredSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings', err);
  }
}

export function verifyAdminPassword(inputPassword: string): boolean {
  try {
    const savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY) || localStorage.getItem(LEGACY_PASSWORD_STORAGE_KEY);
    if (savedPassword) {
      return inputPassword.trim() === savedPassword.trim();
    }
  } catch (e) {
    // fallback
  }
  // Default password requested by user: admin123
  return inputPassword.trim() === 'admin123';
}

export function changeAdminPassword(newPassword: string): void {
  localStorage.setItem(PASSWORD_STORAGE_KEY, newPassword.trim());
}

export function incrementDownloadCount(appId: string): void {
  const apps = loadStoredApps();
  const updated = apps.map(app => {
    if (app.id === appId) {
      return { ...app, downloads: (app.downloads || 0) + 1 };
    }
    return app;
  });
  saveStoredApps(updated);
}
