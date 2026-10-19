import React, { useState, useRef } from 'react';
import { 
  X, Plus, Edit2, Trash2, ExternalLink, ShieldCheck, 
  Settings as SettingsIcon, Key, RotateCcw, Image as ImageIcon, 
  Check, AlertCircle, Database, RefreshCw, Copy
} from 'lucide-react';
import { AppItem, SiteSettings } from '../types';
import { INITIAL_APPS, changeAdminPassword, verifyAdminPassword } from '../data';
import { 
  getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConfigured,
  fetchSupabaseApps, upsertSupabaseApp, deleteSupabaseApp, 
  fetchSupabaseSettings, updateSupabaseSettings 
} from '../supabaseClient';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  apps: AppItem[];
  setApps: (apps: AppItem[]) => void;
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  apps,
  setApps,
  settings,
  setSettings,
  isAuthenticated,
  setIsAuthenticated
}) => {
  if (!isOpen) return null;

  // Login State
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'settings' | 'password' | 'supabase'>('list');

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
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Table search
  const [adminSearch, setAdminSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setIsAuthenticated(true);
      setLoginError('');
      setPasswordInput('');
    } else {
      setLoginError('Invalid password. Default is: admin123');
    }
  };

  // Handle Logo Upload (converts to Base64 Data URL)
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

  // Start Editing App
  const handleEditClick = (app: AppItem) => {
    setEditingAppId(app.id);
    setName(app.name);
    setDownloadUrl(app.downloadUrl);
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
  };

  // Reset Add Form
  const resetAppForm = () => {
    setEditingAppId(null);
    setName('');
    setDownloadUrl('');
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
      setFormError('Download link is required.');
      return;
    }

    if (editingAppId) {
      // Update existing
      const updatedItem: AppItem = {
        id: editingAppId,
        name: name.trim(),
        downloadUrl: downloadUrl.trim(),
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

      // Sync with Supabase if configured
      if (isSupabaseConfigured()) {
        await upsertSupabaseApp(updatedItem);
      }

      setFormSuccess(`App "${name}" updated successfully!`);
      setTimeout(() => {
        setActiveTab('list');
        resetAppForm();
      }, 1000);
    } else {
      // Create new
      const newApp: AppItem = {
        id: 'app-' + Date.now(),
        name: name.trim(),
        downloadUrl: downloadUrl.trim(),
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

      // Sync with Supabase if configured
      if (isSupabaseConfigured()) {
        await upsertSupabaseApp(newApp);
      }

      setFormSuccess(`App "${name}" published successfully!`);
      setTimeout(() => {
        setActiveTab('list');
        resetAppForm();
      }, 1000);
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
    if (window.confirm('Reset all apps to default 12 starter apps?')) {
      setApps(INITIAL_APPS);
      if (isSupabaseConfigured()) {
        for (const app of INITIAL_APPS) {
          await upsertSupabaseApp(app);
        }
      }
      alert('Apps reset to original starter data!');
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
        setSbStatus('Connection failed. Please check your Supabase URL, Anon Key, and SQL tables.');
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

  const filteredAdminApps = apps.filter(a => 
    a.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    a.category.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-window" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <span>🚀</span>
            <span>Raxo Admin Control</span>
            {isAuthenticated && (
              <span style={{ fontSize: '0.72rem', background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                AUTHENTICATED
              </span>
            )}
            {isSupabaseConfigured() && (
              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Database size={11} /> SUPABASE CONNECTED
              </span>
            )}
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close Admin Modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body">
          {!isAuthenticated ? (
            /* Login Form */
            <div style={{ maxWidth: '380px', margin: '40px auto', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#eef2ff', color: '#4f46e5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Key size={26} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>Raxo Admin Verification</h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '20px' }}>
                Enter admin password to manage apps and download links.
              </p>

              {loginError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '16px' }}>
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input 
                  type="password" 
                  className="admin-input" 
                  placeholder="Enter password (admin123)" 
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="btn-download-pill" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  Unlock Admin Panel
                </button>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Default password: <strong>admin123</strong>
                </div>
              </form>
            </div>
          ) : (
            /* Admin Dashboard Content */
            <div>
              {/* Navigation Tabs */}
              <div className="admin-tab-nav">
                <button 
                  className={`admin-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('list'); resetAppForm(); }}
                >
                  📱 Listed Apps ({apps.length})
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'add' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('add'); if (!editingAppId) resetAppForm(); }}
                >
                  {editingAppId ? '✏️ Edit App' : '➕ Add New App'}
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'supabase' ? 'active' : ''}`}
                  onClick={() => setActiveTab('supabase')}
                >
                  ⚡ Supabase DB
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  ⚙️ Settings
                </button>
                <button 
                  className={`admin-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
                  onClick={() => setActiveTab('password')}
                >
                  🔒 Password
                </button>
                <button 
                  className="admin-tab-btn" 
                  style={{ marginLeft: 'auto', color: '#ef4444' }}
                  onClick={() => setIsAuthenticated(false)}
                >
                  Logout
                </button>
              </div>

              {/* Tab 1: Manage Apps Table */}
              {activeTab === 'list' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
                    <input 
                      type="text" 
                      className="admin-input" 
                      placeholder="Search apps by name..." 
                      style={{ maxWidth: '280px', padding: '8px 12px', fontSize: '0.86rem' }}
                      value={adminSearch}
                      onChange={e => setAdminSearch(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-download-pill" 
                        style={{ padding: '8px 14px', fontSize: '0.84rem' }}
                        onClick={() => { resetAppForm(); setActiveTab('add'); }}
                      >
                        <Plus size={15} /> Add App
                      </button>
                      <button 
                        className="btn-sm-action" 
                        title="Reset to 12 Screenshot Starter Apps"
                        onClick={handleResetApps}
                      >
                        <RotateCcw size={14} /> Reset
                      </button>
                    </div>
                  </div>

                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>App</th>
                          <th>Category</th>
                          <th>Rating</th>
                          <th>Downloads</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAdminApps.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                              No apps found matching search.
                            </td>
                          </tr>
                        ) : (
                          filteredAdminApps.map(app => (
                            <tr key={app.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
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
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{app.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{app.size}</div>
                                  </div>
                                </div>
                              </td>
                              <td><span style={{ fontWeight: 500 }}>{app.category}</span></td>
                              <td>
                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {app.rating.toFixed(1)}</span>
                              </td>
                              <td><strong>{app.downloads.toLocaleString()}</strong></td>
                              <td>
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
                              </td>
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                  <a 
                                    href={app.downloadUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="btn-sm-action" 
                                    title="Test Download Link"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                  <button 
                                    className="btn-sm-action edit" 
                                    title="Edit App"
                                    onClick={() => handleEditClick(app)}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button 
                                    className="btn-sm-action delete" 
                                    title="Delete App"
                                    onClick={() => handleDeleteApp(app.id, app.name)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Add or Edit App */}
              {activeTab === 'add' && (
                <form onSubmit={handleSaveApp} style={{ maxWidth: '640px', margin: '0 auto' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px' }}>
                    {editingAppId ? `Edit Application: ${name}` : 'Add New Application'}
                  </h3>

                  {formError && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '14px' }}>
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '14px' }}>
                      {formSuccess}
                    </div>
                  )}

                  <div className="admin-form-grid">
                    {/* App Name */}
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">App Name *</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        placeholder="e.g. Nexo 45, Classic 200, Fifa 202"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Download Link */}
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Download Button Link / URL *</label>
                      <input 
                        type="url" 
                        className="admin-input" 
                        placeholder="https://example.com/download/app.apk or drive/mediafire link"
                        value={downloadUrl}
                        onChange={e => setDownloadUrl(e.target.value)}
                        required
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        This link will open directly when visitors click "Download".
                      </span>
                    </div>

                    {/* Logo Upload with Preview */}
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">App Logo / Icon</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '14px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#0f172a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <ImageIcon size={24} color="#ffffff" />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleLogoFileChange}
                            style={{ fontSize: '0.84rem' }}
                          />
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                            Upload square icon (PNG, JPG, WEBP, SVG). Or enter image URL below.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Or External Logo URL */}
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Or External Image URL</label>
                      <input 
                        type="url" 
                        className="admin-input" 
                        placeholder="https://example.com/logo.png"
                        value={logo.startsWith('data:') ? '' : logo}
                        onChange={e => {
                          setLogo(e.target.value);
                          setLogoPreview(e.target.value);
                        }}
                      />
                    </div>

                    {/* Rating */}
                    <div className="admin-form-group">
                      <label className="admin-label">Rating</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1" 
                        max="5"
                        className="admin-input" 
                        value={rating}
                        onChange={e => setRating(parseFloat(e.target.value) || 4.9)}
                      />
                    </div>

                    {/* Badge */}
                    <div className="admin-form-group">
                      <label className="admin-label">Badge Text</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={badge}
                        onChange={e => setBadge(e.target.value)}
                        placeholder="Verified, Hot, Official"
                      />
                    </div>

                    {/* Category */}
                    <div className="admin-form-group">
                      <label className="admin-label">Category</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="Games, Utilities"
                      />
                    </div>

                    {/* Size */}
                    <div className="admin-form-group">
                      <label className="admin-label">File Size</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={size}
                        onChange={e => setSize(e.target.value)}
                        placeholder="52 MB"
                      />
                    </div>

                    {/* Status */}
                    <div className="admin-form-group">
                      <label className="admin-label">Status</label>
                      <select 
                        className="admin-select"
                        value={status}
                        onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                      >
                        <option value="active">Active (Visible)</option>
                        <option value="inactive">Inactive (Hidden)</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="admin-form-group">
                      <label className="admin-label">Display Order</label>
                      <input 
                        type="number" 
                        className="admin-input" 
                        value={sortOrder}
                        onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn-download-pill" style={{ padding: '10px 24px' }}>
                      {editingAppId ? 'Update App' : 'Publish App'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-reset-search" 
                      onClick={() => { setActiveTab('list'); resetAppForm(); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: Supabase Database Settings */}
              {activeTab === 'supabase' && (
                <div style={{ maxWidth: '620px', margin: '0 auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <Database size={24} color="#059669" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Supabase Database Integration</h3>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '18px' }}>
                    Connect Raxo directly to your cloud Supabase database for real-time synchronization across all devices and visitors.
                  </p>

                  {sbStatus && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      marginBottom: '16px',
                      background: sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#a7f3d0' : '#fecaca'}`,
                      color: sbStatus.includes('Connected') || sbStatus.includes('Uploaded') ? '#065f46' : '#dc2626'
                    }}>
                      {sbStatus}
                    </div>
                  )}

                  <form onSubmit={handleSaveSupabase} className="admin-form-grid" style={{ marginBottom: '24px' }}>
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Supabase Project URL</label>
                      <input 
                        type="url" 
                        className="admin-input" 
                        placeholder="https://your-project.supabase.co"
                        value={sbUrl}
                        onChange={e => setSbUrl(e.target.value)}
                        required
                      />
                    </div>

                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Supabase Anon Public API Key</label>
                      <input 
                        type="password" 
                        className="admin-input" 
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        value={sbKey}
                        onChange={e => setSbKey(e.target.value)}
                        required
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Found in: Supabase Dashboard &gt; Project Settings &gt; API
                      </span>
                    </div>

                    <div className="admin-form-group col-span-2" style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button type="submit" className="btn-download-pill" style={{ padding: '10px 20px' }} disabled={sbLoading}>
                        {sbLoading ? 'Connecting...' : 'Save & Test Connection'}
                      </button>
                      <button 
                        type="button" 
                        className="btn-sm-action" 
                        onClick={handleSyncLocalToSupabase}
                        disabled={sbLoading}
                        style={{ padding: '10px 16px' }}
                      >
                        <RefreshCw size={14} /> Upload All Apps to Supabase
                      </button>
                    </div>
                  </form>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                      📋 Supabase SQL Schema (supabase_schema.sql)
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '10px' }}>
                      Agar aapne Supabase me abhi tables nahi banaye hain, toh project root me <code>supabase_schema.sql</code> file ko Supabase <strong>SQL Editor</strong> me paste karke "Run" dabayein!
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 4: Site Settings */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} style={{ maxWidth: '580px', margin: '0 auto' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px' }}>Website Settings</h3>

                  {settingsSaved && (
                    <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={16} /> Settings saved successfully!
                    </div>
                  )}

                  <div className="admin-form-grid">
                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Site Name</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={siteName} 
                        onChange={e => setSiteName(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Site Tagline</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={siteTagline} 
                        onChange={e => setSiteTagline(e.target.value)} 
                      />
                    </div>

                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">SEO Description</label>
                      <textarea 
                        className="admin-textarea" 
                        rows={3} 
                        value={siteDescription} 
                        onChange={e => setSiteDescription(e.target.value)} 
                      />
                    </div>

                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Telegram Channel Link</label>
                      <input 
                        type="url" 
                        className="admin-input" 
                        placeholder="https://t.me/yourchannel"
                        value={telegramLink} 
                        onChange={e => setTelegramLink(e.target.value)} 
                      />
                    </div>

                    <div className="admin-form-group col-span-2">
                      <label className="admin-label">Footer Copyright</label>
                      <input 
                        type="text" 
                        className="admin-input" 
                        value={footerText} 
                        onChange={e => setFooterText(e.target.value)} 
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-download-pill" style={{ marginTop: '20px', padding: '10px 24px' }}>
                    Save Site Settings
                  </button>
                </form>
              )}

              {/* Tab 5: Change Password */}
              {activeTab === 'password' && (
                <form onSubmit={handleChangePasswordSubmit} style={{ maxWidth: '420px', margin: '0 auto' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px' }}>Change Admin Password</h3>

                  {passMsg && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.86rem',
                      marginBottom: '14px',
                      background: passMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${passMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                      color: passMsg.type === 'success' ? '#065f46' : '#dc2626'
                    }}>
                      {passMsg.text}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="admin-form-group">
                      <label className="admin-label">Current Password</label>
                      <input 
                        type="password" 
                        className="admin-input" 
                        placeholder="Default: admin123"
                        value={currentPass}
                        onChange={e => setCurrentPass(e.target.value)}
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-label">New Password</label>
                      <input 
                        type="password" 
                        className="admin-input" 
                        placeholder="At least 6 characters"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        required
                      />
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-label">Confirm New Password</label>
                      <input 
                        type="password" 
                        className="admin-input" 
                        placeholder="Confirm new password"
                        value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-download-pill" style={{ marginTop: '10px', padding: '10px 20px', justifyContent: 'center' }}>
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
