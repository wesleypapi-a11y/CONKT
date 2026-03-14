-- Script de diagnóstico para cadastro de empresas

-- 1. Verificar se o usuário Wesley existe e é master
SELECT
  id,
  email,
  role,
  empresa_id,
  'Usuário existe' as status
FROM profiles
WHERE email = 'wesley@arco.com.br';

-- 2. Verificar se existem policies para INSERT
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'empresas'
  AND cmd = 'INSERT';

-- 3. Verificar estrutura da tabela empresas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'empresas'
ORDER BY ordinal_position;

-- 4. Testar insert direto (como master)
-- Comentado para não executar automaticamente
-- INSERT INTO empresas (
--   razao_social,
--   nome_fantasia,
--   cnpj,
--   telefone,
--   email,
--   data_inicio_vigencia,
--   data_fim_vigencia,
--   status
-- ) VALUES (
--   'Teste Empresa LTDA',
--   'Teste',
--   '12.345.678/0001-99',
--   '11999999999',
--   'teste@teste.com',
--   CURRENT_DATE,
--   CURRENT_DATE + INTERVAL '1 year',
--   'ativa'
-- );

-- 5. Verificar empresas existentes
SELECT
  id,
  razao_social,
  nome_fantasia,
  cnpj,
  status,
  created_at
FROM empresas
ORDER BY created_at DESC
LIMIT 5;
