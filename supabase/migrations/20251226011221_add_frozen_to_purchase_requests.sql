/*
  # Adicionar campo frozen às solicitações de compra

  1. Alterações
    - Adiciona coluna `frozen` à tabela `purchase_requests`
      - Tipo: boolean
      - Padrão: false
      - Permite congelar/travar solicitações para impedir edição

  2. Notas
    - Quando frozen=true, a solicitação não pode ser editada
    - Útil para proteger solicitações que estão em processo de cotação
*/

-- Adicionar coluna frozen se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'frozen'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN frozen boolean DEFAULT false;
  END IF;
END $$;
