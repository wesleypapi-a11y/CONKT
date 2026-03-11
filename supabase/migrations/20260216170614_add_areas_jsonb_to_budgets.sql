/*
  # Adicionar campo areas ao orçamento

  1. Mudanças
    - Remove campos antigos de área (area_item, area_local, area_unitaria, area_total)
    - Adiciona campo areas como JSONB para armazenar array de áreas
  
  2. Segurança
    - Mantém RLS existente
*/

-- Adicionar coluna areas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'areas'
  ) THEN
    ALTER TABLE budgets ADD COLUMN areas jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Remover colunas antigas se existirem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_item'
  ) THEN
    ALTER TABLE budgets DROP COLUMN area_item;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_local'
  ) THEN
    ALTER TABLE budgets DROP COLUMN area_local;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_unitaria'
  ) THEN
    ALTER TABLE budgets DROP COLUMN area_unitaria;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'area_total'
  ) THEN
    ALTER TABLE budgets DROP COLUMN area_total;
  END IF;
END $$;