import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWesleyProfile() {
  console.log('Verificando perfil do Wesley...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'wesley@conkt.com.br')
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return;
  }

  if (!data) {
    console.error('Perfil não encontrado!');
    return;
  }

  console.log('Perfil encontrado:');
  console.log('ID:', data.id);
  console.log('Email:', data.email);
  console.log('Nome:', data.nome_completo);
  console.log('Role:', data.role);
  console.log('Empresa ID:', data.empresa_id);
  console.log('Is Active:', data.is_active);
  console.log('\nDados completos:', JSON.stringify(data, null, 2));
}

checkWesleyProfile();
