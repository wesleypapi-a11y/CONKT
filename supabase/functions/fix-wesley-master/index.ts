import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: updated1, error: error1 } = await supabase
      .from('profiles')
      .update({
        role: 'master',
        empresa_id: null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'wesley@conkt.com.br')
      .select();

    const { data: updated2, error: error2 } = await supabase
      .from('profiles')
      .update({
        role: 'master',
        empresa_id: null,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'wesleypapi@gmail.com')
      .select();

    const results = {
      wesley_conkt: updated1?.length || 0,
      wesley_gmail: updated2?.length || 0,
      errors: [error1, error2].filter(e => e !== null)
    };

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
