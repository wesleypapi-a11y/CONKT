/*
  # Sistema de Contratos

  1. Novas Tabelas
    - `contracts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `client_id` (uuid, foreign key para clients)
      - `work_id` (uuid, foreign key para works)
      - `supplier_id` (uuid, foreign key para suppliers)
      - `contract_number` (text, único por usuário)
      - `contract_date` (date)
      - `total_value` (numeric)
      - `payment_method` (text)
      - `installments_count` (integer)
      - `scope` (text, escopo completo do contrato)
      - `internal_notes` (text, observações internas)
      - `status` (text: ativo, concluido, cancelado)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contract_installments`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, foreign key para contracts)
      - `installment_number` (integer)
      - `due_date` (date)
      - `amount` (numeric)
      - `status` (text: pendente, pago, parcial)
      - `paid_date` (date, nullable)
      - `paid_amount` (numeric, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `contract_attachments`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, foreign key para contracts)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `file_type` (text: escopo, proposta, orcamento, outro)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key para auth.users)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados
*/

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id uuid REFERENCES clients NOT NULL,
  work_id uuid REFERENCES works NOT NULL,
  supplier_id uuid REFERENCES suppliers NOT NULL,
  contract_number text NOT NULL,
  contract_date date DEFAULT CURRENT_DATE,
  total_value numeric(15, 2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT '',
  installments_count integer DEFAULT 1,
  scope text DEFAULT '',
  internal_notes text DEFAULT '',
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_contract_number_per_user UNIQUE(user_id, contract_number)
);

CREATE TABLE IF NOT EXISTS contract_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(15, 2) NOT NULL DEFAULT 0,
  status text DEFAULT 'pendente',
  paid_date date,
  paid_amount numeric(15, 2),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_installment_per_contract UNIQUE(contract_id, installment_number)
);

CREATE TABLE IF NOT EXISTS contract_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text DEFAULT 'outro',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view installments of own contracts"
  ON contract_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_installments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert installments to own contracts"
  ON contract_installments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_installments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update installments of own contracts"
  ON contract_installments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_installments.contract_id
      AND contracts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_installments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete installments of own contracts"
  ON contract_installments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_installments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view attachments of own contracts"
  ON contract_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_attachments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments to own contracts"
  ON contract_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_attachments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments of own contracts"
  ON contract_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_attachments.contract_id
      AND contracts.user_id = auth.uid()
    )
  );