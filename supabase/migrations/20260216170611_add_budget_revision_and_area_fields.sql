/*
  # Adicionar campos de revisão e área ao orçamento

  1. Alterações na tabela `budgets`
    - Adiciona campo `revisao` (texto) - Número da revisão do orçamento
    - Adiciona campo `foto_obra_url` (texto) - URL da foto da obra para este orçamento específico
    - Adiciona campo `area_item` (texto) - Descrição do item de área
    - Adiciona campo `area_local` (texto) - Local da área
    - Adiciona campo `area_unitaria` (numeric) - Área unitária em m²
    - Adiciona campo `area_total` (numeric) - Área total em m²

  2. Notas
    - Campos opcionais para permitir flexibilidade
    - foto_obra_url permite sobrescrever a foto da obra se necessário
    - Campos de área permitem especificar detalhes sobre a área do projeto
*/

DO $$
BEGIN
  -- Adicionar campo de revisão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'revisao'
  ) THEN
    ALTER TABLE budgets ADD COLUMN revisao text DEFAULT '00';
  END IF;

  -- Adicionar campo de foto da obra (permite sobrescrever a foto da tabela works)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'foto_obra_url'
  ) THEN
    ALTER TABLE budgets ADD COLUMN foto_obra_url text;
  END IF;

  -- Adicionar campos de área
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_item'
  ) THEN
    ALTER TABLE budgets ADD COLUMN area_item text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_local'
  ) THEN
    ALTER TABLE budgets ADD COLUMN area_local text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_unitaria'
  ) THEN
    ALTER TABLE budgets ADD COLUMN area_unitaria numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_total'
  ) THEN
    ALTER TABLE budgets ADD COLUMN area_total numeric DEFAULT 0;
  END IF;
END $$;