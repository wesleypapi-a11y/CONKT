#!/bin/bash

SUPABASE_URL="https://zifkaowbkcyqdqffyths.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZmthb3dia2N5cWRxZmZ5dGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk2MjAsImV4cCI6MjA4NTA5NTYyMH0.-5JnXHwoVQs0Rw2JVoLVtu5KcKcBS-ht-oB1uqRopZ4"

BUDGET_ID="8d53126c-7411-44ea-b68c-a2f705ee78f4"
SUPPLIER_ID="21f2cb38-7eb4-46c8-98bb-b2f741ee6c63"

echo "🧪 Testando aprovação de orçamento..."
echo ""

echo "1️⃣ Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{"email":"adm@arco.com","password":"Eneas@001"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Erro no login"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso"
echo ""

echo "2️⃣ Chamando edge function para aprovar orçamento..."
APPROVE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/approve-budget-and-create-pco" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"budget_id\": \"${BUDGET_ID}\",
    \"supplier_id\": \"${SUPPLIER_ID}\",
    \"payment_conditions\": \"Teste - 30 dias\",
    \"delivery_date\": \"2026-03-15\",
    \"observations\": \"Pedido de teste criado automaticamente\"
  }")

HTTP_STATUS=$(echo "$APPROVE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
RESPONSE_BODY=$(echo "$APPROVE_RESPONSE" | sed '/HTTP_STATUS/d')

echo "Status da resposta: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ Erro ao aprovar orçamento"
  echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
  exit 1
fi

echo "✅ Resposta recebida:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""
echo "✨ Teste concluído!"
