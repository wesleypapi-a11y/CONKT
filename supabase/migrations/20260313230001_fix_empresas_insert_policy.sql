/*
  # Corrigir política de INSERT na tabela empresas

  1. Problema
    - A política de INSERT para empresas verifica role = 'master'
    - Mas a política pode estar desatualizada ou com problema
    - Usuários master não conseguem inserir novas empresas

  2. Alterações
    - Recriar política de INSERT para master
    - Garantir que funciona corretamente

  3. Segurança
    - Apenas usuários master podem criar empresas
*/

-- Remover política antiga
DROP POLICY IF EXISTS "Master users can insert empresas" ON empresas;

-- Criar política correta
CREATE POLICY "Master users can insert empresas"
  ON empresas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'master'
    )
  );
