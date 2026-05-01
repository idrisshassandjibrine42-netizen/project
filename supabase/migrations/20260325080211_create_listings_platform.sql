/*
  # Create Listings Platform Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Category name
      - `slug` (text, unique, not null) - URL-friendly identifier
      - `icon` (text) - Icon name for the category
      - `created_at` (timestamptz)
    
    - `listings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users) - Owner of the listing
      - `category_id` (uuid, foreign key to categories)
      - `title` (text, not null) - Listing title
      - `description` (text, not null) - Full description
      - `price` (numeric) - Price of the item
      - `image_url` (text) - Image URL
      - `location` (text) - Location of the item
      - `status` (text) - active, sold, or archived
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Categories: Public read access
    - Listings: Public read for active listings, users can manage their own listings
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT 'tag',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) CHECK (price >= 0),
  image_url text,
  location text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Authenticated users can view their own listings"
  ON listings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO categories (name, slug, icon) VALUES
  ('Électronique', 'electronique', 'laptop'),
  ('Véhicules', 'vehicules', 'car'),
  ('Immobilier', 'immobilier', 'home'),
  ('Mode', 'mode', 'shirt'),
  ('Maison & Jardin', 'maison-jardin', 'sofa'),
  ('Loisirs & Divertissement', 'loisirs', 'gamepad-2'),
  ('Emploi', 'emploi', 'briefcase'),
  ('Services', 'services', 'wrench')
ON CONFLICT (slug) DO NOTHING;