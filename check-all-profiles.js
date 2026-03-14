import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllProfiles() {
  console.log('Buscando todos os perfis...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, nome_completo, role, empresa_id, is_active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar perfis:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.error('Nenhum perfil encontrado!');
    return;
  }

  console.log(`Total de perfis: ${data.length}\n`);
  data.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.email}`);
    console.log(`   Nome: ${profile.nome_completo}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Empresa ID: ${profile.empresa_id || '(nulo)'}`);
    console.log(`   Ativo: ${profile.is_active}\n`);
  });
}

checkAllProfiles();
