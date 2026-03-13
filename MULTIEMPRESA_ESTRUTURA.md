# Estrutura Multi-Empresa (Multi-Tenant)

## Visão Geral

O sistema foi transformado em uma arquitetura **multi-tenant**, permitindo que múltiplas empresas utilizem a mesma aplicação com **isolamento total de dados**.

## Estrutura de Banco de Dados

### Tabela `empresas`

```sql
- id (uuid, PK)
- razao_social (text)
- nome_fantasia (text)
- cnpj (text, unique)
- telefone (text)
- email (text)
- data_inicio_vigencia (date)
- data_fim_vigencia (date)
- status (text: 'ativa' | 'inativa' | 'bloqueada')
- created_at (timestamptz)
- updated_at (timestamptz)
```

### Campo `empresa_id` Adicionado às Tabelas

Todas as tabelas operacionais agora possuem `empresa_id`:

- `profiles` - usuários vinculados a empresas
- `clients` - clientes por empresa
- `works` - obras por empresa
- `budgets` - orçamentos por empresa
- `suppliers` - fornecedores por empresa
- `contracts` - contratos por empresa
- `purchase_requests` - solicitações de compra por empresa
- `quotations` - cotações por empresa
- `purchase_orders` - pedidos de compra por empresa
- `schedules` - cronogramas por empresa
- `tasks` - tarefas por empresa
- `work_diaries` - diários de obra por empresa
- `prospections` - prospecções por empresa
- `financial_accounts` - contas financeiras por empresa
- `financial_movements` - movimentações financeiras por empresa
- `bank_accounts` - contas bancárias por empresa
- `invoices` - notas fiscais por empresa

## Perfis de Usuário

### Master (role: 'master')

- **Acesso global**: pode visualizar e gerenciar TODAS as empresas
- **Não vinculado a empresa**: `empresa_id` é NULL
- **Painel exclusivo**: acessa "Painel de Usuários" com:
  - Empresas
  - Usuários
  - Perfis
- **Pode criar**:
  - Novas empresas
  - Administradores de empresas
  - Qualquer tipo de usuário

### Administrador (role: 'admin')

- **Vinculado a uma empresa**: possui `empresa_id`
- **Acesso restrito**: vê apenas dados da própria empresa
- **Pode gerenciar**:
  - Usuários da sua empresa
  - Todos os módulos operacionais (obras, orçamentos, etc.)

### Usuário Comum (role: 'user')

- **Vinculado a uma empresa**: possui `empresa_id`
- **Acesso restrito**: vê apenas dados da própria empresa
- **Permissões limitadas**: conforme configuração de perfil

## Isolamento de Dados (RLS - Row Level Security)

### Funções Helper Criadas

```sql
is_master_user() - verifica se usuário é master
get_user_empresa_id() - retorna empresa_id do usuário logado
is_empresa_active(uuid) - verifica se empresa está ativa e dentro da vigência
```

### Políticas RLS

**Para usuários Master:**
- Acesso total a TODAS as tabelas
- Pode SELECT, INSERT, UPDATE, DELETE sem restrições

**Para usuários Admin/User:**
- Acesso APENAS aos registros onde `empresa_id = get_user_empresa_id()`
- Verificação automática de vigência da empresa
- Não conseguem visualizar dados de outras empresas

### Exemplo de Política

```sql
CREATE POLICY "Users can view clients from same empresa"
  ON clients FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id() AND is_empresa_active(empresa_id))
  );
```

## Frontend

### Contexto de Autenticação

O `AuthContext` foi atualizado para incluir:

```typescript
interface Profile {
  id: string;
  email: string;
  nome_completo: string;
  role: 'master' | 'admin' | 'user';
  empresa_id?: string | null;  // ← NOVO
  // outros campos...
}
```

### Utilitário de Contexto da Empresa

Criado em `src/utils/empresaContext.ts`:

```typescript
// Pega contexto do usuário logado
getEmpresaContext(): Promise<EmpresaContext>

// Aplica filtro automático de empresa_id em queries
applyEmpresaFilter(query, tableName): Promise<Query>

// Adiciona empresa_id automaticamente em inserts
addEmpresaIdToInsert(data): Promise<Data>

// Limpa cache (usado no logout)
clearEmpresaContext(): void
```

### Painel Master

Componente: `src/components/master/MasterPanel.tsx`

**Abas disponíveis:**
1. **Empresas** - gerenciar empresas (CRUD completo)
2. **Usuários** - gerenciar usuários (em desenvolvimento)
3. **Perfis** - gerenciar perfis e permissões (em desenvolvimento)

### Menu Principal

O menu do Dashboard detecta automaticamente o perfil:

```typescript
const isMasterUser = profile?.role === 'master';
```

- Se `master`: exibe item "Painel de Usuários"
- Se `admin` ou `user`: NÃO exibe

## Fluxo de Cadastro

### 1. Master Cria Empresa

```
Master → Painel de Usuários → Empresas → Nova Empresa
```

Dados obrigatórios:
- Razão Social
- Nome Fantasia
- CNPJ
- Data Início Vigência
- Data Fim Vigência

### 2. Master Cria Administrador da Empresa

```
Master → Painel de Usuários → Usuários → Novo Usuário
```

Dados obrigatórios:
- Nome Completo
- Email
- Senha
- **Empresa** (selecionar)
- Role: Admin

### 3. Administrador Acessa o Sistema

- Login com credenciais fornecidas
- Sistema carrega automaticamente `empresa_id` do perfil
- Usuário vê APENAS dados da sua empresa

## Controle de Vigência

### Verificação Automática

Toda operação verifica:

```sql
data_fim_vigencia >= CURRENT_DATE AND status = 'ativa'
```

### Status da Empresa

- **ativa**: empresa pode operar normalmente
- **inativa**: empresa existe mas está desativada
- **bloqueada**: vigência expirou ou bloqueio manual

### Bloqueio por Vigência

Quando `data_fim_vigencia < CURRENT_DATE`:
- Sistema impede acesso automático
- Usuários da empresa não conseguem logar
- Master pode renovar vigência

## Segurança

### Isolamento Garantido

✅ **Banco de dados**: RLS impede acesso cruzado
✅ **Frontend**: contexto de empresa aplicado automaticamente
✅ **Queries**: filtros por `empresa_id` em todas as consultas
✅ **Inserts**: `empresa_id` adicionado automaticamente
✅ **Updates**: restritos à empresa do usuário
✅ **Deletes**: restritos à empresa do usuário

### Sem empresa_id

❌ Usuário comum **não pode** existir sem `empresa_id`
✅ Master **pode** existir sem `empresa_id` (acesso global)

## Migrations Aplicadas

1. **20260313000001** - Criar estrutura multiempresa
2. **20260313000002** - Adicionar empresa_id às tabelas
3. **20260313000003** - Criar políticas RLS multi-tenant

## Próximos Passos

### Em Desenvolvimento

- [ ] Gerenciamento de Usuários (aba Usuários do Painel Master)
- [ ] Sistema de Perfis e Permissões (aba Perfis do Painel Master)
- [ ] Dashboard específico para Master
- [ ] Relatórios consolidados multi-empresa

### Melhorias Futuras

- [ ] Logs de auditoria por empresa
- [ ] Exportação de dados por empresa
- [ ] Templates personalizados por empresa
- [ ] Notificações de vencimento de vigência
- [ ] Renovação automática de vigência
- [ ] Portal de pagamento integrado

## Como Usar

### Para Master

1. Login com usuário master
2. Acesse "Painel de Usuários"
3. Crie empresas em "Empresas"
4. Crie administradores em "Usuários"

### Para Administrador

1. Login com credenciais fornecidas
2. Sistema carrega automaticamente sua empresa
3. Gerencie dados da sua empresa nos módulos

### Para Desenvolvedor

**Ao criar novas queries:**

```typescript
import { applyEmpresaFilter, addEmpresaIdToInsert } from '@/utils/empresaContext';

// SELECT com filtro automático
let query = supabase.from('minha_tabela').select('*');
query = await applyEmpresaFilter(query, 'minha_tabela');
const { data } = await query;

// INSERT com empresa_id automático
const dataToInsert = await addEmpresaIdToInsert({
  nome: 'Teste',
  // outros campos...
});
const { error } = await supabase.from('minha_tabela').insert(dataToInsert);
```

## Checklist de Implementação

✅ Tabela `empresas` criada
✅ Campo `empresa_id` adicionado a todas as tabelas operacionais
✅ Índices criados para performance
✅ RLS habilitado em todas as tabelas
✅ Políticas RLS criadas para isolamento
✅ Funções helper criadas
✅ Interface `Profile` atualizada com `empresa_id` e role `master`
✅ Painel Master criado no frontend
✅ Componente EmpresasManager implementado
✅ Utilitário empresaContext criado
✅ AuthContext integrado com empresaContext
✅ Menu adaptado para mostrar/ocultar Painel Master
✅ Build testado e funcionando

## Notas Importantes

⚠️ **NUNCA faça queries diretas sem filtro de empresa**
⚠️ **SEMPRE use `applyEmpresaFilter` em consultas**
⚠️ **SEMPRE use `addEmpresaIdToInsert` em inserções**
⚠️ **Teste com usuário master E usuário comum**
⚠️ **Verifique vigência antes de operações críticas**

---

**Status**: ✅ Estrutura básica implementada e funcional
**Versão**: 1.0
**Última atualização**: 2026-03-13
