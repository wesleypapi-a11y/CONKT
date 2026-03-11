/*
  # Corrigir Bucket de Arquivos de Clientes

  1. Alterações
    - Tornar o bucket 'client-files' público para permitir acesso às fotos
    - Remover políticas antigas que conflitam
    - Adicionar novas políticas compatíveis com acesso público

  2. Segurança
    - Bucket público para permitir visualização das fotos
    - Apenas usuários autenticados podem fazer upload
    - Usuários só podem gerenciar seus próprios arquivos (organizados por user_id)
*/

-- Tornar o bucket público
UPDATE storage.buckets
SET public = true
WHERE id = 'client-files';

-- Remover políticas antigas que conflitam
DROP POLICY IF EXISTS "Users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own client files" ON storage.objects;
DROP POLICY IF EXISTS "Client files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their client files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their client files" ON storage.objects;

-- Nova política para permitir acesso público aos arquivos (leitura)
CREATE POLICY "Public can view client files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-files');

-- Política para upload de arquivos (apenas autenticados)
CREATE POLICY "Authenticated users can upload client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para atualizar arquivos próprios
CREATE POLICY "Users can update own client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'client-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para deletar arquivos próprios
CREATE POLICY "Users can delete own client files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);