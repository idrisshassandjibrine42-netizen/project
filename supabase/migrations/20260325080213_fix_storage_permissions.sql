-- Fix storage bucket permissions for public read access

-- Drop existing SELECT policy that might be blocking public access
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;

-- Update bucket to ensure it's properly marked as public
UPDATE storage.buckets SET public = true WHERE id = 'listings-images';

-- For public buckets, we typically don't need RLS SELECT policies
-- But if needed, ensure the policy allows unauthenticated access
CREATE POLICY "Public read access to listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings-images')
  WITH CHECK (true);
