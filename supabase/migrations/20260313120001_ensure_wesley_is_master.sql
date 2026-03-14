/*
  # Garantir que Wesley seja Master

  1. Atualização
    - Garantir que wesley@arco.com.br seja master
    - Remover empresa_id do perfil master
  
  2. Segurança
    - Manter RLS ativado
    - Verificar se perfil existe antes de atualizar
*/

-- Atualizar Wesley para ser master se ele existir
UPDATE profiles 
SET 
  role = 'master',
  empresa_id = NULL
WHERE email = 'wesley@arco.com.br';

-- Se não encontrou, tentar pelo ID conhecido
UPDATE profiles 
SET 
  role = 'master',
  empresa_id = NULL
WHERE id = '1a811c69-57b5-4951-8f24-c67f6236db7f';

-- Verificar resultado
DO $$
DECLARE
  master_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO master_count
  FROM profiles
  WHERE role = 'master';
  
  RAISE NOTICE 'Total de usuários master: %', master_count;
END $$;
