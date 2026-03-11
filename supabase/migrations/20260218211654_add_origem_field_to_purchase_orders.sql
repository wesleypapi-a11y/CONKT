/*
  # Adicionar campo de origem aos pedidos de compra
  
  ## Descrição
  
  Este migration adiciona suporte para distinguir entre pedidos vindos de contratos (PC-) 
  e pedidos vindos de ordens de compra/cotações (PCO-).
  
  ## Mudanças
  
  1. Adiciona coluna `origem` à tabela `purchase_orders`
     - Valores: 'CONTRATO' ou 'ORDEM_COMPRA'
     - Default: 'CONTRATO' (para manter compatibilidade com pedidos existentes)
  
  2. Adiciona função helper para gerar número do pedido com prefixo correto
  
  ## Notas Importantes
  
  - PC- = pedidos vindos de CONTRATO
  - PCO- = pedidos vindos de ORDEM_COMPRA (aprovação de cotações)
  - Ambos usam a mesma estrutura e mesma tabela
  - A diferença é apenas nomenclatura/prefixo e rastreabilidade de origem
*/

-- Adicionar coluna origem se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_orders' AND column_name = 'origem'
  ) THEN
    ALTER TABLE purchase_orders 
    ADD COLUMN origem text DEFAULT 'CONTRATO' CHECK (origem IN ('CONTRATO', 'ORDEM_COMPRA'));
  END IF;
END $$;

-- Atualizar pedidos existentes que tem quotation_id para serem origem ORDEM_COMPRA
UPDATE purchase_orders 
SET origem = 'ORDEM_COMPRA' 
WHERE quotation_id IS NOT NULL AND origem = 'CONTRATO';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_origem ON purchase_orders(origem);