/*
  # Atualizar formato de numeração S-C-P

  1. Alterações
    - Atualiza função de geração de número de solicitação para formato S-XXXX
    - Usa 4 dígitos aleatórios que não repetem
    - Remove trigger antigo e cria novo

  2. Formato
    - Solicitação: S-XXXX (ex: S-1234)
    - Cotação: C-XXXX (mesmo número da solicitação)
    - Pedido: P-XXXX (mesmo número da solicitação/cotação)

  3. Notas
    - Números são aleatórios para evitar padrões previsíveis
    - Sistema verifica se número já existe antes de gerar
*/

-- Remove trigger antigo
DROP TRIGGER IF EXISTS trigger_set_request_number ON purchase_requests;

-- Remove função antiga
DROP FUNCTION IF EXISTS set_request_number();
DROP FUNCTION IF EXISTS generate_request_number();

-- Cria nova função para gerar número aleatório de 4 dígitos
CREATE OR REPLACE FUNCTION generate_random_request_number()
RETURNS text AS $$
DECLARE
  random_num integer;
  new_number text;
  max_attempts integer := 100;
  attempt integer := 0;
BEGIN
  LOOP
    -- Gera número aleatório entre 1000 e 9999
    random_num := floor(random() * 9000 + 1000)::integer;
    new_number := 'S-' || random_num::text;
    
    -- Verifica se já existe
    IF NOT EXISTS (
      SELECT 1 FROM purchase_requests WHERE request_number = new_number
    ) THEN
      RETURN new_number;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Não foi possível gerar número único após % tentativas', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para definir número da solicitação
CREATE OR REPLACE FUNCTION set_random_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_random_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria novo trigger
CREATE TRIGGER trigger_set_random_request_number
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_random_request_number();
