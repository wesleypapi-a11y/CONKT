/*
  # Adicionar Wesley como usuário administrador

  1. Cria o usuário wesley na tabela auth.users
  2. Atualiza o perfil com role = 'admin'
  
  Credenciais:
  - Email: wesleypapi@gmail.com
  - Senha: Arco@2024
  - Role: admin
*/

DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO user_id FROM auth.users WHERE email = 'wesleypapi@gmail.com';
  
  IF user_id IS NULL THEN
    -- Gerar ID para o usuário
    user_id := gen_random_uuid();
    
    -- Criar novo usuário
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
      user_id,
      '00000000-0000-0000-0000-000000000000',
      'wesleypapi@gmail.com',
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
    
    -- Criar perfil admin
    INSERT INTO public.profiles (
      id,
      email,
      nome_completo,
      role,
      is_active,
      funcao,
      created_at,
      updated_at
    )
    VALUES (
      user_id,
      'wesleypapi@gmail.com',
      'Wesley Papi',
      'admin',
      true,
      'Administrador',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_active = true,
      funcao = 'Administrador',
      nome_completo = 'Wesley Papi';
    
    RAISE NOTICE 'Usuário Wesley criado com sucesso! Email: wesleypapi@gmail.com';
  ELSE
    -- Atualizar perfil existente para admin
    UPDATE public.profiles 
    SET 
      role = 'admin',
      is_active = true,
      funcao = 'Administrador',
      nome_completo = 'Wesley Papi'
    WHERE id = user_id;
    
    RAISE NOTICE 'Usuário Wesley já existe. Perfil atualizado para admin.';
  END IF;
END $$;
