/*
  # Adicionar prazo e colunas customizáveis

  1. Alterações na tabela tasks
    - Adicionar campo `deadline` (data limite para conclusão)
    - Adicionar campo `column_id` (referência para coluna customizável)

  2. Nova tabela task_columns
    - `id` (uuid, primary key)
    - `name` (text, nome da coluna)
    - `color` (text, cor da coluna)
    - `position` (integer, ordem de exibição)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  3. Inserir colunas padrão
    - A Fazer
    - Em Andamento  
    - Concluído

  4. Segurança
    - Enable RLS nas novas tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de colunas
CREATE TABLE IF NOT EXISTS task_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar colunas padrão
INSERT INTO task_columns (name, color, position) VALUES
  ('A Fazer', '#ef4444', 0),
  ('Em Andamento', '#f59e0b', 1),
  ('Concluído', '#10b981', 2)
ON CONFLICT DO NOTHING;

-- Adicionar campos na tabela tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE tasks ADD COLUMN deadline date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'column_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN column_id uuid REFERENCES task_columns(id);
  END IF;
END $$;

-- Atualizar tasks existentes com coluna padrão baseado no status
UPDATE tasks 
SET column_id = (
  SELECT id FROM task_columns WHERE name = 
    CASE 
      WHEN tasks.status = 'todo' THEN 'A Fazer'
      WHEN tasks.status = 'in-progress' THEN 'Em Andamento'
      WHEN tasks.status = 'done' THEN 'Concluído'
      ELSE 'A Fazer'
    END
  LIMIT 1
)
WHERE column_id IS NULL;

-- Enable RLS
ALTER TABLE task_columns ENABLE ROW LEVEL SECURITY;

-- Políticas para task_columns
CREATE POLICY "Usuários autenticados podem ver colunas"
  ON task_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar colunas"
  ON task_columns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar colunas"
  ON task_columns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar colunas"
  ON task_columns FOR DELETE
  TO authenticated
  USING (true);
