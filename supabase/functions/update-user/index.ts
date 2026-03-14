import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdateUserRequest {
  user_id: string;
  nome?: string;
  telefone?: string;
  funcao?: string;
  role?: 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente';
  is_active?: boolean;
  empresa_id?: string;
  avatar_url?: string;
  new_password?: string;
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

    const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, empresa_id')
      .eq('id', currentUser.id)
      .single();

    if (currentProfileError || !currentProfile) {
      throw new Error('Perfil não encontrado');
    }

    if (!['master', 'administrador'].includes(currentProfile.role)) {
      throw new Error('Sem permissão para editar usuários');
    }

    const requestData: UpdateUserRequest = await req.json();

    if (!requestData.user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('empresa_id, role')
      .eq('id', requestData.user_id)
      .single();

    if (targetProfileError || !targetProfile) {
      throw new Error('Usuário não encontrado');
    }

    if (currentProfile.role === 'administrador') {
      if (targetProfile.empresa_id !== currentProfile.empresa_id) {
        throw new Error('Você só pode editar usuários da sua empresa');
      }
    }

    if (requestData.role === 'master' && targetProfile.role !== 'master') {
      const { data: existingMaster } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'master')
        .neq('id', requestData.user_id)
        .maybeSingle();

      if (existingMaster) {
        throw new Error('Já existe um usuário Master no sistema');
      }
    }

    const profileUpdates: any = {};
    if (requestData.nome !== undefined) profileUpdates.nome_completo = requestData.nome;
    if (requestData.telefone !== undefined) profileUpdates.telefone = requestData.telefone || null;
    if (requestData.funcao !== undefined) profileUpdates.funcao = requestData.funcao || null;
    if (requestData.role !== undefined) profileUpdates.role = requestData.role;
    if (requestData.is_active !== undefined) profileUpdates.is_active = requestData.is_active;
    if (requestData.avatar_url !== undefined) profileUpdates.avatar_url = requestData.avatar_url || null;
    if (requestData.empresa_id !== undefined) {
      profileUpdates.empresa_id = requestData.role === 'master' ? null : requestData.empresa_id;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', requestData.user_id);

      if (profileUpdateError) throw profileUpdateError;
    }

    if (requestData.new_password) {
      if (requestData.new_password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        requestData.user_id,
        { password: requestData.new_password }
      );

      if (passwordError) throw passwordError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário atualizado com sucesso',
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
    console.error('Error updating user:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao atualizar usuário',
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
