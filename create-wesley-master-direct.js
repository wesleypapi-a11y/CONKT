import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, anonKey);

async function createWesleyMaster() {
  console.log('Criando usuário master Wesley...\n');

  const { data, error } = await supabase.auth.signUp({
    email: 'wesley.papi@gmail.com',
    password: 'Arco@2024',
    options: {
      data: {
        nome_completo: 'Wesley Papi',
        role: 'master'
      }
    }
  });

  if (error) {
    console.error('Erro ao criar usuário:', error);
    return;
  }

  console.log('Usuário criado:', data);
  console.log('\nID do usuário:', data.user?.id);

  if (data.user?.id) {
    console.log('\nInserindo perfil master...');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: 'wesley.papi@gmail.com',
        nome_completo: 'Wesley Papi',
        role: 'master',
        is_active: true,
        empresa_id: null,
        funcao: 'Master'
      })
      .select();

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
    } else {
      console.log('Perfil criado com sucesso:', profile);
    }
  }
}

createWesleyMaster();
