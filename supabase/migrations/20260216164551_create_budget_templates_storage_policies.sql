/*
  # Políticas de Storage para Templates de Orçamento

  1. Políticas
    - Leitura pública para todos os templates
    - Upload apenas para usuários autenticados
    - Usuários podem atualizar/deletar seus próprios arquivos
*/

-- Política para leitura pública
CREATE POLICY "Templates são publicamente acessíveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'budget-templates');

-- Política para upload
CREATE POLICY "Usuários autenticados podem fazer upload de templates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'budget-templates');

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