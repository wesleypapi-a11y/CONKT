export type UserRole = 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente';

export type PageKey =
  | 'inicio'
  | 'clientes'
  | 'obras'
  | 'orcamento'
  | 'fornecedores'
  | 'contratos'
  | 'compras'
  | 'financeiro'
  | 'minha-empresa'
  | 'apropriacao'
  | 'tarefas'
  | 'diario-obra'
  | 'cronograma'
  | 'dashboard'
  | 'relatorios'
  | 'portal-cliente'
  | 'configuracao'
  | 'usuarios'
  | 'empresas'
  | 'painel-usuarios';

const ACCESS_MATRIX: Record<PageKey, UserRole[]> = {
  'inicio': ['master', 'administrador', 'financeiro', 'colaborador'],
  'clientes': ['master', 'administrador', 'financeiro', 'colaborador'],
  'obras': ['master', 'administrador', 'financeiro', 'colaborador'],
  'orcamento': ['master', 'administrador', 'financeiro', 'colaborador'],
  'fornecedores': ['master', 'administrador', 'financeiro', 'colaborador'],
  'contratos': ['master', 'administrador', 'financeiro', 'colaborador'],
  'compras': ['master', 'administrador', 'financeiro', 'colaborador'],
  'financeiro': ['master', 'administrador', 'financeiro', 'colaborador'],
  'minha-empresa': ['master', 'administrador', 'financeiro'],
  'apropriacao': ['master', 'administrador', 'financeiro', 'colaborador'],
  'tarefas': ['master', 'administrador', 'financeiro', 'colaborador'],
  'diario-obra': ['master', 'administrador', 'financeiro', 'colaborador'],
  'cronograma': ['master', 'administrador', 'financeiro', 'colaborador'],
  'dashboard': ['master', 'administrador', 'financeiro', 'colaborador'],
  'relatorios': ['master', 'administrador', 'financeiro', 'colaborador'],
  'portal-cliente': ['master', 'administrador', 'financeiro', 'colaborador', 'cliente'],
  'configuracao': ['master', 'administrador'],
  'usuarios': ['master', 'administrador'],
  'empresas': ['master'],
  'painel-usuarios': ['master'],
};

export function hasAccess(userRole: UserRole | undefined, pageKey: PageKey): boolean {
  if (!userRole) return false;
  const allowedRoles = ACCESS_MATRIX[pageKey];
  return allowedRoles.includes(userRole);
}

export function canAccessMultiplePages(userRole: UserRole | undefined, pageKeys: PageKey[]): boolean {
  if (!userRole) return false;
  return pageKeys.every(key => hasAccess(userRole, key));
}

export function getAccessiblePages(userRole: UserRole | undefined): PageKey[] {
  if (!userRole) return [];

  return Object.keys(ACCESS_MATRIX).filter(key =>
    hasAccess(userRole, key as PageKey)
  ) as PageKey[];
}

export function isMaster(userRole: UserRole | undefined): boolean {
  return userRole === 'master';
}

export function isAdministrador(userRole: UserRole | undefined): boolean {
  return userRole === 'administrador';
}

export function isFinanceiro(userRole: UserRole | undefined): boolean {
  return userRole === 'financeiro';
}

export function isColaborador(userRole: UserRole | undefined): boolean {
  return userRole === 'colaborador';
}

export function isCliente(userRole: UserRole | undefined): boolean {
  return userRole === 'cliente';
}

export function canManageUsers(userRole: UserRole | undefined): boolean {
  return userRole === 'master' || userRole === 'administrador';
}

export function canManageCompany(userRole: UserRole | undefined): boolean {
  return userRole === 'master' || userRole === 'administrador' || userRole === 'financeiro';
}

export function canAccessFinancial(userRole: UserRole | undefined): boolean {
  return userRole === 'master' || userRole === 'administrador' || userRole === 'financeiro';
}

export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    master: 'Master',
    administrador: 'Administrador',
    financeiro: 'Financeiro',
    colaborador: 'Colaborador',
    cliente: 'Cliente',
  };
  return roleNames[role];
}

export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    master: 'bg-purple-100 text-purple-800',
    administrador: 'bg-blue-100 text-blue-800',
    financeiro: 'bg-green-100 text-green-800',
    colaborador: 'bg-yellow-100 text-yellow-800',
    cliente: 'bg-gray-100 text-gray-800',
  };
  return roleColors[role];
}
