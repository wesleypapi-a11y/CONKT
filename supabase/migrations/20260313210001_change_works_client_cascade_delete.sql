/*
  # Alterar comportamento de exclusão: Cliente → Obras para CASCADE

  1. Mudanças
    - Remove constraint RESTRICT de works.client_id
    - Adiciona constraint CASCADE: ao excluir cliente, obras vinculadas são excluídas automaticamente
    - Isto propaga para orçamentos, cronogramas, etc. via soft delete

  2. Segurança
    - Mantém RLS policies existentes
    - Soft delete em obras é propagado automaticamente
*/

-- Remove a constraint antiga
ALTER TABLE works
  DROP CONSTRAINT IF EXISTS works_client_id_fkey;

-- Adiciona nova constraint com ON DELETE CASCADE
ALTER TABLE works
  ADD CONSTRAINT works_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES clients(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT works_client_id_fkey ON works IS 'Ao excluir cliente, todas as obras vinculadas são excluídas automaticamente';
