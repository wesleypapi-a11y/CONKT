#!/bin/bash

# Deploy create-user Edge Function to Supabase
# Run this script to deploy the real implementation

echo "📦 Deploying create-user edge function..."
echo ""
echo "⚠️  IMPORTANTE: Esta Edge Function usa SUPABASE_SERVICE_ROLE_KEY"
echo "   para criar usuários no Supabase Auth."
echo ""
echo "Para fazer o deploy, você tem 2 opções:"
echo ""
echo "1. Via Supabase Dashboard:"
echo "   - Acesse: https://supabase.com/dashboard/project/zifkaowbkcyqdqffyths/functions"
echo "   - Clique em 'create-user'"
echo "   - Cole o código do arquivo: supabase/functions/create-user/index.ts"
echo "   - Clique em 'Deploy'"
echo ""
echo "2. Via Supabase CLI (se você tiver instalado):"
echo "   npx supabase functions deploy create-user --project-ref zifkaowbkcyqdqffyths"
echo ""
echo "O código correto está em: supabase/functions/create-user/index.ts"
echo ""
