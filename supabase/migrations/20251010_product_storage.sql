-- Create product storage table
CREATE TABLE IF NOT EXISTS product_storage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for product_id
CREATE INDEX IF NOT EXISTS idx_product_storage_product ON product_storage(product_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updating timestamp
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON product_storage
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Add RLS policies
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated users"
  ON product_storage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert/update for admins"
  ON product_storage
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );