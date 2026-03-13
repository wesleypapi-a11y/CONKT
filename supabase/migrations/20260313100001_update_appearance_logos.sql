/*
  # Atualizar estrutura de logos na aparência

  1. Alterações
    - Renomear campos de logo para padronização
    - logo_login: imagem na tela de login
    - logo_menu: imagem no topo do menu
    - logo_inicio: imagem na página inicial
    - Remover campos de cores do menu (serão fixos)

  2. Migração de dados
    - Manter dados existentes
*/

-- Renomear campos existentes
DO $$
BEGIN
  -- Renomear logo_url para logo_menu
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appearance_preferences' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE appearance_preferences RENAME COLUMN logo_url TO logo_menu;
  END IF;

  -- Renomear home_image_url para logo_inicio
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appearance_preferences' AND column_name = 'home_image_url'
  ) THEN
    ALTER TABLE appearance_preferences RENAME COLUMN home_image_url TO logo_inicio;
  END IF;
END $$;

-- Adicionar novo campo logo_login
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appearance_preferences' AND column_name = 'logo_login'
  ) THEN
    ALTER TABLE appearance_preferences ADD COLUMN logo_login text;
  END IF;
END $$;

-- Remover campos de cores do menu (não serão mais usados)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appearance_preferences' AND column_name = 'menu_bg_color'
  ) THEN
    ALTER TABLE appearance_preferences DROP COLUMN menu_bg_color;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appearance_preferences' AND column_name = 'menu_text_color'
  ) THEN
    ALTER TABLE appearance_preferences DROP COLUMN menu_text_color;
  END IF;
END $$;
