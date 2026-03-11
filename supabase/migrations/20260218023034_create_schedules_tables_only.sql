/*
  # Sistema de Cronogramas - Tabelas
  
  Cria as tabelas necessárias para o sistema de cronogramas.
  
  ## Novas Tabelas
  - schedules - Cronogramas principais
  - schedule_holidays - Feriados dos cronogramas
  - schedule_tasks - Tarefas dos cronogramas
  
  ## Segurança
  - RLS habilitado
  - Políticas para usuários autenticados
*/

-- Tabela de cronogramas
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  work_id uuid REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  start_date date,
  end_date date,
  consider_weekends boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON schedules FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON schedules FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tabela de feriados
CREATE TABLE IF NOT EXISTS schedule_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
  holiday_date date NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view holidays of own schedules"
  ON schedule_holidays FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_holidays.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert holidays to own schedules"
  ON schedule_holidays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_holidays.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update holidays of own schedules"
  ON schedule_holidays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_holidays.schedule_id
      AND schedules.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_holidays.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete holidays from own schedules"
  ON schedule_holidays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_holidays.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_macro boolean DEFAULT false,
  parent_id uuid REFERENCES schedule_tasks(id) ON DELETE CASCADE,
  duration integer DEFAULT 0,
  start_date date,
  end_date date,
  predecessors text DEFAULT '',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  responsible text DEFAULT '',
  notes text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks of own schedules"
  ON schedule_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_tasks.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks to own schedules"
  ON schedule_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_tasks.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks of own schedules"
  ON schedule_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_tasks.schedule_id
      AND schedules.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_tasks.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks from own schedules"
  ON schedule_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      WHERE schedules.id = schedule_tasks.schedule_id
      AND schedules.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_work_id ON schedules(work_id);
CREATE INDEX IF NOT EXISTS idx_schedule_holidays_schedule_id ON schedule_holidays(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_schedule_id ON schedule_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_parent_id ON schedule_tasks(parent_id);
