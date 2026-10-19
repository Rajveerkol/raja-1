-- ========================================================
-- Appvizo - Supabase PostgreSQL Database Schema & Seed Data
-- Run this in your Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Create Apps Table
CREATE TABLE IF NOT EXISTS public.apps (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    logo TEXT DEFAULT '',
    download_url TEXT NOT NULL,
    rating NUMERIC(3,1) DEFAULT 4.9,
    badge TEXT DEFAULT 'Verified',
    category TEXT DEFAULT 'Games',
    size TEXT DEFAULT '45 MB',
    downloads INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    sort_order INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_name TEXT DEFAULT 'Appvizo',
    site_tagline TEXT DEFAULT 'Discover & Download Verified Apps & Games',
    site_description TEXT DEFAULT 'Appvizo provides fast and safe direct download links for top trending games and utilities.',
    footer_text TEXT DEFAULT '© 2026 Appvizo. All rights reserved.',
    telegram_link TEXT DEFAULT 'https://t.me/appvizo_official'
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Allow anyone to read active apps
CREATE POLICY "Allow public read access to apps" 
ON public.apps FOR SELECT 
USING (true);

-- Allow insert/update/delete on apps
CREATE POLICY "Allow public all access on apps" 
ON public.apps FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow read on settings
CREATE POLICY "Allow public read on settings" 
ON public.settings FOR SELECT 
USING (true);

-- Allow write on settings
CREATE POLICY "Allow public write on settings" 
ON public.settings FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. Insert Initial Settings
INSERT INTO public.settings (id, site_name, site_tagline, site_description, footer_text, telegram_link)
VALUES (
    1, 
    'Appvizo', 
    'Discover & Download Verified Apps & Games', 
    'Appvizo provides fast, safe and verified direct download links for the top trending games and utilities.', 
    '© 2026 Appvizo. All rights reserved.',
    'https://t.me/appvizo_official'
)
ON CONFLICT (id) DO UPDATE 
SET site_name = EXCLUDED.site_name,
    site_tagline = EXCLUDED.site_tagline,
    site_description = EXCLUDED.site_description,
    footer_text = EXCLUDED.footer_text,
    telegram_link = EXCLUDED.telegram_link;

-- 6. Insert Starter Apps (matching screenshot)
INSERT INTO public.apps (id, name, logo, download_url, rating, badge, category, size, downloads, status, sort_order)
VALUES 
('app-1', 'Nexo 45', '/uploads/logos/nexo.svg', 'https://example.com/download/nexo45', 4.9, 'Verified', 'Games', '52 MB', 12450, 'active', 1),
('app-2', 'Classic 200', '/uploads/logos/classic200.svg', 'https://example.com/download/classic200', 4.9, 'Verified', 'Games', '64 MB', 9820, 'active', 2),
('app-3', 'Khelo 567', '/uploads/logos/khelo567.svg', 'https://example.com/download/khelo567', 4.9, 'Verified', 'Games', '48 MB', 24100, 'active', 3),
('app-4', 'Fifa 202', '/uploads/logos/fifa202.svg', 'https://example.com/download/fifa202', 4.9, 'Verified', 'Games', '78 MB', 31500, 'active', 4),
('app-5', 'Ram 404', '/uploads/logos/ram404.svg', 'https://example.com/download/ram404', 4.9, 'Verified', 'Utilities', '24 MB', 8740, 'active', 5),
('app-6', 'Mkm Vex', '/uploads/logos/mkmvex.svg', 'https://example.com/download/mkmvex', 4.9, 'Verified', 'Games', '60 MB', 15320, 'active', 6),
('app-7', 'Aqua 888', '/uploads/logos/aqua888.svg', 'https://example.com/download/aqua888', 4.9, 'Verified', 'Games', '55 MB', 18900, 'active', 7),
('app-8', 'Zivo 67', '/uploads/logos/zivo67.svg', 'https://example.com/download/zivo67', 4.9, 'Verified', 'Games', '42 MB', 11200, 'active', 8),
('app-9', 'Yoho 888', '/uploads/logos/yoho888.svg', 'https://example.com/download/yoho888', 4.9, 'Verified', 'Games', '50 MB', 14750, 'active', 9),
('app-10', 'Ludo 567', '/uploads/logos/ludo567.svg', 'https://example.com/download/ludo567', 4.9, 'Verified', 'Games', '38 MB', 45200, 'active', 10),
('app-11', 'Classic 500', '/uploads/logos/classic500.svg', 'https://example.com/download/classic500', 4.9, 'Verified', 'Games', '68 MB', 13400, 'active', 11),
('app-12', 'Monkey games', '/uploads/logos/monkeygames.svg', 'https://example.com/download/monkeygames', 4.9, 'Verified', 'Games', '72 MB', 22100, 'active', 12)
ON CONFLICT (id) DO NOTHING;
