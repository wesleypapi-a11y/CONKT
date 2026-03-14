/*
  # Corrigir constraint de role na tabela profiles

  1. Alterações
    - Remover constraint antiga que permite apenas 'admin' e 'user'
    - Adicionar nova constraint que permite: 'master', 'administrador', 'financeiro', 'colaborador', 'cliente'

  2. Segurança
    - Mantém todas as políticas RLS existentes
*/

-- Remover constraint antiga
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint com todos os roles permitidos
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'administrador', 'financeiro', 'colaborador', 'cliente'));
