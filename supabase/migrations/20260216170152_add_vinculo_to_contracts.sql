/*
  # Adicionar campo vínculo aos contratos

  ## Descrição
  Adiciona o campo `vinculo` à tabela `contracts` para indicar se o contrato
  tem vínculo ou não.

  ## Alterações
    - Adiciona coluna `vinculo` (text) à tabela `contracts`
    - Valores permitidos: 'com_vinculo', 'sem_vinculo'
    - Valor padrão: 'sem_vinculo'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'vinculo'
  ) THEN
    ALTER TABLE contracts ADD COLUMN vinculo text DEFAULT 'sem_vinculo' CHECK (vinculo IN ('com_vinculo', 'sem_vinculo'));
  END IF;
END $$;