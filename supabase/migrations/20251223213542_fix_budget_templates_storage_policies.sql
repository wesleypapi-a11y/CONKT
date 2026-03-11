/*
  # Corrigir políticas de storage para templates de orçamento

  1. Remover políticas duplicadas
  2. Recriar políticas com nomes únicos
  3. Garantir que bucket existe
*/

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de templates" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar templates" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios templates" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios templates" ON storage.objects;

-- Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-templates', 'budget-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Política para upload
CREATE POLICY "budget_templates_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'budget-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualização
CREATE POLICY "budget_templates_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'budget-templates');

-- Política para atualização
CREATE POLICY "budget_templates_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'budget-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'budget-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para exclusão
CREATE POLICY "budget_templates_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'budget-templates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);