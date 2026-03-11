/*
  # Tornar vínculos obrigatórios entre Obras → Clientes e Orçamentos → Obras

  1. Mudanças na tabela `works`
    - Torna `client_id` obrigatório (NOT NULL)
    - Adiciona foreign key para `clients` com ON DELETE RESTRICT
    - Adiciona índice para melhor performance

  2. Mudanças na tabela `budgets`
    - Torna `work_id` obrigatório (NOT NULL)
    - Adiciona foreign key para `works` com ON DELETE RESTRICT
    - Adiciona índice para melhor performance

  3. Notas de Segurança
    - ON DELETE RESTRICT previne exclusão acidental de clientes/obras que têm vínculos
    - Índices melhoram performance de consultas com JOIN
*/

-- Primeiro, vamos atualizar works existentes sem client_id para um cliente padrão (se houver)
-- Isso evita erro ao tornar o campo NOT NULL
DO $$
DECLARE
  default_client_id uuid;
BEGIN
  -- Pega o primeiro cliente disponível
  SELECT id INTO default_client_id FROM clients LIMIT 1;
  
  -- Se existe cliente e há obras sem client_id, atualiza
  IF default_client_id IS NOT NULL THEN
    UPDATE works 
    SET client_id = default_client_id 
    WHERE client_id IS NULL;
  END IF;
END $$;

-- Agora torna client_id obrigatório em works
ALTER TABLE works
  ALTER COLUMN client_id SET NOT NULL;

-- Adiciona foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'works_client_id_fkey'
  ) THEN
    ALTER TABLE works
      ADD CONSTRAINT works_client_id_fkey
      FOREIGN KEY (client_id)
      REFERENCES clients(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Adiciona índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_works_client_id ON works(client_id);

-- Agora para budgets e works
-- Primeiro, vamos atualizar budgets existentes sem work_id para uma obra padrão (se houver)
DO $$
DECLARE
  default_work_id uuid;
BEGIN
  -- Pega a primeira obra disponível
  SELECT id INTO default_work_id FROM works LIMIT 1;
  
  -- Se existe obra e há orçamentos sem work_id, atualiza
  IF default_work_id IS NOT NULL THEN
    UPDATE budgets 
    SET work_id = default_work_id 
    WHERE work_id IS NULL;
  END IF;
END $$;

-- Agora torna work_id obrigatório em budgets
ALTER TABLE budgets
  ALTER COLUMN work_id SET NOT NULL;

-- Adiciona foreign key constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'budgets_work_id_fkey'
  ) THEN
    ALTER TABLE budgets
      ADD CONSTRAINT budgets_work_id_fkey
      FOREIGN KEY (work_id)
      REFERENCES works(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Adiciona índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_budgets_work_id ON budgets(work_id);

-- Comentários para documentação
COMMENT ON COLUMN works.client_id IS 'Cliente vinculado à obra (obrigatório). Define o relacionamento Obra → Cliente';
COMMENT ON COLUMN budgets.work_id IS 'Obra vinculada ao orçamento (obrigatório). Define o relacionamento Orçamento → Obra';
