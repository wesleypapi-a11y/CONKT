/*
  # Criar usuário administrador inicial
  
  1. Cria o usuário admin na tabela auth.users
  2. Atualiza o perfil com role = 'admin'
  
  Credenciais:
  - Email: adm@arco.com
  - Senha: 123456789
  - Role: admin
*/

DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO user_id FROM auth.users WHERE email = 'adm@arco.com';
  
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
      'adm@arco.com',
      crypt('123456789', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome_completo":"Administrador ARCO"}'::jsonb,
      false,
      'authenticated',
      'authenticated'
    );
    
    -- Aguardar o trigger criar o perfil, então atualizar para admin
    UPDATE public.profiles 
    SET 
      role = 'admin',
      is_active = true,
      funcao = 'Administrador do Sistema',
      nome_completo = 'Administrador ARCO'
    WHERE id = user_id;
    
    RAISE NOTICE 'Usuário administrador criado com sucesso! Email: adm@arco.com';
  ELSE
    -- Atualizar perfil existente para admin
    UPDATE public.profiles 
    SET 
      role = 'admin',
      is_active = true,
      funcao = 'Administrador do Sistema',
      nome_completo = 'Administrador ARCO'
    WHERE id = user_id;
    
    RAISE NOTICE 'Usuário já existe. Perfil atualizado para admin.';
  END IF;
END $$;
