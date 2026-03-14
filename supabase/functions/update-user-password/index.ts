import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePasswordRequest {
  user_id: string;
  new_password: string;
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Perfil não encontrado');
    }

    if (!['master', 'administrador', 'financeiro'].includes(profile.role)) {
      throw new Error('Sem permissão para atualizar senhas');
    }

    const requestData: UpdatePasswordRequest = await req.json();

    if (!requestData.user_id || !requestData.new_password) {
      throw new Error('ID do usuário e nova senha são obrigatórios');
    }

    if (requestData.new_password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      requestData.user_id,
      { password: requestData.new_password }
    );

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha atualizada com sucesso',
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
    console.error('Error updating password:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao atualizar senha',
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
