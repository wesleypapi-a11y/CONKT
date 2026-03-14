-- Execute este SQL no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/zifkaowbkcyqdqffyths/sql/new

BEGIN;

-- Passo 1: Remover a constraint que está bloqueando
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_empresa_id_fkey;

-- Passo 2: Deletar as empresas
DELETE FROM empresas WHERE nome IN ('OMEGA', 'BETA', 'ALPHA', 'ARCO');

-- Passo 3: Recriar a constraint com CASCADE DELETE
ALTER TABLE profiles
  ADD CONSTRAINT profiles_empresa_id_fkey
  FOREIGN KEY (empresa_id)
  REFERENCES empresas(id)
  ON DELETE CASCADE;

COMMIT;

-- Verificar resultado
SELECT nome FROM empresas ORDER BY nome;
