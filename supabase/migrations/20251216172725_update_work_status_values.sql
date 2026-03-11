/*
  # Atualizar valores de status da obra

  ## Descrição
  Atualiza os valores possíveis do campo status da tabela works

  ## Alterações
  1. Remove a constraint antiga do status
  2. Adiciona nova constraint com os novos valores:
    - pre_obra (Pré obra)
    - em_andamento (Em andamento)
    - em_orcamento (Em orçamento)
    - finalizada (Finalizada)
    - pos_obra (Pós-obra)
  3. Atualiza registros existentes 'pre_cadastro' para 'pre_obra'
  4. Atualiza registros existentes 'ativo' para 'em_andamento'
*/

-- Atualizar registros existentes
UPDATE works SET status = 'pre_obra' WHERE status = 'pre_cadastro';
UPDATE works SET status = 'em_andamento' WHERE status = 'ativo';

-- Remover constraint antiga
ALTER TABLE works DROP CONSTRAINT IF EXISTS works_status_check;

-- Adicionar nova constraint com os novos valores
ALTER TABLE works ADD CONSTRAINT works_status_check 
  CHECK (status IN ('pre_obra', 'em_andamento', 'em_orcamento', 'finalizada', 'pos_obra'));

-- Atualizar valor padrão
ALTER TABLE works ALTER COLUMN status SET DEFAULT 'pre_obra';
