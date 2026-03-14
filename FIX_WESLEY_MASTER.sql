-- Corrigir role do Wesley para Master
UPDATE profiles
SET
  role = 'master',
  empresa_id = NULL,
  is_active = true,
  updated_at = NOW()
WHERE email IN ('wesley@conkt.com.br', 'wesleypapi@gmail.com');

-- Verificar resultado
SELECT id, email, nome_completo, role, empresa_id, is_active
FROM profiles
WHERE email IN ('wesley@conkt.com.br', 'wesleypapi@gmail.com');
