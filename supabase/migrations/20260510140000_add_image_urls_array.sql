-- Add image_urls array column to listings table for multiple images
ALTER TABLE public.listings 
ADD COLUMN image_urls text[] DEFAULT ARRAY[]::text[];

-- Migrate existing image_url to image_urls array
UPDATE public.listings
SET image_urls = CASE 
  WHEN image_url IS NOT NULL THEN ARRAY[image_url]
  ELSE ARRAY[]::text[]
END
WHERE image_urls = ARRAY[]::text[];

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_listings_image_urls ON public.listings USING GIN (image_urls);
