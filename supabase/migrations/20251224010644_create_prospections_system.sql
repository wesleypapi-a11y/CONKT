/*
  # Sistema de Prospecção de Orçamentos

  ## Descrição
  Esta migration cria o sistema de prospecção para gerenciar clientes que entram em contato
  antes de se tornarem orçamentos reais. Permite controle de leads e follow-ups.

  ## 1. Nova Tabela
    - `prospections` - Armazena informações de clientes em prospecção
      - `id` (uuid, primary key)
      - `nome_cliente` (text) - Nome do cliente potencial
      - `telefone` (text) - Telefone de contato
      - `email` (text) - Email de contato
      - `tipo_obra` (text) - Tipo de obra desejada
      - `descricao` (text) - Descrição da necessidade do cliente
      - `valor_estimado` (decimal) - Valor estimado do projeto
      - `prazo_estimado` (text) - Prazo desejado pelo cliente
      - `endereco` (text) - Endereço da obra
      - `cidade` (text) - Cidade
      - `estado` (text) - Estado
      - `status` (text) - Status: novo, em_analise, orcamento_enviado, aguardando_retorno, fechado, perdido
      - `origem` (text) - Origem do lead: telefone, email, site, indicacao, whatsapp, outro
      - `probabilidade` (text) - Probabilidade: baixa, media, alta
      - `proximo_followup` (date) - Data do próximo follow-up
      - `observacoes` (text) - Observações gerais
      - `orcamento_id` (uuid) - Referência ao orçamento se convertido
      - `created_by` (uuid) - Usuário que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ## 2. Segurança
    - Enable RLS na tabela `prospections`
    - Policies para usuários autenticados:
      - SELECT: Todos podem visualizar
      - INSERT: Todos podem criar
      - UPDATE: Todos podem atualizar
      - DELETE: Apenas admin e gerente podem excluir
*/

-- Criar tabela de prospecções
CREATE TABLE IF NOT EXISTS prospections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente text NOT NULL,
  telefone text,
  email text,
  tipo_obra text,
  descricao text,
  valor_estimado decimal(15,2),
  prazo_estimado text,
  endereco text,
  cidade text,
  estado text,
  status text DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'orcamento_enviado', 'aguardando_retorno', 'fechado', 'perdido')),
  origem text DEFAULT 'telefone' CHECK (origem IN ('telefone', 'email', 'site', 'indicacao', 'whatsapp', 'outro')),
  probabilidade text DEFAULT 'media' CHECK (probabilidade IN ('baixa', 'media', 'alta')),
  proximo_followup date,
  observacoes text,
  orcamento_id uuid REFERENCES budgets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prospections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view prospections"
  ON prospections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prospections"
  ON prospections
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prospections"
  ON prospections
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only admin and gerente can delete prospections"
  ON prospections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gerente')
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_prospections_status ON prospections(status);
CREATE INDEX IF NOT EXISTS idx_prospections_created_by ON prospections(created_by);
CREATE INDEX IF NOT EXISTS idx_prospections_proximo_followup ON prospections(proximo_followup);
CREATE INDEX IF NOT EXISTS idx_prospections_created_at ON prospections(created_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_prospections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospections_updated_at_trigger
  BEFORE UPDATE ON prospections
  FOR EACH ROW
  EXECUTE FUNCTION update_prospections_updated_at();
