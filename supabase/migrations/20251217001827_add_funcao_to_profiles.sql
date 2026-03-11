/*
  # Adicionar campo funcao ao perfil

  ## Alterações
  
  1. Adiciona campo funcao à tabela profiles
    - `funcao` (text) - Função do usuário na empresa
  
  ## Notas
    - Campo é opcional (nullable)
    - Remove a coluna cargo que não é mais utilizada
*/

DO $$
BEGIN
  -- Adicionar coluna funcao se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'funcao'
  ) THEN
    ALTER TABLE profiles ADD COLUMN funcao text;
  END IF;
END $$;