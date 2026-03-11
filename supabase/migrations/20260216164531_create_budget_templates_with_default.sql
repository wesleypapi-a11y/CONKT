/*
  # Sistema de Templates de Orçamento com Padrão

  1. Nova Tabela
    - `budget_templates`
      - `id` (uuid, primary key)
      - `nome` (text) - Nome do template
      - `descricao` (text) - Descrição do template
      - `arquivo_url` (text) - URL do arquivo Excel original
      - `arquivo_nome` (text) - Nome original do arquivo
      - `itens` (jsonb) - Estrutura de itens do template parseados
      - `is_default` (boolean) - Se é o template padrão
      - `created_by` (uuid) - Usuário que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Todos os usuários autenticados podem visualizar templates
    - Apenas criadores podem editar/deletar seus templates
    - Apenas um template pode ser padrão por usuário
*/

-- Criar tabela de templates
CREATE TABLE IF NOT EXISTS budget_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text DEFAULT '',
  arquivo_url text,
  arquivo_nome text,
  itens jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para SELECT (todos podem ver)
CREATE POLICY "Usuários autenticados podem visualizar templates"
  ON budget_templates FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para INSERT
CREATE POLICY "Usuários autenticados podem criar templates"
  ON budget_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Políticas para UPDATE (apenas o criador)
CREATE POLICY "Criadores podem atualizar seus templates"
  ON budget_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Políticas para DELETE (apenas o criador)
CREATE POLICY "Criadores podem deletar seus templates"
  ON budget_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_budget_templates_created_by ON budget_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_budget_templates_created_at ON budget_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_templates_is_default ON budget_templates(is_default) WHERE is_default = true;

-- Função para garantir apenas um template padrão por usuário
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE budget_templates
    SET is_default = false
    WHERE created_by = NEW.created_by
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir apenas um template padrão
CREATE TRIGGER trigger_ensure_single_default_template
  BEFORE INSERT OR UPDATE ON budget_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();