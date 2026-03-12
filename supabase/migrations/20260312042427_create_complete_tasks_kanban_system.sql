/*
  # Sistema Completo de Tarefas Kanban

  1. Novas Tabelas
    - `task_boards` - Quadros de tarefas organizacionais
      - `id` (uuid, PK)
      - `name` (text) - Nome do quadro
      - `position` (integer) - Ordem de exibição
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `task_columns` - Colunas personalizadas para os quadros
      - `id` (uuid, PK)
      - `name` (text) - Nome da coluna
      - `color` (text) - Cor da coluna
      - `position` (integer) - Ordem de exibição
      - `board_id` (uuid, FK) - Referência ao quadro
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `tasks` - Tarefas do sistema
      - `id` (uuid, PK)
      - `obra_id` (uuid, FK) - Obra vinculada
      - `descricao` (text) - Descrição da tarefa
      - `responsavel_id` (uuid, FK) - Responsável pela tarefa
      - `status` (text) - Status da tarefa
      - `ordem` (integer) - Ordem dentro da coluna
      - `deadline` (date) - Prazo da tarefa
      - `column_id` (uuid, FK) - Coluna do quadro
      - `board_id` (uuid, FK) - Quadro vinculado
      - `created_by` (uuid, FK) - Usuário que criou
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados
    
  3. Índices
    - Índices para melhorar performance de consultas
*/

-- Criar tabela de quadros de tarefas
CREATE TABLE IF NOT EXISTS public.task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de colunas de tarefas
CREATE TABLE IF NOT EXISTS public.task_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  position integer NOT NULL DEFAULT 0,
  board_id uuid REFERENCES public.task_boards(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  ordem integer NOT NULL DEFAULT 0,
  deadline date,
  column_id uuid REFERENCES public.task_columns(id) ON DELETE SET NULL,
  board_id uuid REFERENCES public.task_boards(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_task_boards_position ON public.task_boards(position);
CREATE INDEX IF NOT EXISTS idx_task_columns_board ON public.task_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_obra ON public.tasks(obra_id);
CREATE INDEX IF NOT EXISTS idx_tasks_responsavel ON public.tasks(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON public.tasks(column_id, ordem);
CREATE INDEX IF NOT EXISTS idx_tasks_board ON public.tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);

-- Habilitar RLS
ALTER TABLE public.task_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas para task_boards
CREATE POLICY "Usuários autenticados podem visualizar quadros"
  ON public.task_boards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar quadros"
  ON public.task_boards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar quadros"
  ON public.task_boards FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar quadros"
  ON public.task_boards FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para task_columns
CREATE POLICY "Usuários autenticados podem visualizar colunas"
  ON public.task_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar colunas"
  ON public.task_columns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar colunas"
  ON public.task_columns FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar colunas"
  ON public.task_columns FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para tasks
CREATE POLICY "Usuários autenticados podem visualizar tarefas"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar tarefas"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar tarefas"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar tarefas"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_boards_updated_at
  BEFORE UPDATE ON public.task_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_columns_updated_at
  BEFORE UPDATE ON public.task_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir quadro padrão
INSERT INTO public.task_boards (name, position)
VALUES ('Quadro Principal', 1)
ON CONFLICT DO NOTHING;

-- Inserir colunas padrão
DO $$
DECLARE
  board_id uuid;
BEGIN
  SELECT id INTO board_id FROM public.task_boards WHERE name = 'Quadro Principal' LIMIT 1;
  
  IF board_id IS NOT NULL THEN
    INSERT INTO public.task_columns (name, color, position, board_id)
    VALUES 
      ('A Fazer', '#EF4444', 1, board_id),
      ('Em Andamento', '#F59E0B', 2, board_id),
      ('Em Revisão', '#3B82F6', 3, board_id),
      ('Concluído', '#10B981', 4, board_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
