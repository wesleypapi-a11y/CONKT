/*
  # Adicionar campo obra_nome à tabela tasks

  ## Alterações
  
  1. Adicionar coluna `obra_nome` (text, opcional)
    - Permite armazenar texto livre para nome da obra
    - Útil quando o usuário digita um nome ao invés de selecionar da lista
    - Prioridade: se obra_nome estiver preenchido, usa ele; senão usa a relação obra_id
  
  ## Notas
    - Mantém a coluna obra_id para obras cadastradas no sistema
    - obra_nome é opcional e permite flexibilidade
*/

-- Adicionar coluna obra_nome se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'obra_nome'
  ) THEN
    ALTER TABLE tasks ADD COLUMN obra_nome text;
  END IF;
END $$;
