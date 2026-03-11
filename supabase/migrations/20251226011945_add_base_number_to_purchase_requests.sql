/*
  # Adicionar número base às solicitações

  1. Alterações
    - Adiciona coluna `base_number` para armazenar os 4 dígitos
    - Atualiza registros existentes extraindo o número base
    - Modifica função de geração para também salvar o base_number

  2. Uso
    - base_number armazena apenas os 4 dígitos (ex: 1234)
    - Permite manter o mesmo número ao converter S->C->P
*/

-- Adicionar coluna base_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'base_number'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN base_number text;
  END IF;
END $$;

-- Atualizar registros existentes para extrair base_number do request_number
UPDATE purchase_requests
SET base_number = SUBSTRING(request_number FROM '[0-9]+')
WHERE base_number IS NULL;

-- Atualizar função para também salvar o base_number
CREATE OR REPLACE FUNCTION set_random_request_number()
RETURNS TRIGGER AS $$
DECLARE
  random_num integer;
  new_number text;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    LOOP
      -- Gera número aleatório entre 1000 e 9999
      random_num := floor(random() * 9000 + 1000)::integer;
      new_number := random_num::text;
      
      -- Verifica se já existe
      IF NOT EXISTS (
        SELECT 1 FROM purchase_requests WHERE base_number = new_number
      ) THEN
        NEW.base_number := new_number;
        NEW.request_number := 'S-' || new_number;
        RETURN NEW;
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Não foi possível gerar número único após % tentativas', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
