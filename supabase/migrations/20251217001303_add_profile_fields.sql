/*
  # Adicionar campos ao perfil do usuário

  ## Alterações
  
  1. Novos campos na tabela `profiles`:
    - `telefone` (text) - Telefone do usuário
    - `profissao` (text) - Profissão do usuário
    - `cpf` (text) - CPF do usuário (único)
    - `data_nascimento` (date) - Data de nascimento do usuário
    
  2. Modificações:
    - Adicionar constraint para garantir que user_type seja apenas: 'administrador', 'colaborador' ou 'cliente'
  
  ## Notas
    - Todos os campos são opcionais (nullable) para não quebrar dados existentes
    - CPF é único para evitar duplicações
*/

DO $$
BEGIN
  -- Adicionar coluna telefone se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'telefone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN telefone text;
  END IF;

  -- Adicionar coluna profissao se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profissao'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profissao text;
  END IF;

  -- Adicionar coluna cpf se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE profiles ADD COLUMN cpf text UNIQUE;
  END IF;

  -- Adicionar coluna data_nascimento se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'data_nascimento'
  ) THEN
    ALTER TABLE profiles ADD COLUMN data_nascimento date;
  END IF;
END $$;

-- Adicionar constraint para user_type (remove se já existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_user_type_check;
  END IF;
END $$;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('administrador', 'colaborador', 'cliente'));