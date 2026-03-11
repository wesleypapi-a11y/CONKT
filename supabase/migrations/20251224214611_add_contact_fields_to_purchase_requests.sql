/*
  # Adicionar campos de contato em solicitações de compra

  1. Alterações na tabela
    - Adiciona coluna `contact_name` para nome do contato
    - Adiciona coluna `contact_whatsapp` para número do WhatsApp
  
  2. Detalhes
    - Ambos os campos são opcionais (nullable)
    - Serão usados para envio de cotações via WhatsApp
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requests' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN contact_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_requests' AND column_name = 'contact_whatsapp'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN contact_whatsapp TEXT;
  END IF;
END $$;
