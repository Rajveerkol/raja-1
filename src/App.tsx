import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, CloudDownload, Star, CheckCircle, ShieldCheck, 
  Rocket, Lock, Sparkles, AlertCircle, Database 
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
import { AdminModal } from './components/AdminModal';
import './App.css';

export function App() {
  const [apps, setAppsState] = useState<AppItem[]>([]);
  const [settings, setSettingsState] = useState<SiteSettings>(loadStoredSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize data (try Supabase first if configured, otherwise fallback to local)
  useEffect(() => {
    async function initData() {
      if (isSupabaseConfigured()) {
        const remoteApps = await fetchSupabaseApps();
        if (remoteApps && remoteApps.length > 0) {
          setAppsState(remoteApps);
          saveStoredApps(remoteApps);
          setSupabaseConnected(true);
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

  // Dynamic document title update
  useEffect(() => {
    document.title = `${settings.siteName} - ${settings.siteTagline}`;
  }, [settings]);

  // Keyboard shortcut listener:
  // '/' focuses search
  // 'Ctrl + Shift + A' opens admin panel
  // 'Escape' clears search / closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminOpen(prev => !prev);
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current && !isAdminOpen) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (isAdminOpen) {
          setIsAdminOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminOpen, searchQuery]);

  // Check URL hash for #admin
  useEffect(() => {
    if (window.location.hash === '#admin') {
      setIsAdminOpen(true);
    }

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    // Trigger celebratory micro-confetti burst
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
      // Confetti fallback
    }

    // Increment downloads count in local state and storage
    incrementDownloadCount(app.id);
    setAppsState(prev => 
      prev.map(a => a.id === app.id ? { ...a, downloads: (a.downloads || 0) + 1 } : a)
    );

    // Increment in Supabase if configured
    if (isSupabaseConfigured()) {
      incrementSupabaseDownloads(app.id);
    }

    // Open target download link in new tab
    if (app.downloadUrl) {
      window.open(app.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Secret footer triple click to open admin
  const handleSecretFooterClick = () => {
    setSecretClicks(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setIsAdminOpen(true);
        return 0;
      }
      return next;
    });
  };

  return (
    <div className="app-container">
      {/* ==================================================================
          Header (User Page: Admin Box Completely Removed as requested)
          ================================================================== */}
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

      {/* ==================================================================
          Hero & Search Bar (Category Pills All/Games/Utilities Removed as requested)
          ================================================================== */}
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
                  onClick={() => setIsAdminOpen(true)}
                  title="Open Admin Panel"
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

          {/* Micro Status Bar */}
          <div className="status-meta-row">
            <div className="status-pill">
              <span className="pulse-dot"></span>
              <span>{visibleApps.length} {visibleApps.length === 1 ? 'Verified App' : 'Verified Apps'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          Main Content: Responsive 3-Column Grid
          ================================================================== */}
      <main className="main-wrapper">
        <div className="grid-apps">
          {visibleApps.length === 0 ? (
            /* Empty State */
            <div className="empty-state-card animate-fade-in">
              <div className="empty-icon-box">
                <Search size={32} />
              </div>
              <h2 className="empty-state-title">No matching apps found</h2>
              <p className="empty-state-desc">
                We couldn't find any app matching &ldquo;<span style={{ color: '#4f46e5', fontWeight: 600 }}>{searchQuery}</span>&rdquo;. Check for spelling errors or try another search term.
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
                      // Fallback SVG avatar if image fails
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

      {/* ==================================================================
          Footer
          ================================================================== */}
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

      {/* ==================================================================
          Admin Modal (Accessible via #admin or Ctrl+Shift+A or secret click)
          ================================================================== */}
      <AdminModal 
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        apps={apps}
        setApps={setApps}
        settings={settings}
        setSettings={setSettings}
        isAuthenticated={isAdminAuthenticated}
        setIsAuthenticated={setIsAdminAuthenticated}
      />
    </div>
  );
}

export default App;
