/*
  # Create Purchases Table for Transaction History

  1. New Tables
    - `purchases`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, foreign key to listings)
      - `buyer_id` (uuid, foreign key to auth.users)
      - `seller_id` (uuid, foreign key to auth.users)
      - `amount` (numeric) - Purchase amount
      - `status` (text) - pending, completed, cancelled
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz)

  2. Security
    - Enable RLS on purchases table
    - Users can view their own purchases
*/

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) CHECK (amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchases_listing_id ON purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller_id ON purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own purchases
CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Allow users to insert purchases
CREATE POLICY "Users can create purchases" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Allow buyers to update their purchases
CREATE POLICY "Buyers can update their purchases" ON purchases
  FOR UPDATE USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);
