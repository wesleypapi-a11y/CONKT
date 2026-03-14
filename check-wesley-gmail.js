import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWesley() {
  console.log('Verificando perfil wesley.papi@gmail.com...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'wesley.papi@gmail.com')
    .maybeSingle();

  if (error) {
    console.error('Erro:', error);
    return;
  }

  if (!data) {
    console.log('Perfil não encontrado! Tentando wesleypapi@gmail.com...\n');

    const { data: data2, error: error2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'wesleypapi@gmail.com')
      .maybeSingle();

    if (error2) {
      console.error('Erro:', error2);
      return;
    }

    if (!data2) {
      console.log('Perfil não encontrado com nenhum email!');
      console.log('\nListando todos os perfis:');

      const { data: all } = await supabase
        .from('profiles')
        .select('email, role, empresa_id');

      console.log(all);
      return;
    }

    console.log('Perfil encontrado (wesleypapi):');
    console.log(JSON.stringify(data2, null, 2));
    return;
  }

  console.log('Perfil encontrado:');
  console.log(JSON.stringify(data, null, 2));
}

checkWesley();
