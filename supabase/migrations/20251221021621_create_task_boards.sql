/*
  # Criar sistema de abas/quadros para tarefas

  1. Nova tabela task_boards
    - `id` (uuid, primary key)
    - `name` (text, nome da aba/quadro)
    - `position` (integer, ordem de exibição)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. Alterações nas tabelas existentes
    - Adicionar `board_id` em task_columns
    - Adicionar `board_id` em tasks

  3. Inserir quadro padrão
    - Quadro principal

  4. Segurança
    - Enable RLS na tabela task_boards
    - Políticas para usuários autenticados
*/

-- Criar tabela de quadros/abas
CREATE TABLE IF NOT EXISTS task_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir quadro padrão
INSERT INTO task_boards (name, position) VALUES
  ('Quadro Principal', 0)
ON CONFLICT DO NOTHING;

-- Adicionar board_id nas colunas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_columns' AND column_name = 'board_id'
  ) THEN
    ALTER TABLE task_columns ADD COLUMN board_id uuid REFERENCES task_boards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Atualizar colunas existentes com o quadro padrão
UPDATE task_columns 
SET board_id = (SELECT id FROM task_boards WHERE name = 'Quadro Principal' LIMIT 1)
WHERE board_id IS NULL;

-- Adicionar board_id nas tarefas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'board_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN board_id uuid REFERENCES task_boards(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Atualizar tarefas existentes com o quadro padrão
UPDATE tasks 
SET board_id = (SELECT id FROM task_boards WHERE name = 'Quadro Principal' LIMIT 1)
WHERE board_id IS NULL;

-- Enable RLS
ALTER TABLE task_boards ENABLE ROW LEVEL SECURITY;

-- Políticas para task_boards
CREATE POLICY "Usuários autenticados podem ver quadros"
  ON task_boards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar quadros"
  ON task_boards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar quadros"
  ON task_boards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar quadros"
  ON task_boards FOR DELETE
  TO authenticated
  USING (true);
