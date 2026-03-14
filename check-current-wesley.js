import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWesley() {
  console.log('Buscando Wesley...\n');

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email, nome_completo, role, empresa_id')
    .order('email');

  console.log('=== TODOS OS USUÁRIOS ===');
  allUsers?.forEach(u => {
    console.log(`${u.email.padEnd(50)} | role: ${(u.role || 'NULL').padEnd(15)} | empresa_id: ${u.empresa_id || 'NULL'}`);
  });

  const wesley = allUsers?.find(u => u.email.includes('wellllllllllllllllllllllllllllllllsley'));
  if (wesley) {
    console.log('\n=== WESLEY ENCONTRADO ===');
    console.log(JSON.stringify(wesley, null, 2));

    if (wesley.empresa_id) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id, razao_social')
        .eq('id', wesley.empresa_id)
        .maybeSingle();

      console.log('\nEmpresa do Wesley:', JSON.stringify(empresaData, null, 2));

      const { data: sameCompanyUsers } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('empresa_id', wesley.empresa_id);

      console.log('\n=== USUÁRIOS DA MESMA EMPRESA ===');
      sameCompanyUsers?.forEach(u => console.log(`- ${u.email} (${u.role})`));
    }
  }
}

checkWesley();
