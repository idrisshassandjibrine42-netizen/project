-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings-images', 'listings-images', true);

-- Set up RLS policies for the storage bucket
CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listings-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listings-images');

CREATE POLICY "Users can update their own listing images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listings-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listings-images' AND auth.uid()::text = (storage.foldername(name))[1]);