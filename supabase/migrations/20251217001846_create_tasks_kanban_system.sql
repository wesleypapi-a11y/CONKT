/*
  # Sistema de Tarefas Kanban

  ## Tabelas
  
  1. `tasks` - Tarefas do sistema Kanban
    - `id` (uuid, PK) - Identificador único
    - `obra_id` (uuid, FK) - Referência à obra
    - `descricao` (text) - Descrição da tarefa
    - `responsavel_id` (uuid, FK) - Usuário responsável
    - `status` (text) - Status/coluna da tarefa
    - `ordem` (integer) - Ordem da tarefa na coluna
    - `created_at` (timestamptz) - Data de criação
    - `updated_at` (timestamptz) - Data de atualização
    - `created_by` (uuid, FK) - Quem criou a tarefa
  
  ## Segurança
    - Ativar RLS
    - Políticas para usuários autenticados gerenciarem tarefas
  
  ## Notas
    - Status: 'todo', 'in_progress', 'review', 'done'
    - Ordem permite arrastar e reorganizar cards
*/

-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid REFERENCES works(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  responsavel_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Adicionar constraint para status
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'review', 'done'));

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tasks_obra_id ON tasks(obra_id);
CREATE INDEX IF NOT EXISTS idx_tasks_responsavel_id ON tasks(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Ativar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem ver todas as tarefas
CREATE POLICY "Usuários autenticados podem visualizar tarefas"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

-- Política: Usuários autenticados podem criar tarefas
CREATE POLICY "Usuários autenticados podem criar tarefas"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Política: Usuários autenticados podem atualizar tarefas
CREATE POLICY "Usuários autenticados podem atualizar tarefas"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Usuários autenticados podem deletar tarefas que criaram
CREATE POLICY "Usuários podem deletar próprias tarefas"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);