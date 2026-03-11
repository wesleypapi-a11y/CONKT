/*
  # Sistema de Templates de Orçamento

  1. Nova Tabela
    - `budget_templates`
      - `id` (uuid, primary key)
      - `nome` (text) - Nome do template
      - `descricao` (text) - Descrição do template
      - `arquivo_url` (text) - URL do arquivo Excel original
      - `arquivo_nome` (text) - Nome original do arquivo
      - `itens` (jsonb) - Estrutura de itens do template
      - `created_by` (uuid) - Usuário que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Políticas para usuários autenticados
*/

-- Criar tabela de templates
CREATE TABLE IF NOT EXISTS budget_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  arquivo_url text,
  arquivo_nome text,
  itens jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários autenticados podem visualizar templates"
  ON budget_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar templates"
  ON budget_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem atualizar seus templates"
  ON budget_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criadores podem deletar seus templates"
  ON budget_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Índices
CREATE INDEX IF NOT EXISTS idx_budget_templates_created_by ON budget_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_budget_templates_created_at ON budget_templates(created_at DESC);