/*
  # Storage para Clientes

  ## Descrição
  Cria bucket de storage para fotos de perfil e anexos de clientes

  ## Storage
  - Bucket `client-files` para fotos e anexos
  - Políticas de acesso para usuários autenticados

  ## Segurança
  - Usuários podem fazer upload de arquivos para seus próprios clientes
  - Usuários podem visualizar e deletar arquivos de seus próprios clientes
*/

-- Criar bucket para arquivos de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de arquivos
CREATE POLICY "Users can upload client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualizar arquivos
CREATE POLICY "Users can view own client files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para atualizar arquivos
CREATE POLICY "Users can update own client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'client-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para deletar arquivos
CREATE POLICY "Users can delete own client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);