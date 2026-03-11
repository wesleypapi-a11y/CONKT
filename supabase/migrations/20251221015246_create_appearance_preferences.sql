/*
  # Criar tabela de preferências de aparência

  1. Nova Tabela
    - `appearance_preferences`
      - `user_id` (uuid, primary key, foreign key para profiles)
      - `theme` (text) - 'light' ou 'dark'
      - `primary_color` (text) - cor hexadecimal
      - `secondary_color` (text) - cor hexadecimal
      - `font_size` (text) - 'small', 'medium', 'large'
      - `layout_density` (text) - 'compact', 'normal', 'comfortable'
      - `animations_enabled` (boolean)
      - `custom_logo_url` (text)
      - `updated_at` (timestamptz)
      
  2. Segurança
    - Enable RLS
    - Usuários podem ver e editar apenas suas próprias preferências
    
  3. Notas
    - Preferências são específicas por usuário
    - Valores padrão definidos para nova instalação
*/

-- Criar tabela de preferências de aparência
CREATE TABLE IF NOT EXISTS appearance_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  primary_color text DEFAULT '#0066CC',
  secondary_color text DEFAULT '#FF6B35',
  font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  layout_density text DEFAULT 'normal' CHECK (layout_density IN ('compact', 'normal', 'comfortable')),
  animations_enabled boolean DEFAULT true,
  custom_logo_url text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appearance_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas preferências"
  ON appearance_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem inserir suas preferências"
  ON appearance_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas preferências"
  ON appearance_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_appearance_preferences_user_id 
  ON appearance_preferences(user_id);

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_appearance_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS update_appearance_preferences_timestamp_trigger ON appearance_preferences;
CREATE TRIGGER update_appearance_preferences_timestamp_trigger
  BEFORE UPDATE ON appearance_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_appearance_preferences_timestamp();