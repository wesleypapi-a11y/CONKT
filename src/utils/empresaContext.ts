import { supabase } from '../lib/supabase';

export interface EmpresaContext {
  empresaId: string | null;
  isMaster: boolean;
}

let cachedContext: EmpresaContext | null = null;

export async function getEmpresaContext(): Promise<EmpresaContext> {
  if (cachedContext) {
    return cachedContext;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { empresaId: null, isMaster: false };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id, role')
      .eq('id', user.id)
      .maybeSingle();

    const context: EmpresaContext = {
      empresaId: profile?.empresa_id || null,
      isMaster: profile?.role === 'master',
    };

    cachedContext = context;
    return context;
  } catch (error) {
    console.error('Erro ao carregar contexto da empresa:', error);
    return { empresaId: null, isMaster: false };
  }
}

export function clearEmpresaContext() {
  cachedContext = null;
}

export async function applyEmpresaFilter<T>(
  query: any
): Promise<typeof query> {
  const context = await getEmpresaContext();

  if (context.isMaster) {
    return query;
  }

  if (!context.empresaId) {
    throw new Error('Usuário sem empresa vinculada');
  }

  return query.eq('empresa_id', context.empresaId);
}

export async function addEmpresaIdToInsert<T extends Record<string, any>>(
  data: T
): Promise<T & { empresa_id?: string }> {
  const context = await getEmpresaContext();

  if (context.isMaster && !data.empresa_id) {
    return data;
  }

  if (!context.isMaster && context.empresaId) {
    return {
      ...data,
      empresa_id: context.empresaId,
    };
  }

  return data;
}
