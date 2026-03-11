/*
  # Adicionar número do PC às parcelas de contrato

  1. Alterações
    - Adiciona coluna `purchase_order_number` à tabela `contract_installments`
    - Armazena o número do pedido de compra (PC) gerado quando a parcela é marcada como paga
    
  2. Notas
    - Campo opcional (nullable) pois nem todas as parcelas terão PC vinculado
    - Facilita visualização na aba Parcelas
*/

-- Adicionar coluna para armazenar o número do PC
ALTER TABLE contract_installments 
ADD COLUMN IF NOT EXISTS purchase_order_number text;