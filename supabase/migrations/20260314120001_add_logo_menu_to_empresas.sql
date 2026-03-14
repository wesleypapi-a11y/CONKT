/*
  # Adicionar campo logo_menu à tabela empresas

  1. Alterações
    - Adicionar coluna `logo_menu` (text) à tabela empresas
    - Este campo armazenará a URL do logo específico de cada empresa
    - Será exibido no menu lateral para usuários da empresa

  2. Segurança
    - Herda as políticas RLS existentes da tabela empresas
    - Master pode editar qualquer logo
    - Admin não pode alterar (apenas visualizar)
*/

-- Adicionar coluna logo_menu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'logo_menu'
  ) THEN
    ALTER TABLE empresas ADD COLUMN logo_menu text;
  END IF;
END $$;
