import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteUserRequest {
  user_id: string;
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

    if (!['master', 'administrador'].includes(profile.role)) {
      throw new Error('Sem permissão para deletar usuários');
    }

    const requestData: DeleteUserRequest = await req.json();

    if (!requestData.user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (requestData.user_id === currentUser.id) {
      throw new Error('Você não pode deletar seu próprio usuário');
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      requestData.user_id
    );

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário excluído com sucesso',
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
    console.error('Error deleting user:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao excluir usuário',
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
