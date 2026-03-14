import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, anonKey);

async function fixProfile() {
  console.log('Fazendo login como Wesley...\n');

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'wesley.papi@gmail.com',
    password: 'Arco@2024'
  });

  if (loginError) {
    console.error('Erro no login:', loginError);
    return;
  }

  console.log('Login realizado com sucesso!');
  console.log('User ID:', loginData.user?.id);

  if (loginData.user?.id) {
    console.log('\nCriando/atualizando perfil master...');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: loginData.user.id,
        email: 'wesley.papi@gmail.com',
        nome_completo: 'Wesley Papi',
        role: 'master',
        is_active: true,
        empresa_id: null,
        funcao: 'Master',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select();

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
    } else {
      console.log('✓ Perfil master criado com sucesso!');
      console.log(profile);
    }
  }
}

fixProfile();
