import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zifkaowbkcyqdqffyths.supabase.co';
const functionUrl = `${supabaseUrl}/functions/v1/fix-wesley-master`;
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4';

async function fixWesley() {
  console.log('Chamando edge function para corrigir Wesley...\n');

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  console.log('Resultado:', JSON.stringify(result, null, 2));
}

fixWesley();
