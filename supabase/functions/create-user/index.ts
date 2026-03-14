import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  funcao?: string;
  role: 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente';
  is_active: boolean;
  empresa_id?: string;
  avatar_url?: string;
  created_by: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !currentUser) {
      throw new Error('Não autorizado');
    }

    const requestData: CreateUserRequest = await req.json();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, empresa_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado');
    }

    if (!['master', 'administrador', 'financeiro'].includes(profile.role)) {
      throw new Error('Sem permissão para criar usuários');
    }

    if (profile.role === 'administrador' && requestData.empresa_id !== profile.empresa_id) {
      throw new Error('Você só pode criar usuários da sua empresa');
    }

    if (!requestData.email || !requestData.password || !requestData.nome) {
      throw new Error('Email, senha e nome são obrigatórios');
    }

    if (requestData.role !== 'master' && !requestData.empresa_id) {
      throw new Error('Empresa é obrigatória para usuários não-Master');
    }

    if (requestData.role === 'master') {
      const { data: existingMaster } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'master')
        .maybeSingle();

      if (existingMaster) {
        throw new Error('Já existe um usuário Master no sistema');
      }
    }

    const { data: authUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: requestData.password,
        email_confirm: true,
        user_metadata: {
          nome_completo: requestData.nome,
          telefone: requestData.telefone || '',
          funcao: requestData.funcao || '',
        },
      });

    if (createError) throw createError;
    if (!authUser.user) throw new Error('Falha ao criar usuário');

    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: requestData.email,
        nome_completo: requestData.nome,
        telefone: requestData.telefone || null,
        funcao: requestData.funcao || null,
        role: requestData.role,
        is_active: requestData.is_active,
        created_by: requestData.created_by,
        avatar_url: requestData.avatar_url || null,
        empresa_id: requestData.role === 'master' ? null : requestData.empresa_id,
      });

    if (profileUpsertError) throw profileUpsertError;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao criar usuário',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});