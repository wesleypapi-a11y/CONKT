# Instruções de Deploy - Controle de Acesso Master/Admin

## Arquivos Modificados

### Frontend
1. **src/components/UserManagement.tsx**
   - Agora usa `profile` do AuthContext
   - `loadUsers()` filtra por empresa_id quando é administrador
   - Formulário limita roles para administrador
   - Campo empresa_id auto-preenchido e desabilitado para admin

2. **src/components/Dashboard.tsx**
   - Logs adicionados para debug do avatar e menu

### Backend
3. **supabase/functions/create-user/index.ts**
   - Validações atualizadas:
     - Admin só cria: cliente, colaborador, financeiro
     - Admin só cria na própria empresa
     - Master deve vincular empresa_id ao criar admin

### Database
4. **supabase/migrations/20260314010001_fix_profiles_rls_master_admin.sql**
   - Policies RLS atualizadas
   - Master vê todos os usuários
   - Admin vê apenas da própria empresa

## Deploy Necessário

### 1. Deploy Edge Function create-user
```bash
supabase functions deploy create-user
```

Ou via Dashboard: Functions > create-user > Deploy

### 2. Aplicar Migration RLS
Acesse SQL Editor no Supabase:
https://supabase.com/dashboard/project/zifkaowbkcyqdqffyths/sql

Execute o conteúdo de:
`supabase/migrations/20260314010001_fix_profiles_rls_master_admin.sql`

### 3. (Opcional) Deploy função apply-migration-rls
Esta é uma função auxiliar que pode aplicar a migration:
```bash
supabase functions deploy apply-migration-rls
```

Depois chame ela via:
```bash
curl -X POST \
  https://zifkaowbkcyqdqffyths.supabase.co/functions/v1/apply-migration-rls \
  -H "Authorization: Bearer SEU_TOKEN_MASTER"
```

## Resumo das Regras Implementadas

### Master
- Vê TODOS os usuários de todas as empresas
- Pode criar apenas administrador (obrigatoriamente com empresa_id)
- Tem visão global do sistema

### Administrador
- Vê apenas usuários da PRÓPRIA empresa
- Pode criar: cliente, colaborador, financeiro
- NÃO pode criar: administrador, master
- empresa_id fixado automaticamente

### Frontend
- Campo role limitado baseado no perfil logado
- Campo empresa_id desabilitado para admin
- Listagem filtrada por empresa_id

### Backend
- Validações reforçadas na edge function
- Admin não consegue burlar via API

### Database
- Policies RLS garantem segurança em nível de banco
- Master: acesso total
- Admin: apenas empresa_id = perfil.empresa_id
