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
  fetchSupabaseSettings, incrementSupabaseDownloads,
  upsertSupabaseApp
} from './supabaseClient';
import { AdminPage } from './components/AdminPage';
import { LegalModals, LegalModalType } from './components/LegalModals';
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

  const [activeLegalModal, setActiveLegalModal] = useState<LegalModalType>(null);
  const [secretClicks, setSecretClicks] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check URL hash for modal opening on load / change
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h === '#privacy') setActiveLegalModal('privacy');
      else if (h === '#terms') setActiveLegalModal('terms');
      else if (h === '#contact') setActiveLegalModal('contact');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Initialize data (load directly from Supabase DB, fallback to local only if offline)
  useEffect(() => {
    async function initData() {
      if (isSupabaseConfigured()) {
        try {
          const remoteApps = await fetchSupabaseApps();
          if (remoteApps && remoteApps.length > 0) {
            setAppsState(remoteApps);
            saveStoredApps(remoteApps);
          } else {
            // If remote database is empty, seed initial apps directly to Supabase
            const starterApps = loadStoredApps();
            setAppsState(starterApps);
            for (const item of starterApps) {
              await upsertSupabaseApp(item);
            }
          }

          const remoteSettings = await fetchSupabaseSettings();
          if (remoteSettings) {
            setSettingsState(remoteSettings);
            saveStoredSettings(remoteSettings);
          }
        } catch (err) {
          console.error('Supabase connection error:', err);
          setAppsState(loadStoredApps());
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

    if (!app.downloadUrl || !app.downloadUrl.trim() || app.downloadUrl === '#') {
      alert(`The download link for "${app.name}" is currently being updated.`);
      return;
    }

    if (app.downloadUrl.startsWith('blob:')) {
      alert(`The temporary session link for "${app.name}" has expired. Please update it in the Admin Panel with a permanent Cloud Storage or external download link.`);
      return;
    }

    // Direct APK file download & trigger Android package installer
    const safeName = app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const defaultFileName = `${safeName || 'app'}.apk`;
    const fileName = app.apkFileName ? (app.apkFileName.endsWith('.apk') ? app.apkFileName : `${app.apkFileName}.apk`) : defaultFileName;

    const link = document.createElement('a');
    link.href = app.downloadUrl;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Rocket size={28} />
            </div>
            <h1 className="brand-title">{settings.siteName}</h1>
          </div>
        </div>
      </header>

      {/* Hero & Search Bar (Clean floating search without verified app pill) */}
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
                      <Star size={12} className="star-icon" />
                      <span>{app.rating.toFixed(1)}</span>
                    </span>
                    <span className="meta-bullet">•</span>
                    <span className="verified-badge">
                      <ShieldCheck size={12} className="verified-icon" />
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
                    aria-label={`Download ${app.name} APK`}
                    title={`Download ${app.name} APK`}
                  >
                    <CloudDownload size={14} strokeWidth={2.4} />
                    <span>{app.buttonText || 'Download APK'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer matching exact 4-row layout from reference */}
      <footer className="site-footer">
        <div className="footer-layout">
          {/* Row 1: Home   Privacy Policy   Terms of Service */}
          <nav className="footer-links-row" aria-label="Footer Primary Navigation">
            <button 
              type="button" 
              className="footer-nav-link"
              onClick={() => {
                setSearchQuery('');
                setActiveLegalModal(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Home
            </button>
            <button 
              type="button" 
              className="footer-nav-link"
              onClick={() => setActiveLegalModal('privacy')}
            >
              Privacy Policy
            </button>
            <button 
              type="button" 
              className="footer-nav-link"
              onClick={() => setActiveLegalModal('terms')}
            >
              Terms of Service
            </button>
          </nav>

          {/* Row 2: Contact Us */}
          <div className="footer-contact-row">
            <button 
              type="button" 
              className="footer-nav-link"
              onClick={() => setActiveLegalModal('contact')}
            >
              Contact Us
            </button>
          </div>

          {/* Row 3: © 2026 Appvizo. All rights reserved. */}
          <div className="footer-copy-row">
            <p 
              className="footer-copy-text"
              onClick={handleSecretFooterClick}
              title={settings.siteName}
            >
              {settings.footerText || `© 2026 ${settings.siteName}. All rights reserved.`}
            </p>
          </div>

          {/* Row 4: Meta / Facebook Disclaimer */}
          <div className="footer-disclaimer-row">
            <p className="footer-disclaimer-text">
              Disclaimer: This website is not part of the Facebook website or Meta Platforms, Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of META PLATFORMS, INC.
            </p>
          </div>
        </div>
      </footer>

      {/* Fully Functional Legal & Contact Modals */}
      <LegalModals 
        activeModal={activeLegalModal}
        onClose={() => {
          setActiveLegalModal(null);
          if (window.location.hash.startsWith('#')) {
            window.history.pushState(null, '', window.location.pathname);
          }
        }}
        settings={settings}
      />
    </div>
  );
}

export default App;
