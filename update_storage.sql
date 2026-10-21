-- ========================================================
-- Appvizo: Storage Bucket & Public Access Policies
-- Run this in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Create or update the 'apks' bucket and make it PUBLIC
INSERT INTO storage.buckets (id, name, public) 
VALUES ('apks', 'apks', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies on 'apks' if any (to prevent duplicate policy error)
DROP POLICY IF EXISTS "Allow public upload to apks" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on apks" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on apks" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on apks" ON storage.objects;

-- 3. Allow anyone (including Admin Panel) to upload APK files
CREATE POLICY "Allow public upload to apks" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'apks');

-- 4. Allow anyone to download APK files publicly
CREATE POLICY "Allow public read on apks" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'apks');

-- 5. Allow updating APK files in 'apks'
CREATE POLICY "Allow public update on apks" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'apks');

-- 6. Allow deleting APK files from 'apks'
CREATE POLICY "Allow public delete on apks" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'apks');
