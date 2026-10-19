import React, { useState, useRef, useEffect } from 'react';
import { 
  Rocket, Plus, Edit2, Trash2, ExternalLink, ShieldCheck, 
  Settings as SettingsIcon, Key, RotateCcw, Image as ImageIcon, 
  Check, AlertCircle, Database, RefreshCw, ArrowLeft, LogOut, 
  Search, Eye, EyeOff, Layers, Download, CheckCircle2, Upload, Package 
} from 'lucide-react';
import { AppItem, SiteSettings } from '../types';
import { INITIAL_APPS, changeAdminPassword, verifyAdminPassword } from '../data';
import { 
  getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConfigured,
  fetchSupabaseApps, upsertSupabaseApp, deleteSupabaseApp, 
  fetchSupabaseSettings, updateSupabaseSettings, uploadSupabaseApk 
} from '../supabaseClient';
import './AdminPage.css';

interface AdminPageProps {
  apps: AppItem[];
  setApps: (apps: AppItem[]) => void;
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  onNavigateHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  apps,
  setApps,
  settings,
  setSettings,
  onNavigateHome
}) => {
  // Session authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('appvizo_admin_auth') === 'true' || sessionStorage.getItem('raxo_admin_auth') === 'true';
  });

  // Login form state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<'apps' | 'add' | 'supabase' | 'settings' | 'password'>('apps');

  // Form State for Add / Edit
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [logo, setLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [rating, setRating] = useState(4.9);
  const [badge, setBadge] = useState('Verified');
  const [category, setCategory] = useState('Games');
  const [size, setSize] = useState('45 MB');
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [description, setDescription] = useState('');
  const [apkFileName, setApkFileName] = useState('');
  const [buttonText, setButtonText] = useState('Download APK');
  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const apkFileInputRef = useRef<HTMLInputElement>(null);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Settings form state
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteTagline, setSiteTagline] = useState(settings.siteTagline);
  const [siteDescription, setSiteDescription] = useState(settings.siteDescription);
  const [footerText, setFooterText] = useState(settings.footerText);
  const [telegramLink, setTelegramLink] = useState(settings.telegramLink);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Supabase tab state
  const initialCreds = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(initialCreds.url);
  const [sbKey, setSbKey] = useState(initialCreds.key);
  const [sbStatus, setSbStatus] = useState<string | null>(null);
  const [sbLoading, setSbLoading] = useState(false);

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save auth to sessionStorage
  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.setItem('appvizo_admin_auth', 'true');
    } else {
      sessionStorage.removeItem('appvizo_admin_auth');
      sessionStorage.removeItem('raxo_admin_auth');
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setIsAuthenticated(true);
      setLoginError('');
      setPasswordInput('');
    } else {
      setLoginError('Invalid password. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('appvizo_admin_auth');
    sessionStorage.removeItem('raxo_admin_auth');
  };

  // Handle Logo Upload (Base64 Data URL)
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image file is too large (max 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogo(result);
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle APK File Upload
  const handleApkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingApk(true);
    setFormError('');
    setFormSuccess('');

    // Auto-calculate size in MB
    const calculatedSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setSize(calculatedSize);
    setApkFileName(file.name);

    // Try Supabase Storage upload if available
    if (isSupabaseConfigured()) {
      try {
        const publicUrl = await uploadSupabaseApk(file);
        if (publicUrl) {
          setDownloadUrl(publicUrl);
          setIsUploadingApk(false);
          setFormSuccess(`APK "${file.name}" uploaded to cloud storage successfully!`);
          return;
        }
      } catch (err) {
        console.warn('Supabase storage fallback', err);
      }
    }

    // Direct object URL for local / immediate download & installation
    const objectUrl = URL.createObjectURL(file);
    setDownloadUrl(objectUrl);
    setIsUploadingApk(false);
    setFormSuccess(`APK "${file.name}" (${calculatedSize}) attached and ready for download/install!`);
  };

  // Start Editing App
  const handleEditClick = (app: AppItem) => {
    setEditingAppId(app.id);
    setName(app.name);
    setDownloadUrl(app.downloadUrl);
    setApkFileName(app.apkFileName || '');
    setButtonText(app.buttonText || 'Download APK');
    setLogo(app.logo);
    setLogoPreview(app.logo);
    setRating(app.rating);
    setBadge(app.badge);
    setCategory(app.category);
    setSize(app.size);
    setSortOrder(app.sortOrder);
    setStatus(app.status);
    setDescription(app.description || '');
    setActiveTab('add');
    setFormSuccess('');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset Add Form
  const resetAppForm = () => {
    setEditingAppId(null);
    setName('');
    setDownloadUrl('');
    setApkFileName('');
    setButtonText('Download APK');
    setLogo('');
    setLogoPreview('');
    setRating(4.9);
    setBadge('Verified');
    setCategory('Games');
    setSize('45 MB');
    setSortOrder(apps.length + 1);
    setStatus('active');
    setDescription('');
    setFormSuccess('');
    setFormError('');
  };

  // Save App (Add or Update)
  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('App name is required.');
      return;
    }
    if (!downloadUrl.trim()) {
      setFormError('Download link or APK file is required.');
      return;
    }

    if (editingAppId) {
      // Update existing
      const updatedItem: AppItem = {
        id: editingAppId,
        name: name.trim(),
        downloadUrl: downloadUrl.trim(),
        apkFileName: apkFileName.trim() || undefined,
        buttonText: buttonText.trim() || 'Download APK',
        logo: logo.trim() || '/uploads/logos/nexo.svg',
        rating: Number(rating) || 4.9,
        badge: badge.trim() || 'Verified',
        category: category.trim() || 'Games',
        size: size.trim() || '45 MB',
        downloads: apps.find(a => a.id === editingAppId)?.downloads || 0,
        sortOrder: Number(sortOrder) || 0,
        status,
        description: description.trim()
      };

      const updated = apps.map(app => (app.id === editingAppId ? updatedItem : app));
      setApps(updated);

      if (isSupabaseConfigured()) {
        await upsertSupabaseApp(updatedItem);
      }

      setFormSuccess(`App "${name}" updated successfully!`);
      setTimeout(() => {
        setActiveTab('apps');
        resetAppForm();
      }, 900);
    } else {
      // Create new
      const newApp: AppItem = {
        id: 'app-' + Date.now(),
        name: name.trim(),
        downloadUrl: downloadUrl.trim(),
        apkFileName: apkFileName.trim() || undefined,
        buttonText: buttonText.trim() || 'Download APK',
        logo: logo.trim() || '/uploads/logos/nexo.svg',
        rating: Number(rating) || 4.9,
        badge: badge.trim() || 'Verified',
        category: category.trim() || 'Games',
        size: size.trim() || '45 MB',
        downloads: 0,
        sortOrder: Number(sortOrder) || (apps.length + 1),
        status,
        description: description.trim()
      };

      setApps([newApp, ...apps]);

      if (isSupabaseConfigured()) {
        await upsertSupabaseApp(newApp);
      }

      setFormSuccess(`App "${name}" published successfully!`);
      setTimeout(() => {
        setActiveTab('apps');
        resetAppForm();
      }, 900);
    }
  };

  // Delete App
  const handleDeleteApp = async (id: string, appName: string) => {
    if (window.confirm(`Are you sure you want to delete "${appName}"?`)) {
      setApps(apps.filter(a => a.id !== id));
      if (isSupabaseConfigured()) {
        await deleteSupabaseApp(id);
      }
    }
  };

  // Reset to Default Starter Apps
  const handleResetApps = async () => {
    if (window.confirm('Reset all apps to original 12 starter apps from screenshot?')) {
      setApps(INITIAL_APPS);
      if (isSupabaseConfigured()) {
        for (const app of INITIAL_APPS) {
          await upsertSupabaseApp(app);
        }
      }
      alert('Apps reset to original screenshot data!');
    }
  };

  // Save Site Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings = {
      siteName,
      siteTagline,
      siteDescription,
      footerText,
      telegramLink
    };
    setSettings(newSettings);

    if (isSupabaseConfigured()) {
      await updateSupabaseSettings(newSettings);
    }

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // Save & Test Supabase Credentials
  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbLoading(true);
    setSbStatus(null);

    saveSupabaseCredentials(sbUrl, sbKey);

    try {
      const data = await fetchSupabaseApps();
      if (data !== null) {
        setSbStatus('Connected successfully to Supabase! Loaded ' + data.length + ' apps.');
        if (data.length > 0) {
          setApps(data);
        }
      } else {
        setSbStatus('Connection failed. Make sure you have created the tables using supabase_schema.sql.');
      }
    } catch (err: any) {
      setSbStatus('Error: ' + err.message);
    } finally {
      setSbLoading(false);
    }
  };

  // Push all local apps to Supabase
  const handleSyncLocalToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      alert('Please configure your Supabase URL and Anon Key first.');
      return;
    }
    setSbLoading(true);
    let count = 0;
    for (const app of apps) {
      const ok = await upsertSupabaseApp(app);
      if (ok) count++;
    }
    await updateSupabaseSettings(settings);
    setSbLoading(false);
    setSbStatus(`Uploaded ${count} of ${apps.length} apps to Supabase!`);
  };

  // Handle Change Password
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPassword(currentPass)) {
      setPassMsg({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }
    if (newPass.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    changeAdminPassword(newPass);
    setPassMsg({ type: 'success', text: 'Password successfully changed!' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  // Filtered Apps
  const filteredApps = apps.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDownloads = apps.reduce((sum, a) => sum + (a.downloads || 0), 0);
  const activeCount = apps.filter(a => a.status === 'active').length;

  // =========================================================================
  // VIEW 1: Dedicated Full Page Login Screen
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="admin-page-root admin-login-wrapper">
        <div className="admin-login-box">
          <div className="login-brand-icon">
            <Rocket size={28} />
          </div>
          <h1 className="login-title">Appvizo Admin Portal</h1>
          <p className="login-subtitle">
            Sign in with your administrator password to manage applications, download links, and database settings.
          </p>

          {loginError && (
            <div style={{
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '12px',
              fontSize: '0.88rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="field-input" 
                placeholder="Enter admin password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                style={{ paddingRight: '44px' }}
                autoFocus
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="btn-primary-purple" style={{ width: '100%', padding: '13px' }}>
              Unlock Admin Dashboard
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <button 
              type="button" 
              className="btn-secondary-light" 
              onClick={onNavigateHome}
              style={{ width: '100%' }}
            >
              <ArrowLeft size={16} /> Back to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Dedicated Full Page Admin Dashboard
  // =========================================================================
  return (
    <div className="admin-page-root">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand" onClick={onNavigateHome}>
            <div className="admin-brand-icon">
              <Rocket size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-brand-title">Appvizo</span>
                <span className="admin-badge-role">Admin Console</span>
                {isSupabaseConfigured() && (
                  <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={11} /> Cloud DB
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="admin-nav-actions">
            <button 
              type="button" 
              className="btn-nav-action" 
              onClick={onNavigateHome}
              title="Return to Public Website"
            >
              <ArrowLeft size={15} />
              <span>View Site</span>
            </button>
            <button 
              type="button" 
              className="btn-nav-action logout" 
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="admin-main-body">
        {/* Navigation Tabs Bar */}
        <div className="admin-tabs-bar">
          <button 
            type="button" 
            className={`admin-tab-item ${activeTab === 'apps' ? 'active' : ''}`}
            onClick={() => { setActiveTab('apps'); resetAppForm(); }}
          >
            <Layers size={17} />
            <span>Applications ({apps.length})</span>
          </button>
          <button 
            type="button" 
            className={`admin-tab-item ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => { setActiveTab('add'); if (!editingAppId) resetAppForm(); }}
          >
            <Plus size={17} />
            <span>{editingAppId ? 'Edit App' : 'Add New App'}</span>
          </button>
          <button 
            type="button" 
            className={`admin-tab-item ${activeTab === 'supabase' ? 'active' : ''}`}
            onClick={() => setActiveTab('supabase')}
          >
            <Database size={17} />
            <span>Supabase Database</span>
          </button>
          <button 
            type="button" 
            className={`admin-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={17} />
            <span>Site Settings</span>
          </button>
          <button 
            type="button" 
            className={`admin-tab-item ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Key size={17} />
            <span>Change Password</span>
          </button>
        </div>

        {/* =================================================================
            TAB 1: All Applications Directory
            ================================================================= */}
        {activeTab === 'apps' && (
          <div>
            {/* Stats Overview */}
            <div className="admin-stats-row">
              <div className="admin-stat-card">
                <div>
                  <div className="stat-label">Total Listed Apps</div>
                  <div className="stat-value">{apps.length}</div>
                </div>
                <div className="stat-icon-wrap indigo">
                  <Layers size={22} />
                </div>
              </div>

              <div className="admin-stat-card">
                <div>
                  <div className="stat-label">Active on Site</div>
                  <div className="stat-value">{activeCount}</div>
                </div>
                <div className="stat-icon-wrap emerald">
                  <CheckCircle2 size={22} />
                </div>
              </div>

              <div className="admin-stat-card">
                <div>
                  <div className="stat-label">Total Downloads</div>
                  <div className="stat-value">{totalDownloads.toLocaleString()}</div>
                </div>
                <div className="stat-icon-wrap amber">
                  <Download size={22} />
                </div>
              </div>

              <div className="admin-stat-card">
                <div>
                  <div className="stat-label">Database Sync</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSupabaseConfigured() ? 'Supabase Live' : 'Local Storage'}
                  </div>
                </div>
                <div className="stat-icon-wrap cyan">
                  <Database size={22} />
                </div>
              </div>
            </div>

            {/* Apps Card */}
            <div className="admin-content-card">
              <div className="card-topbar">
                <div className="card-topbar-title">
                  <span>Listed Applications</span>
                  <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '9999px' }}>
                    {filteredApps.length} Apps
                  </span>
                </div>

                <div className="card-topbar-actions">
                  <div className="admin-search-box">
                    <Search size={16} className="admin-search-icon" />
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search apps by name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <button 
                    type="button" 
                    className="btn-primary-purple"
                    onClick={() => { resetAppForm(); setActiveTab('add'); }}
                  >
                    <Plus size={16} /> Add App
                  </button>

                  <button 
                    type="button" 
                    className="btn-secondary-light"
                    onClick={handleResetApps}
                    title="Reset to original 12 starter apps"
                  >
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="admin-table-container">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Application</th>
                      <th>Category</th>
                      <th>Rating &amp; Badge</th>
                      <th>Downloads</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                          No applications found matching &ldquo;{searchQuery}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map(app => (
                        <tr key={app.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                                <img 
                                  src={app.logo} 
                                  alt={app.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{app.name}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                  Size: {app.size} • Order: #{app.sortOrder}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{app.category}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#d97706', fontWeight: 800 }}>★ {app.rating.toFixed(1)}</span>
                              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
                                {app.badge}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700 }}>{app.downloads.toLocaleString()}</span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: app.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                              color: app.status === 'active' ? '#059669' : '#64748b'
                            }}>
                              {app.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <a 
                                href={app.downloadUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-secondary-light" 
                                style={{ padding: '7px 10px' }}
                                title="Test Download Link"
                              >
                                <ExternalLink size={14} />
                              </a>
                              <button 
                                type="button" 
                                className="btn-secondary-light" 
                                style={{ padding: '7px 12px' }}
                                onClick={() => handleEditClick(app)}
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button 
                                type="button" 
                                className="btn-secondary-light" 
                                style={{ padding: '7px 10px', color: '#dc2626', borderColor: '#fecaca' }}
                                onClick={() => handleDeleteApp(app.id, app.name)}
                                title="Delete App"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (Completely eliminates squishing on phones) */}
              <div className="admin-mobile-cards">
                {filteredApps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No apps found.
                  </div>
                ) : (
                  filteredApps.map(app => (
                    <div key={app.id} className="admin-mobile-item">
                      <div className="mobile-item-header">
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
                          <img src={app.logo} alt={app.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{app.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {app.category} • {app.size}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background: app.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                          color: app.status === 'active' ? '#059669' : '#64748b'
                        }}>
                          {app.status}
                        </span>
                      </div>

                      <div className="mobile-item-details">
                        <div>
                          <span style={{ color: '#94a3b8' }}>Rating:</span> <strong>★ {app.rating.toFixed(1)}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Badge:</span> <strong>{app.badge}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8' }}>Downloads:</span> <strong>{app.downloads}</strong>
                        </div>
                      </div>

                      <div className="mobile-item-actions">
                        <a 
                          href={app.downloadUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-secondary-light" 
                          style={{ flex: 1 }}
                        >
                          <ExternalLink size={14} /> Link
                        </a>
                        <button 
                          type="button" 
                          className="btn-secondary-light" 
                          style={{ flex: 1 }}
                          onClick={() => handleEditClick(app)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          type="button" 
                          className="btn-secondary-light" 
                          style={{ color: '#dc2626', borderColor: '#fecaca', padding: '10px 14px' }}
                          onClick={() => handleDeleteApp(app.id, app.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: Add or Edit Application Form
            ================================================================= */}
        {activeTab === 'add' && (
          <div className="admin-content-card">
            <div className="card-topbar">
              <h2 className="card-topbar-title">
                {editingAppId ? `Edit Application: ${name}` : 'Add New Application'}
              </h2>
              <button 
                type="button" 
                className="btn-secondary-light"
                onClick={() => { resetAppForm(); setActiveTab('apps'); }}
              >
                Back to Apps
              </button>
            </div>

            <div className="admin-form-container">
              {formError && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveApp}>
                <div className="form-grid-layout">
                  {/* App Name */}
                  <div className="form-col-full">
                    <label className="field-label">Application Name *</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      placeholder="e.g. Nexo 45, Classic 200, Fifa 202"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* APK Upload & Download Configuration */}
                  <div className="form-col-full" style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <label className="field-label" style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={18} color="#4f46e5" />
                          <span>APK File Upload &amp; Download Setup *</span>
                        </label>
                        <span className="field-help" style={{ margin: '3px 0 0 0' }}>
                          Upload an .apk file directly from your device, or paste an external download link.
                        </span>
                      </div>

                      {/* Hidden APK File Input */}
                      <input 
                        type="file" 
                        ref={apkFileInputRef} 
                        accept=".apk,application/vnd.android.package-archive" 
                        onChange={handleApkFileChange} 
                        style={{ display: 'none' }} 
                      />

                      <button 
                        type="button" 
                        className="btn-primary-purple" 
                        style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                        onClick={() => apkFileInputRef.current?.click()}
                        disabled={isUploadingApk}
                      >
                        <Upload size={15} />
                        <span>{isUploadingApk ? 'Attaching APK...' : 'Upload .APK File'}</span>
                      </button>
                    </div>

                    {apkFileName && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#065f46', fontWeight: 600 }}>
                          <CheckCircle2 size={16} color="#059669" />
                          <span>Attached APK: <strong>{apkFileName}</strong> ({size})</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setApkFileName(''); setDownloadUrl(''); }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="field-label" style={{ fontSize: '0.82rem' }}>Download URL / APK Link *</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            className="field-input" 
                            placeholder="https://example.com/app.apk or uploaded file"
                            value={downloadUrl}
                            onChange={e => setDownloadUrl(e.target.value)}
                            required
                          />
                          {downloadUrl && (
                            <a 
                              href={downloadUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn-secondary-light"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              <ExternalLink size={15} /> Test
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="field-label" style={{ fontSize: '0.82rem' }}>Button Text</label>
                        <input 
                          type="text" 
                          className="field-input" 
                          placeholder="Download APK" 
                          value={buttonText}
                          onChange={e => setButtonText(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload Box */}
                  <div className="form-col-full">
                    <label className="field-label">Application Logo / Icon</label>
                    <div className="logo-uploader-card">
                      <div className="logo-preview-box">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Preview" className="logo-preview-img" />
                        ) : (
                          <ImageIcon size={26} color="#ffffff" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          style={{ fontSize: '0.88rem' }}
                        />
                        <div className="field-help">
                          Upload image file from your device (PNG, JPG, SVG, WEBP). Or enter an image URL below.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* External Logo URL */}
                  <div className="form-col-full">
                    <label className="field-label">Or External Image URL</label>
                    <input 
                      type="url" 
                      className="field-input" 
                      placeholder="https://example.com/logo.png"
                      value={logo.startsWith('data:') ? '' : logo}
                      onChange={e => {
                        setLogo(e.target.value);
                        setLogoPreview(e.target.value);
                      }}
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="field-label">Rating (1.0 - 5.0)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="5"
                      className="field-input" 
                      value={rating}
                      onChange={e => setRating(parseFloat(e.target.value) || 4.9)}
                    />
                  </div>

                  {/* Badge */}
                  <div>
                    <label className="field-label">Badge Text</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={badge}
                      onChange={e => setBadge(e.target.value)}
                      placeholder="Verified, Hot, Official"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="field-label">Category</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="Games, Utilities"
                    />
                  </div>

                  {/* File Size */}
                  <div>
                    <label className="field-label">File Size</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      placeholder="52 MB"
                    />
                  </div>

                  {/* Display Order */}
                  <div>
                    <label className="field-label">Display Order</label>
                    <input 
                      type="number" 
                      className="field-input" 
                      value={sortOrder}
                      onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="field-label">Visibility Status</label>
                    <select 
                      className="field-select"
                      value={status}
                      onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                    >
                      <option value="active">Active (Visible on Website)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="form-col-full">
                    <label className="field-label">Description (Optional)</label>
                    <textarea 
                      className="field-textarea"
                      rows={3}
                      placeholder="Short description or changelog for this application..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="submit" className="btn-primary-purple" style={{ padding: '12px 28px' }}>
                    {editingAppId ? 'Update Application' : 'Publish Application'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary-light"
                    onClick={() => { resetAppForm(); setActiveTab('apps'); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 3: Supabase Database Configuration
            ================================================================= */}
        {activeTab === 'supabase' && (
          <div className="admin-content-card">
            <div className="card-topbar">
              <h2 className="card-topbar-title">
                <Database size={20} color="#059669" />
                <span>Supabase Cloud Database</span>
              </h2>
            </div>

            <div className="admin-form-container">
              <p style={{ color: '#64748b', fontSize: '0.92rem', marginBottom: '20px' }}>
                Your Appvizo application is connected to Supabase PostgreSQL cloud for live synchronization across all devices and visitors.
              </p>

              {sbStatus && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  marginBottom: '18px',
                  background: sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#a7f3d0' : '#fecaca'}`,
                  color: sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#065f46' : '#dc2626'
                }}>
                  {sbStatus}
                </div>
              )}

              <form onSubmit={handleSaveSupabase}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label className="field-label">Supabase Project URL</label>
                    <input 
                      type="url" 
                      className="field-input" 
                      value={sbUrl}
                      onChange={e => setSbUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Supabase Anon Public API Key</label>
                    <input 
                      type="password" 
                      className="field-input" 
                      value={sbKey}
                      onChange={e => setSbKey(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="submit" className="btn-primary-purple" disabled={sbLoading}>
                      {sbLoading ? 'Checking...' : 'Save & Test Connection'}
                    </button>

                    <button 
                      type="button" 
                      className="btn-secondary-light"
                      onClick={handleSyncLocalToSupabase}
                      disabled={sbLoading}
                    >
                      <RefreshCw size={15} /> Upload All Apps to Supabase
                    </button>
                  </div>
                </div>
              </form>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', marginTop: '24px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '6px', color: '#0f172a' }}>
                  📋 Supabase SQL Schema (`supabase_schema.sql`)
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                  If you haven&rsquo;t initialized the tables in Supabase yet, open your Supabase Dashboard &gt; <strong>SQL Editor</strong>, paste the content of <code>supabase_schema.sql</code>, and click <strong>Run</strong>!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 4: Website Branding & SEO Settings
            ================================================================= */}
        {activeTab === 'settings' && (
          <div className="admin-content-card">
            <div className="card-topbar">
              <h2 className="card-topbar-title">Website Settings &amp; SEO</h2>
            </div>

            <div className="admin-form-container">
              {settingsSaved && (
                <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} /> Settings saved successfully!
                </div>
              )}

              <form onSubmit={handleSaveSettings}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="field-label">Website Name</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Site Tagline</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={siteTagline}
                      onChange={e => setSiteTagline(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">SEO Description</label>
                    <textarea 
                      className="field-textarea" 
                      rows={3}
                      value={siteDescription}
                      onChange={e => setSiteDescription(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">Telegram Channel Link</label>
                    <input 
                      type="url" 
                      className="field-input" 
                      placeholder="https://t.me/appvizo_official"
                      value={telegramLink}
                      onChange={e => setTelegramLink(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">Footer Copyright Text</label>
                    <input 
                      type="text" 
                      className="field-input" 
                      value={footerText}
                      onChange={e => setFooterText(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary-purple" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 5: Change Password
            ================================================================= */}
        {activeTab === 'password' && (
          <div className="admin-content-card">
            <div className="card-topbar">
              <h2 className="card-topbar-title">Change Administrator Password</h2>
            </div>

            <div className="admin-form-container" style={{ maxWidth: '480px' }}>
              {passMsg && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  marginBottom: '18px',
                  background: passMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${passMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: passMsg.type === 'success' ? '#065f46' : '#dc2626'
                }}>
                  {passMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="field-label">Current Password</label>
                  <input 
                    type="password" 
                    className="field-input" 
                    placeholder="Enter current password"
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">New Password</label>
                  <input 
                    type="password" 
                    className="field-input" 
                    placeholder="At least 6 characters"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="field-input" 
                    placeholder="Re-enter new password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary-purple" style={{ marginTop: '8px' }}>
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
