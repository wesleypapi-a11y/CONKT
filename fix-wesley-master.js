import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUxOTYyMCwiZXhwIjoyMDg1MDk1NjIwfQ.6mz0eX2tN0qlRd8wQJU0Rzy7T7zCXJmL3Lv_-A1GrNY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWesleyMaster() {
  console.log('Atualizando perfil do Wesley para Master...\n');

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

  if (error1) {
    console.log('Erro ao atualizar wesley@conkt.com.br:', error1.message);
  } else if (updated1 && updated1.length > 0) {
    console.log('✓ Atualizado wesley@conkt.com.br para master');
  } else {
    console.log('- wesley@conkt.com.br não encontrado');
  }

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

  if (error2) {
    console.log('Erro ao atualizar wesleypapi@gmail.com:', error2.message);
  } else if (updated2 && updated2.length > 0) {
    console.log('✓ Atualizado wesleypapi@gmail.com para master');
  } else {
    console.log('- wesleypapi@gmail.com não encontrado');
  }

  console.log('\nVerificando masters...');
  const { data: masters, error: error3 } = await supabase
    .from('profiles')
    .select('id, email, nome_completo, role, empresa_id, is_active')
    .eq('role', 'master');

  if (error3) {
    console.error('Erro ao buscar masters:', error3);
  } else {
    console.log(`Total de masters: ${masters?.length || 0}`);
    masters?.forEach(m => {
      console.log(`  - ${m.email} (${m.nome_completo})`);
    });
  }
}

fixWesleyMaster();
