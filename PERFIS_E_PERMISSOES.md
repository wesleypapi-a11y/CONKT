# Sistema de Perfis e Permissões

## Perfis de Usuário

O sistema possui 5 perfis distintos:

1. **Master** - Acesso global ao sistema
2. **Administrador** - Gerente da empresa
3. **Financeiro** - Responsável financeiro
4. **Colaborador** - Usuário operacional
5. **Cliente** - Acesso ao portal do cliente

## Matriz de Controle de Acesso

| Aba / Módulo       | Master | Administrador | Financeiro | Colaborador | Cliente |
|-------------------|--------|---------------|------------|-------------|---------|
| Início            | ✅     | ✅            | ✅         | ✅          | ❌      |
| Clientes          | ✅     | ✅            | ✅         | ✅          | ❌      |
| Obras             | ✅     | ✅            | ✅         | ✅          | ❌      |
| Orçamento         | ✅     | ✅            | ✅         | ✅          | ❌      |
| Fornecedores      | ✅     | ✅            | ✅         | ✅          | ❌      |
| Contratos         | ✅     | ✅            | ✅         | ✅          | ❌      |
| Compras           | ✅     | ✅            | ✅         | ✅          | ❌      |
| Financeiro        | ✅     | ✅            | ✅         | ✅          | ❌      |
| Minha Empresa     | ✅     | ✅            | ✅         | ❌          | ❌      |
| Apropriação       | ✅     | ✅            | ✅         | ✅          | ❌      |
| Tarefas           | ✅     | ✅            | ✅         | ✅          | ❌      |
| Diário de Obra    | ✅     | ✅            | ✅         | ✅          | ❌      |
| Cronograma        | ✅     | ✅            | ✅         | ✅          | ❌      |
| Dashboard         | ✅     | ✅            | ✅         | ✅          | ❌      |
| Relatórios        | ✅     | ✅            | ✅         | ✅          | ❌      |
| Portal do Cliente | ✅     | ✅            | ✅         | ✅          | ✅      |
| Configuração      | ✅     | ✅            | ❌         | ❌          | ❌      |
| Painel de Usuários| ✅     | ❌            | ❌         | ❌          | ❌      |

## Descrição dos Perfis

### 1. Master

**Características:**
- Único perfil sem vínculo a empresa (`empresa_id` é NULL)
- Acesso a todas as empresas do sistema
- Pode visualizar e gerenciar TODOS os dados

**Permissões Exclusivas:**
- Criar e gerenciar empresas
- Acessar "Painel de Usuários"
- Visualizar dados de qualquer empresa
- Criar administradores para empresas
- Gerenciar vigências e status de empresas

**Uso:**
- Gerente do sistema/plataforma
- Suporte técnico
- Administrador global

### 2. Administrador

**Características:**
- Vinculado a uma empresa específica
- Acesso total aos dados da sua empresa
- Pode gerenciar usuários da empresa

**Permissões:**
- Acesso a todos os módulos operacionais
- Criar e gerenciar usuários da empresa
- Configurar preferências da empresa
- Visualizar área "Minha Empresa"
- NÃO pode criar empresas
- NÃO pode acessar "Painel de Usuários"

**Uso:**
- Gerente da empresa
- Diretor
- Administrador da conta

### 3. Financeiro

**Características:**
- Vinculado a uma empresa específica
- Foco em gestão financeira e contratos
- Acesso à área "Minha Empresa"

**Permissões:**
- Todos os módulos operacionais
- Módulo Financeiro completo
- Acesso a contratos e compras
- Visualizar área "Minha Empresa"
- NÃO pode gerenciar usuários
- NÃO pode acessar Configurações

**Uso:**
- Controller
- Gerente financeiro
- Contador da empresa

### 4. Colaborador

**Características:**
- Vinculado a uma empresa específica
- Usuário operacional padrão
- Acesso aos módulos de trabalho diário

**Permissões:**
- Módulos operacionais principais
- Criar e editar obras, orçamentos, compras
- Preencher diário de obra
- Gerenciar tarefas
- NÃO pode acessar "Minha Empresa"
- NÃO pode gerenciar usuários
- NÃO pode acessar Configurações

**Uso:**
- Engenheiro de obras
- Técnico
- Comprador
- Assistente administrativo

### 5. Cliente

**Características:**
- Vinculado a uma empresa (fornecedor/prestador)
- Acesso extremamente limitado
- Visualização apenas

**Permissões:**
- Acesso SOMENTE ao "Portal do Cliente"
- Visualizar seus projetos/obras
- Ver cronogramas
- Ver orçamentos aprovados
- Ver diário de obra
- NÃO pode acessar nenhum outro módulo

**Uso:**
- Cliente final da empresa
- Investidor
- Proprietário do imóvel

## Implementação Técnica

### Arquivo de Controle de Acesso

`src/utils/accessControl.ts`

**Funções Principais:**

```typescript
// Verificar se usuário tem acesso a uma página
hasAccess(role: UserRole, page: PageKey): boolean

// Verificar múltiplas páginas
canAccessMultiplePages(role: UserRole, pages: PageKey[]): boolean

// Obter todas as páginas acessíveis
getAccessiblePages(role: UserRole): PageKey[]

// Verificações específicas
isMaster(role: UserRole): boolean
isAdministrador(role: UserRole): boolean
canManageUsers(role: UserRole): boolean
canManageCompany(role: UserRole): boolean
canAccessFinancial(role: UserRole): boolean

// Helpers visuais
getRoleName(role: UserRole): string
getRoleColor(role: UserRole): string
```

### Componente de Proteção de Rotas

`src/components/common/ProtectedRoute.tsx`

**Uso:**

```typescript
<ProtectedRoute requiredPage="financeiro">
  <FinanceManager />
</ProtectedRoute>
```

Se o usuário não tiver acesso, é exibida uma tela de "Acesso Negado".

### Dashboard Dinâmico

O Dashboard filtra automaticamente os itens do menu:

```typescript
const menuItems = allMenuItems.filter(item =>
  hasAccess(profile?.role, item.id)
);
```

Cada perfil vê apenas as abas que tem permissão.

## Banco de Dados (RLS)

### Funções Helper Criadas

```sql
-- Verifica se é master
is_master_user()

-- Verifica se é admin ou superior
is_admin_or_higher()

-- Verifica acesso financeiro
has_financial_access()

-- Verifica se é cliente
is_cliente()

-- Retorna empresa_id do usuário
get_user_empresa_id()
```

### Exemplos de Políticas RLS

**Política para dados gerais:**
```sql
CREATE POLICY "Users can view their empresa data"
  ON tabela FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (empresa_id = get_user_empresa_id())
  );
```

**Política para área financeira:**
```sql
CREATE POLICY "Financial users can view financial data"
  ON financial_accounts FOR SELECT
  TO authenticated
  USING (
    is_master_user()
    OR (
      empresa_id = get_user_empresa_id()
      AND has_financial_access()
    )
  );
```

## Fluxos de Uso

### Fluxo Master

1. Login como master
2. Acessa "Painel de Usuários"
3. Cria nova empresa
4. Cria administrador para empresa
5. Monitora todas as empresas

### Fluxo Administrador

1. Login como administrador
2. Vê apenas dados da sua empresa
3. Cria usuários (financeiro, colaborador)
4. Gerencia configurações
5. Acessa todos os módulos

### Fluxo Financeiro

1. Login como financeiro
2. Vê dados da sua empresa
3. Foca em módulo Financeiro
4. Acessa contratos e compras
5. Visualiza área "Minha Empresa"

### Fluxo Colaborador

1. Login como colaborador
2. Vê dados da sua empresa
3. Trabalha em obras e orçamentos
4. Preenche diários de obra
5. Gerencia tarefas

### Fluxo Cliente

1. Login como cliente
2. Acessa apenas Portal do Cliente
3. Visualiza suas obras
4. Acompanha cronogramas
5. Vê atualizações do diário

## Indicadores Visuais

### Cores dos Perfis

```typescript
master: 'bg-purple-100 text-purple-800'        // Roxo
administrador: 'bg-blue-100 text-blue-800'     // Azul
financeiro: 'bg-green-100 text-green-800'      // Verde
colaborador: 'bg-yellow-100 text-yellow-800'   // Amarelo
cliente: 'bg-gray-100 text-gray-800'           // Cinza
```

### Badge Master

No menu lateral, usuário master vê badge especial "MASTER" em roxo.

### Nome do Perfil

No menu lateral, abaixo do nome do usuário, aparece o nome do perfil traduzido.

## Segurança

### Camadas de Proteção

1. **Menu**: Oculta abas não permitidas
2. **Componentes**: ProtectedRoute bloqueia acesso direto
3. **Banco de Dados**: RLS impede queries não autorizadas
4. **API**: Validação server-side em Edge Functions

### Princípios

- **Least Privilege**: Usuário tem apenas o acesso mínimo necessário
- **Defense in Depth**: Múltiplas camadas de segurança
- **Fail Secure**: Em caso de erro, negar acesso
- **Audit Trail**: Todas as ações podem ser rastreadas via `created_by`

## Migração de Perfis Antigos

A migration `20260313100002_update_roles_to_new_names.sql` faz:

```sql
UPDATE profiles SET role = 'administrador' WHERE role = 'admin';
UPDATE profiles SET role = 'colaborador' WHERE role = 'user';
```

**Mapeamento:**
- `admin` → `administrador`
- `user` → `colaborador`
- `master` → `master` (sem alteração)

## Como Adicionar Novo Perfil

1. **Adicionar no tipo:**
```typescript
// src/utils/accessControl.ts
export type UserRole = 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente' | 'novo_perfil';
```

2. **Configurar permissões:**
```typescript
const ACCESS_MATRIX: Record<PageKey, UserRole[]> = {
  'pagina': ['master', 'novo_perfil'],
  // ...
};
```

3. **Atualizar interface:**
```typescript
// src/contexts/AuthContext.tsx
role: 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente' | 'novo_perfil';
```

4. **Criar função RLS:**
```sql
CREATE OR REPLACE FUNCTION is_novo_perfil()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'novo_perfil'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

5. **Adicionar cor:**
```typescript
getRoleColor('novo_perfil'): 'bg-pink-100 text-pink-800'
```

## Testes Recomendados

### Checklist de Testes por Perfil

Para cada perfil, verificar:

- [ ] Login funciona
- [ ] Menu exibe apenas abas permitidas
- [ ] Abas não permitidas retornam "Acesso Negado"
- [ ] Queries retornam apenas dados da empresa
- [ ] Inserções incluem empresa_id automaticamente
- [ ] Não consegue ver dados de outras empresas
- [ ] Badge/indicador visual está correto

### Teste de Isolamento

1. Criar duas empresas (A e B)
2. Criar admin para cada empresa
3. Login como admin da empresa A
4. Tentar acessar via console dados da empresa B
5. Verificar que RLS bloqueia

### Teste de Migração de Perfis

1. Antes da migration, ter usuários com `role = 'admin'` e `role = 'user'`
2. Rodar migration
3. Verificar que viraram `administrador` e `colaborador`
4. Verificar que permissões continuam funcionando

## Troubleshooting

### Usuário não vê nenhuma aba

**Causa:** `role` undefined ou inválido
**Solução:** Verificar tabela `profiles`, atualizar `role`

### Usuário vê abas mas recebe "Acesso Negado"

**Causa:** Inconsistência entre frontend e RLS
**Solução:** Verificar políticas RLS da tabela

### Master não vê dados de todas empresas

**Causa:** RLS não reconhece como master
**Solução:** Verificar função `is_master_user()` e role no banco

### Dados de outra empresa aparecem

**Causa:** Query sem filtro ou RLS desabilitado
**Solução:** Usar `applyEmpresaFilter()` e verificar RLS enabled

---

**Status**: ✅ Sistema completo implementado
**Versão**: 1.0
**Última atualização**: 2026-03-13
