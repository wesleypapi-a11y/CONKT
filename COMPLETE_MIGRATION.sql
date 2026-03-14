/*
  SOLUÇÃO COMPLETA: Criar usuário Master Wesley
  Execute este SQL no Supabase Dashboard > SQL Editor
*/

-- 1. Primeiro, vamos verificar se o usuário existe no auth.users
DO $$
DECLARE
  existing_user_id uuid;
  existing_email text;
BEGIN
  -- Procurar por variações do email Wesley
  SELECT id, email INTO existing_user_id, existing_email
  FROM auth.users
  WHERE email IN ('wesley.papi@gmail.com', 'wesleypapi@gmail.com', 'wesley@conkt.com.br')
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'Usuário encontrado: % (ID: %)', existing_email, existing_user_id;

    -- Criar/atualizar perfil master
    INSERT INTO profiles (
      id,
      email,
      nome_completo,
      role,
      is_active,
      empresa_id,
      funcao,
      created_at,
      updated_at
    )
    VALUES (
      existing_user_id,
      existing_email,
      'Wesley Papi',
      'master',
      true,
      NULL,
      'Master',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'master',
      empresa_id = NULL,
      is_active = true,
      funcao = 'Master',
      updated_at = NOW();

    RAISE NOTICE 'Perfil master criado/atualizado com sucesso!';
  ELSE
    RAISE NOTICE 'Nenhum usuário Wesley encontrado no auth.users';
    RAISE NOTICE 'Criando novo usuário...';

    -- Criar novo usuário
    existing_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    )
    VALUES (
      existing_user_id,
      '00000000-0000-0000-0000-000000000000',
      'wesley.papi@gmail.com',
      crypt('Arco@2024', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome_completo":"Wesley Papi"}'::jsonb,
      false,
      'authenticated',
      'authenticated'
    );

    -- Criar perfil master
    INSERT INTO profiles (
      id,
      email,
      nome_completo,
      role,
      is_active,
      empresa_id,
      funcao,
      created_at,
      updated_at
    )
    VALUES (
      existing_user_id,
      'wesley.papi@gmail.com',
      'Wesley Papi',
      'master',
      true,
      NULL,
      'Master',
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Novo usuário master criado! Email: wesley.papi@gmail.com | Senha: Arco@2024';
  END IF;
END $$;

-- 2. Verificar resultado final
SELECT
  id,
  email,
  nome_completo,
  role,
  empresa_id,
  is_active,
  funcao
FROM profiles
WHERE role = 'master';
