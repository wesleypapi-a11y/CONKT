/*
  # Storage para anexos de contratos

  1. Novo Bucket
    - `contract-attachments` para armazenar anexos dos contratos
  
  2. Políticas de Acesso
    - Usuários autenticados podem fazer upload de anexos nos seus contratos
    - Usuários autenticados podem visualizar anexos dos seus contratos
    - Usuários autenticados podem excluir anexos dos seus contratos
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-attachments', 'contract-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload attachments to own contracts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contract-attachments' AND
    (storage.foldername(name))[1] = 'contracts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can view attachments of own contracts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-attachments' AND
    (storage.foldername(name))[1] = 'contracts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete attachments of own contracts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contract-attachments' AND
    (storage.foldername(name))[1] = 'contracts' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );