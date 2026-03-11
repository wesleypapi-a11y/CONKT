/*
  # Create Budget Items System

  1. New Tables
    - `budget_items`
      - `id` (uuid, primary key)
      - `budget_id` (uuid, references budgets)
      - `descricao` (text) - Descrição do item
      - `quantidade` (decimal) - Quantidade
      - `unidade` (text) - Unidade de medida (un, m², kg, etc)
      - `valor_unitario` (decimal) - Valor unitário
      - `valor_total` (decimal) - Valor total do item (quantidade * valor_unitario)
      - `ordem` (integer) - Ordem de exibição
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `budget_items` table
    - Add policies for authenticated users to manage budget items
*/

CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  descricao text NOT NULL,
  quantidade decimal(10,2) DEFAULT 1,
  unidade text DEFAULT 'un',
  valor_unitario decimal(15,2) DEFAULT 0,
  valor_total decimal(15,2) DEFAULT 0,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budget items"
  ON budget_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create budget items"
  ON budget_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget items"
  ON budget_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budget items"
  ON budget_items
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_ordem ON budget_items(ordem);
