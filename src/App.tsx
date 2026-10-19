import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, CloudDownload, Star, CheckCircle, ShieldCheck, 
  Rocket, Lock, Sparkles, AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppItem, SiteSettings } from './types';
import { 
  loadStoredApps, saveStoredApps, loadStoredSettings, 
  saveStoredSettings, incrementDownloadCount 
} from './data';
import { 
  isSupabaseConfigured, fetchSupabaseApps, 
  fetchSupabaseSettings, incrementSupabaseDownloads 
} from './supabaseClient';
import { AdminPage } from './components/AdminPage';
import './App.css';

export function App() {
  const [apps, setAppsState] = useState<AppItem[]>([]);
  const [settings, setSettingsState] = useState<SiteSettings>(loadStoredSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return p === '/admin' || p.startsWith('/admin/') || h === '#admin';
  });

  const [secretClicks, setSecretClicks] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize data (try Supabase first if configured, otherwise fallback to local)
  useEffect(() => {
    async function initData() {
      if (isSupabaseConfigured()) {
        const remoteApps = await fetchSupabaseApps();
        if (remoteApps && remoteApps.length > 0) {
          setAppsState(remoteApps);
          saveStoredApps(remoteApps);
        } else {
          setAppsState(loadStoredApps());
        }

        const remoteSettings = await fetchSupabaseSettings();
        if (remoteSettings) {
          setSettingsState(remoteSettings);
          saveStoredSettings(remoteSettings);
        }
      } else {
        setAppsState(loadStoredApps());
      }
    }
    initData();
  }, []);

  // Sync apps with state and storage
  const setApps = (newApps: AppItem[]) => {
    setAppsState(newApps);
    saveStoredApps(newApps);
  };

  // Sync settings with state and storage
  const setSettings = (newSettings: SiteSettings) => {
    setSettingsState(newSettings);
    saveStoredSettings(newSettings);
  };

  // Route listener: listen to popstate and hashchange
  useEffect(() => {
    const checkRoute = () => {
      const p = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      const isAdmin = p === '/admin' || p.startsWith('/admin/') || h === '#admin';
      setIsAdminRoute(isAdmin);
    };

    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Dynamic document title update
  useEffect(() => {
    if (isAdminRoute) {
      document.title = `Admin Dashboard - ${settings.siteName}`;
    } else {
      document.title = `${settings.siteName} - ${settings.siteTagline}`;
    }
  }, [settings, isAdminRoute]);

  // Navigate helpers
  const navigateToAdmin = () => {
    setIsAdminRoute(true);
    if (window.location.pathname.toLowerCase() !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
  };

  const navigateToHome = () => {
    setIsAdminRoute(false);
    if (window.location.pathname.toLowerCase().startsWith('/admin') || window.location.hash === '#admin') {
      window.history.pushState({}, '', '/');
    }
  };

  // Keyboard shortcut listener:
  // '/' focuses search
  // 'Ctrl + Shift + A' toggles admin page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdminRoute) navigateToHome();
        else navigateToAdmin();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current && !isAdminRoute) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminRoute, searchQuery]);

  // Filter apps (only active apps on public view)
  const query = searchQuery.trim().toLowerCase();
  const visibleApps = apps
    .filter(app => app.status === 'active')
    .filter(app => {
      if (!query) return true;
      return (
        app.name.toLowerCase().includes(query) ||
        app.badge.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Handle Download Click
  const handleDownloadClick = (e: React.MouseEvent, app: AppItem) => {
    try {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 30,
        spread: 60,
        origin: { x, y },
        colors: ['#6366f1', '#4f46e5', '#38bdf8', '#10b981', '#f59e0b'],
        disableForReducedMotion: true
      });
    } catch (err) {
      // fallback
    }

    incrementDownloadCount(app.id);
    setAppsState(prev => 
      prev.map(a => a.id === app.id ? { ...a, downloads: (a.downloads || 0) + 1 } : a)
    );

    if (isSupabaseConfigured()) {
      incrementSupabaseDownloads(app.id);
    }

    if (app.downloadUrl) {
      window.open(app.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Secret footer click to open admin
  const handleSecretFooterClick = () => {
    setSecretClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        navigateToAdmin();
        return 0;
      }
      return next;
    });
  };

  // =========================================================================
  // IF USER IS ON /admin ROUTE -> RENDER DEDICATED FULL-PAGE ADMIN DASHBOARD
  // =========================================================================
  if (isAdminRoute) {
    return (
      <AdminPage 
        apps={apps}
        setApps={setApps}
        settings={settings}
        setSettings={setSettings}
        onNavigateHome={navigateToHome}
      />
    );
  }

  // =========================================================================
  // OTHERWISE -> RENDER PUBLIC USER WEBSITE
  // =========================================================================
  return (
    <div className="app-container">
      {/* Header (Admin Box Completely Removed for public visitors) */}
      <header className="site-header">
        <div className="header-inner">
          <div 
            className="brand-wrapper" 
            onClick={() => { setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            title={settings.siteName}
          >
            <div className="brand-icon-box">
              <Rocket size={22} />
            </div>
            <h1 className="brand-title">{settings.siteName}</h1>
          </div>
        </div>
      </header>

      {/* Hero & Search Bar */}
      <section className="hero-wrapper">
        <div className="search-container">
          <div className="search-glass-box">
            <span className="search-leading-icon">
              <Search size={20} strokeWidth={2.4} />
            </span>
            <input 
              ref={searchInputRef}
              type="text" 
              className="search-core-input" 
              placeholder="Search games, utilities, and..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search apps"
            />
            <div className="search-trailing-actions">
              {query === 'admin' && (
                <button 
                  type="button" 
                  className="btn-clear-search" 
                  onClick={navigateToAdmin}
                  title="Open Admin Portal"
                  style={{ color: '#6366f1' }}
                >
                  <Lock size={16} />
                </button>
              )}
              {searchQuery ? (
                <button 
                  type="button" 
                  className="btn-clear-search" 
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              ) : (
                <span className="kbd-shortcut" title="Press '/' to search">/</span>
              )}
            </div>
          </div>

          {/* Status Pill */}
          <div className="status-meta-row">
            <div className="status-pill">
              <span className="pulse-dot"></span>
              <span>{visibleApps.length} {visibleApps.length === 1 ? 'Verified App' : 'Verified Apps'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Apps Grid (3 columns on desktop, 2 on tablet, 1 on mobile) */}
      <main className="main-wrapper">
        <div className="grid-apps">
          {visibleApps.length === 0 ? (
            <div className="empty-state-card animate-fade-in">
              <div className="empty-icon-box">
                <Search size={32} />
              </div>
              <h2 className="empty-state-title">No matching apps found</h2>
              <p className="empty-state-desc">
                We couldn&rsquo;t find any app matching &ldquo;<span style={{ color: '#4f46e5', fontWeight: 600 }}>{searchQuery}</span>&rdquo;. Check for spelling errors or try another search term.
              </p>
              <button 
                type="button" 
                className="btn-reset-search"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : (
            visibleApps.map((app) => (
              <div key={app.id} className="card-app animate-fade-in">
                {/* App Logo */}
                <div className="card-icon-wrap">
                  <img 
                    src={app.logo} 
                    alt={`${app.name} icon`} 
                    className="card-icon-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236366f1'/><text x='50' y='58' font-size='32' font-weight='bold' fill='%23ffffff' text-anchor='middle'>${encodeURIComponent(app.name.slice(0, 2).toUpperCase())}</text></svg>`;
                    }}
                  />
                </div>

                {/* App Info */}
                <div className="card-info">
                  <h3 className="card-title" title={app.name}>
                    {app.name}
                  </h3>
                  <div className="card-meta">
                    <span className="rating-badge">
                      <Star size={13} className="star-icon" />
                      <span>{app.rating.toFixed(1)}</span>
                    </span>
                    <span className="meta-bullet">•</span>
                    <span className="verified-badge">
                      <ShieldCheck size={13} className="verified-icon" />
                      <span>{app.badge || 'Verified'}</span>
                    </span>
                  </div>
                </div>

                {/* Download Pill Button */}
                <div className="card-action">
                  <button 
                    type="button" 
                    className="btn-download-pill"
                    onClick={(e) => handleDownloadClick(e, app)}
                    aria-label={`Download ${app.name}`}
                  >
                    <CloudDownload size={16} strokeWidth={2.4} />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-content">
          <p className="footer-copy">
            {settings.footerText || '© 2026 Raxo. All rights reserved.'}
          </p>
          <div className="footer-tags">
            <span>Fast &amp; Safe Direct Downloads</span>
            <span>•</span>
            <span>Verified Applications</span>
            <span>•</span>
            <button 
              type="button" 
              className="secret-trigger-btn"
              onClick={handleSecretFooterClick}
              title="Version 2.0"
            >
              v2.0
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
