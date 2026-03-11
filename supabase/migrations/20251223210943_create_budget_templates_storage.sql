/*
  # Storage para Templates de Orçamento

  1. Criar bucket para templates
  2. Adicionar políticas de acesso
*/

-- Criar bucket para templates (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-templates', 'budget-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Política para upload (usuários autenticados)
CREATE POLICY "Usuários autenticados podem fazer upload de templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'budget-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para visualização (usuários autenticados)
CREATE POLICY "Usuários autenticados podem visualizar templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'budget-templates');

-- Política para atualização
CREATE POLICY "Usuários podem atualizar seus próprios templates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'budget-templates' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'budget-templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para exclusão
CREATE POLICY "Usuários podem deletar seus próprios templates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'budget-templates' AND auth.uid()::text = (storage.foldername(name))[1]);