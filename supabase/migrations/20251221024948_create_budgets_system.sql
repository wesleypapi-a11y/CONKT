/*
  # Create Budgets System

  1. New Tables
    - `budgets`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `template` (text) - Template selecionado para o orçamento
      - `numero` (text) - Número do orçamento
      - `titulo` (text) - Título do orçamento
      - `descricao` (text) - Descrição detalhada
      - `valor_total` (decimal) - Valor total do orçamento
      - `status` (text) - Status: rascunho, enviado, aprovado, rejeitado
      - `validade` (date) - Data de validade do orçamento
      - `observacoes` (text) - Observações adicionais
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `budgets` table
    - Add policies for authenticated users to manage budgets
*/

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  template text DEFAULT 'padrao',
  numero text,
  titulo text NOT NULL,
  descricao text,
  valor_total decimal(15,2) DEFAULT 0,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'cancelado')),
  validade date,
  observacoes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view budgets"
  ON budgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create budgets"
  ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update budgets"
  ON budgets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budgets"
  ON budgets
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets(status);
