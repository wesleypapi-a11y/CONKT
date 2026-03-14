# Diagnóstico Completo: Cadastro de Empresas

## Status Atual do Código

O código do formulário de cadastro de empresas já está com **LOGS COMPLETOS DE DEPURAÇÃO**.

### 1. A função de cadastro está sendo chamada?

**SIM** - A função `handleSubmit` tem logs extensivos em cada etapa:

```typescript
console.log('=== INICIANDO CADASTRO DE EMPRESA ===');
console.log('Dados do formulário:', formData);
console.log('Validação OK - todos os campos obrigatórios preenchidos');
console.log('Usuário logado:', user?.email, 'ID:', user?.id);
console.log('Perfil do usuário:', profile);
console.log('Modo CADASTRO - inserindo nova empresa');
console.log('Tentando inserir:', formData);
```

### 2. Estrutura da Tabela Empresas

Campos esperados pelo banco:
- `id` (uuid, auto-gerado)
- `razao_social` (text, NOT NULL)
- `nome_fantasia` (text, NOT NULL)
- `cnpj` (text, UNIQUE, NOT NULL)
- `telefone` (text, opcional)
- `email` (text, opcional)
- `data_inicio_vigencia` (date, NOT NULL, default CURRENT_DATE)
- `data_fim_vigencia` (date, NOT NULL, default CURRENT_DATE + 1 year)
- `status` (text, NOT NULL, default 'ativa')
- `created_at` (timestamptz, auto-gerado)
- `updated_at` (timestamptz, auto-gerado)

### 3. Dados Enviados pelo Formulário

O `formData` contém EXATAMENTE os mesmos campos:

```typescript
const [formData, setFormData] = useState({
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  telefone: '',
  email: '',
  data_inicio_vigencia: new Date().toISOString().split('T')[0],
  data_fim_vigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'ativa' as 'ativa' | 'inativa' | 'bloqueada',
});
```

### 4. Políticas RLS Verificadas

Existem 3 políticas para usuários MASTER na tabela `empresas`:

1. **SELECT**: "Master users can view all empresas"
2. **INSERT**: "Master users can insert empresas"
3. **UPDATE**: "Master users can update empresas"

A política de INSERT verifica:
```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'master'
)
```

### 5. Usuário Wesley

A migration `20260313120001_ensure_wesley_is_master.sql` garante que:
- wesley@arco.com.br tem `role = 'master'`
- `empresa_id = NULL` (master não pertence a empresa específica)

### 6. Tratamento de Erros

O código tem try/catch completo com logs detalhados:

```typescript
if (error) {
  console.error('ERRO AO INSERIR EMPRESA:', error);
  console.error('Detalhes completos do erro:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  throw error;
}
```

## Cenários de Teste

### Para executar o diagnóstico:

1. **Abrir o Console do Navegador** (F12)
2. **Preencher todos os campos do formulário**:
   - Razão Social: "Teste LTDA"
   - Nome Fantasia: "Teste"
   - CNPJ: "12.345.678/0001-99"
   - Telefone: "11999999999"
   - Email: "teste@teste.com"
   - Status: Ativa

3. **Clicar em "Cadastrar"**

4. **Verificar no Console**:
   - `=== INICIANDO CADASTRO DE EMPRESA ===`
   - `Dados do formulário: {...}`
   - `Validação OK`
   - `Usuário logado: wesley@arco.com.br`
   - `Perfil do usuário: {role: 'master', ...}`
   - `Modo CADASTRO - inserindo nova empresa`
   - `Tentando inserir: {...}`

5. **Se houver erro, o console mostrará**:
   - `ERRO AO INSERIR EMPRESA:`
   - `Detalhes completos do erro:`
   - `message, details, hint, code`

## Possíveis Causas do Erro

Se o cadastro não funcionar, o erro pode ser:

### A) RLS bloqueando insert
- **Verificar**: O perfil `wesley@arco.com.br` realmente tem `role = 'master'`?
- **Solução**: Executar manualmente `UPDATE profiles SET role = 'master', empresa_id = NULL WHERE email = 'wesley@arco.com.br';`

### B) Campo com formato incorreto
- **Verificar**: As datas estão no formato `YYYY-MM-DD`?
- **Solução**: O código já converte com `.toISOString().split('T')[0]`

### C) CNPJ duplicado
- **Verificar**: Já existe empresa com esse CNPJ?
- **Solução**: Usar CNPJ diferente ou deletar empresa existente

### D) Constraint violada
- **Verificar**: Algum CHECK constraint falhando (ex: status não é 'ativa', 'inativa' ou 'bloqueada')
- **Solução**: Garantir que formData.status é exatamente um dos valores válidos

## Script SQL para Diagnóstico

Execute no Supabase SQL Editor o arquivo `test-empresa-insert.sql` que foi criado para:

1. Verificar se Wesley existe e é master
2. Ver as policies de INSERT
3. Ver estrutura da tabela empresas
4. Ver empresas existentes

## Resposta ao Usuário

**1. A função de cadastro está sendo chamada?**
✅ SIM - O código tem logs completos em cada etapa

**2. Qual é o erro exato?**
⏳ AGUARDANDO - Os logs detalhados mostrarão o erro real quando o usuário testar

**3. Em qual linha estava o problema?**
⏳ AGUARDANDO - Os logs identificarão a linha exata

**4. O erro é no frontend, no banco ou na policy?**
⏳ AGUARDANDO - Os logs mostrarão se é:
   - Validação (frontend)
   - RLS bloqueando (policy)
   - Constraint violada (banco)
   - Campo inválido (dados)

**5. O insert na tabela `empresas` funciona?**
⏳ AGUARDANDO - Precisa testar no console do navegador

**6. A empresa cadastrada aparece na lista?**
⏳ AGUARDANDO - Se o insert funcionar, `loadEmpresas()` é chamado automaticamente

## Próximos Passos

1. Usuário deve testar o cadastro com console aberto
2. Copiar os logs completos do console
3. Informar qual foi o erro específico mostrado
4. Com o erro real, farei a correção cirúrgica
