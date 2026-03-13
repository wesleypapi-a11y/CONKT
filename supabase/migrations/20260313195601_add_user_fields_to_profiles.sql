/*
  # Adicionar campos de usuário ao profiles

  1. Alterações
    - Adicionar `status` (text - ativo, inativo) ao profiles
    - Adicionar `data_vigencia_contrato` (date) ao profiles

  2. Notas
    - Campo status define se o usuário está ativo ou inativo no sistema
    - Campo data_vigencia_contrato define até quando o contrato do usuário é válido
    - Usuários inativos não devem conseguir fazer login
*/

-- Adicionar campo status se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo'));
  END IF;
END $$;

-- Adicionar campo data_vigencia_contrato se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'data_vigencia_contrato'
  ) THEN
    ALTER TABLE profiles ADD COLUMN data_vigencia_contrato date DEFAULT (CURRENT_DATE + INTERVAL '1 year');
  END IF;
END $$;

-- Criar índice para status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Criar índice para data_vigencia_contrato
CREATE INDEX IF NOT EXISTS idx_profiles_vigencia ON profiles(data_vigencia_contrato);

-- Atualizar usuários existentes para terem status ativo e vigência de 1 ano
UPDATE profiles
SET
  status = 'ativo',
  data_vigencia_contrato = CURRENT_DATE + INTERVAL '1 year'
WHERE status IS NULL OR data_vigencia_contrato IS NULL;
