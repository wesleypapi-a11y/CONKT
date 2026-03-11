/*
  # Create suppliers (fornecedores) system

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `type` (text) - 'fisica' or 'juridica'
      - `name` (text) - Razão social
      - `fantasy_name` (text) - Nome fantasia/popular
      - `document` (text) - CPF/CNPJ
      - `ie` (text) - Inscrição estadual
      - `observation` (text)
      - Contact fields: phone, mobile, email, website
      - Address fields: cep, address, number, complement, neighborhood, state, city
      - `recommended_partner` (boolean) - Visible on client portal
      - `active` (boolean)
      - `photo_url` (text)
      - Timestamps

    - `supplier_bank_info`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `bank` (text)
      - `agency` (text)
      - `account` (text)
      - `pix_key` (text)
      - `additional_info` (text)
      - Timestamps

    - `supplier_vendors`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `name` (text)
      - `phone` (text)
      - `mobile` (text)
      - `email` (text)
      - `observation` (text)
      - Timestamps

    - `supplier_categories`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `category_name` (text)
      - Timestamps

    - `supplier_quality`
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, references suppliers)
      - `rating` (numeric) - 0.0 to 5.0
      - `qualified` (boolean)
      - `occurrence_history` (text)
      - Timestamps

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own suppliers
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL DEFAULT 'juridica' CHECK (type IN ('fisica', 'juridica')),
  name text NOT NULL,
  fantasy_name text,
  document text,
  ie text,
  observation text,
  phone text,
  mobile text,
  email text,
  website text,
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  state text,
  city text,
  recommended_partner boolean DEFAULT false,
  active boolean DEFAULT true,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_bank_info table
CREATE TABLE IF NOT EXISTS supplier_bank_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL UNIQUE,
  bank text,
  agency text,
  account text,
  pix_key text,
  additional_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_vendors table
CREATE TABLE IF NOT EXISTS supplier_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  mobile text,
  email text,
  observation text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_categories table
CREATE TABLE IF NOT EXISTS supplier_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_quality table
CREATE TABLE IF NOT EXISTS supplier_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers ON DELETE CASCADE NOT NULL UNIQUE,
  rating numeric(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  qualified boolean DEFAULT false,
  occurrence_history text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_bank_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quality ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
CREATE POLICY "Users can view own suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for supplier_bank_info
CREATE POLICY "Users can view own supplier bank info"
  ON supplier_bank_info FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_bank_info.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own supplier bank info"
  ON supplier_bank_info FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_bank_info.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own supplier bank info"
  ON supplier_bank_info FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_bank_info.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own supplier bank info"
  ON supplier_bank_info FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_bank_info.supplier_id AND suppliers.user_id = auth.uid()
  ));

-- Policies for supplier_vendors
CREATE POLICY "Users can view own supplier vendors"
  ON supplier_vendors FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_vendors.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own supplier vendors"
  ON supplier_vendors FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_vendors.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own supplier vendors"
  ON supplier_vendors FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_vendors.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own supplier vendors"
  ON supplier_vendors FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_vendors.supplier_id AND suppliers.user_id = auth.uid()
  ));

-- Policies for supplier_categories
CREATE POLICY "Users can view own supplier categories"
  ON supplier_categories FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_categories.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own supplier categories"
  ON supplier_categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_categories.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own supplier categories"
  ON supplier_categories FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_categories.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own supplier categories"
  ON supplier_categories FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_categories.supplier_id AND suppliers.user_id = auth.uid()
  ));

-- Policies for supplier_quality
CREATE POLICY "Users can view own supplier quality"
  ON supplier_quality FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_quality.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own supplier quality"
  ON supplier_quality FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_quality.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own supplier quality"
  ON supplier_quality FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_quality.supplier_id AND suppliers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own supplier quality"
  ON supplier_quality FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM suppliers WHERE suppliers.id = supplier_quality.supplier_id AND suppliers.user_id = auth.uid()
  ));