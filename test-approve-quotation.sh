#!/bin/bash

echo "======================================"
echo "TESTE: Aprovar Cotação"
echo "======================================"
echo ""

# Ler variáveis do .env
source .env

echo "1. Testando autenticação e obtendo token..."
echo ""

# Login com credenciais - use o email que você usa no sistema
echo "⚠️  NOTA: Se o teste falhar por credenciais inválidas,"
echo "    faça login na aplicação primeiro para garantir que a sessão existe"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${VITE_SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wesley.papi@gmail.com",
    "password": "SuaSenhaAqui"
  }')

# Extrair token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ ERRO: Não foi possível obter token de acesso"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtido com sucesso"
echo "Token (primeiros 50 chars): ${ACCESS_TOKEN:0:50}..."
echo ""

echo "2. Buscando cotações disponíveis para teste..."
echo ""

# Buscar cotações não aprovadas
QUOTATIONS=$(curl -s -X GET "${VITE_SUPABASE_URL}/rest/v1/quotations?approved=eq.false&select=id,request_id,supplier_id,total_value&order=created_at.desc&limit=1" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Cotações encontradas: $QUOTATIONS"
echo ""

# Extrair ID da primeira cotação
QUOTATION_ID=$(echo "$QUOTATIONS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$QUOTATION_ID" ]; then
  echo "⚠️  Nenhuma cotação não aprovada encontrada para teste"
  echo "Você precisa criar uma cotação primeiro na interface"
  exit 0
fi

echo "📋 Cotação selecionada para teste: $QUOTATION_ID"
echo ""

echo "3. Chamando Edge Function para aprovar cotação..."
echo ""

# Chamar edge function
RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "${VITE_SUPABASE_URL}/functions/v1/approve-quotation-and-create-order" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"quotation_id\": \"${QUOTATION_ID}\"
  }")

# Separar body e status
BODY=$(echo "$RESULT" | sed -n '1,/HTTP_STATUS:/p' | sed '$d')
HTTP_STATUS=$(echo "$RESULT" | grep "HTTP_STATUS:" | cut -d: -f2)

echo "Status HTTP: $HTTP_STATUS"
echo ""
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCESSO! Cotação aprovada e Pedido de Compra criado"
  
  # Extrair número do pedido
  ORDER_NUMBER=$(echo "$BODY" | grep -o '"order_number":"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$ORDER_NUMBER" ]; then
    echo "📦 Número do Pedido: $ORDER_NUMBER"
  fi
else
  echo "❌ ERRO na aprovação"
  
  # Mostrar detalhes do erro
  ERROR_MSG=$(echo "$BODY" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$ERROR_MSG" ]; then
    echo "Mensagem de erro: $ERROR_MSG"
  fi
fi

echo ""
echo "======================================"
echo "TESTE CONCLUÍDO"
echo "======================================"
