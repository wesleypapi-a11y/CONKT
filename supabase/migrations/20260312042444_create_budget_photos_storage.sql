/*
  # Storage para Fotos de Orçamento

  1. Novo Bucket
    - `budget-photos` - Armazena fotos vinculadas aos orçamentos
      - Público para facilitar visualização
      - Limite de 10MB por arquivo
      - Apenas imagens permitidas

  2. Segurança
    - Políticas RLS para controle de acesso
    - Usuários autenticados podem fazer upload
    - Todos podem visualizar (bucket público)
*/

-- Criar bucket para fotos de orçamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'budget-photos',
  'budget-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para budget-photos
CREATE POLICY "Usuários autenticados podem fazer upload de fotos de orçamento"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'budget-photos');

CREATE POLICY "Usuários autenticados podem visualizar fotos de orçamento"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'budget-photos');

CREATE POLICY "Usuários autenticados podem atualizar fotos de orçamento"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'budget-photos');

CREATE POLICY "Usuários autenticados podem deletar fotos de orçamento"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'budget-photos');

-- Política para acesso público (leitura)
CREATE POLICY "Público pode visualizar fotos de orçamento"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'budget-photos');
