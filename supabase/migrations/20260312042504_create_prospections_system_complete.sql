/*
  # Sistema de Prospecção Comercial

  1. Nova Tabela
    - `prospections` - Gerenciamento de leads e oportunidades comerciais
      - `id` (uuid, PK)
      - `nome_cliente` (text) - Nome do potencial cliente
      - `telefone` (text) - Telefone de contato
      - `email` (text) - E-mail de contato
      - `tipo_obra` (text) - Tipo de obra desejada
      - `descricao` (text) - Descrição detalhada da necessidade
      - `valor_estimado` (numeric) - Valor estimado do projeto
      - `prazo_estimado` (text) - Prazo estimado
      - `endereco` (text) - Endereço da obra
      - `cidade` (text) - Cidade
      - `estado` (text) - Estado
      - `status` (text) - Status da prospecção
      - `origem` (text) - Origem do lead
      - `probabilidade` (text) - Probabilidade de fechamento
      - `proximo_followup` (date) - Data do próximo follow-up
      - `observacoes` (text) - Observações gerais
      - `orcamento_id` (uuid, FK) - Orçamento vinculado
      - `created_by` (uuid, FK) - Usuário que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS
    - Políticas para usuários autenticados
    
  3. Índices
    - Índices para melhorar performance
*/

-- Criar tabela de prospecções
CREATE TABLE IF NOT EXISTS public.prospections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cliente text NOT NULL,
  telefone text,
  email text,
  tipo_obra text,
  descricao text,
  valor_estimado numeric(15, 2),
  prazo_estimado text,
  endereco text,
  cidade text,
  estado text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'orcamento_enviado', 'aguardando_retorno', 'fechado', 'perdido')),
  origem text NOT NULL DEFAULT 'outro' CHECK (origem IN ('telefone', 'email', 'site', 'indicacao', 'whatsapp', 'outro')),
  probabilidade text NOT NULL DEFAULT 'media' CHECK (probabilidade IN ('baixa', 'media', 'alta')),
  proximo_followup date,
  observacoes text,
  orcamento_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_prospections_status ON public.prospections(status);
CREATE INDEX IF NOT EXISTS idx_prospections_origem ON public.prospections(origem);
CREATE INDEX IF NOT EXISTS idx_prospections_probabilidade ON public.prospections(probabilidade);
CREATE INDEX IF NOT EXISTS idx_prospections_followup ON public.prospections(proximo_followup);
CREATE INDEX IF NOT EXISTS idx_prospections_orcamento ON public.prospections(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_prospections_created_by ON public.prospections(created_by);

-- Habilitar RLS
ALTER TABLE public.prospections ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Usuários autenticados podem visualizar prospecções"
  ON public.prospections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar prospecções"
  ON public.prospections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar prospecções"
  ON public.prospections FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar prospecções"
  ON public.prospections FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_prospections_updated_at
  BEFORE UPDATE ON public.prospections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
