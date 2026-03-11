/*
  # Adicionar coluna base_number à tabela purchase_requests

  1. Alterações
    - Adiciona coluna `base_number` (texto) para armazenar os 4 dígitos base
    - Extrai e preenche base_number dos request_number existentes
    - Atualiza trigger para gerar base_number automaticamente em novos registros

  2. Propósito
    - Manter mesmo número ao transitar entre status: S-1234 → C-1234 → P-1234
    - Facilitar rastreabilidade de solicitações/cotações/pedidos
*/

-- Adicionar coluna base_number se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'base_number'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN base_number text;
  END IF;
END $$;

-- Extrair e preencher base_number dos request_number existentes
-- Ex: "S-1234" → "1234", "C-5678" → "5678", "P-9012" → "9012"
UPDATE purchase_requests
SET base_number = SUBSTRING(request_number FROM '[0-9]+')
WHERE base_number IS NULL AND request_number IS NOT NULL;

-- Criar ou substituir função para gerar números únicos
CREATE OR REPLACE FUNCTION set_random_request_number()
RETURNS TRIGGER AS $$
DECLARE
  random_num integer;
  new_number text;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  -- Só gera se request_number estiver vazio ou nulo
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    LOOP
      -- Gera número aleatório entre 1000 e 9999
      random_num := floor(random() * 9000 + 1000)::integer;
      new_number := random_num::text;
      
      -- Verifica se já existe esse base_number
      IF NOT EXISTS (
        SELECT 1 FROM purchase_requests 
        WHERE base_number = new_number 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
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
  
  -- Se já tem request_number mas não tem base_number, extrair
  IF NEW.base_number IS NULL AND NEW.request_number IS NOT NULL THEN
    NEW.base_number := SUBSTRING(NEW.request_number FROM '[0-9]+');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_request_number_trigger'
  ) THEN
    CREATE TRIGGER set_request_number_trigger
      BEFORE INSERT ON purchase_requests
      FOR EACH ROW
      EXECUTE FUNCTION set_random_request_number();
  END IF;
END $$;
