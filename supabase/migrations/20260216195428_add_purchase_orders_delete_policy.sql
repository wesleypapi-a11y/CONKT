/*
  # Adicionar política de DELETE para purchase_orders

  ## Mudanças
  
  1. **Políticas RLS**
     - Adicionar política de DELETE para purchase_orders
     - Permitir que usuários autenticados excluam pedidos de compra

  ## Notas Importantes
  - Sem essa política, o RLS bloqueia a exclusão de pedidos
  - Com essa política, usuários autenticados poderão excluir pedidos
*/

-- Adicionar política de DELETE para purchase_orders se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_orders' 
    AND policyname = 'Users can delete purchase_orders'
  ) THEN
    CREATE POLICY "Users can delete purchase_orders"
      ON purchase_orders FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;