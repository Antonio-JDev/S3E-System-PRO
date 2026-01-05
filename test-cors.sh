#!/bin/bash

# Script de teste de CORS
# Testa se o CORS está funcionando corretamente

echo "🧪 Testando CORS..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Teste 1: Requisição local
echo "📋 Teste 1: Requisição local (localhost:5173)"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3001/api/auth/login)

if [ "$response" = "200" ] || [ "$response" = "204" ]; then
  echo -e "${GREEN}✅ Sucesso: Status $response${NC}"
else
  echo -e "${RED}❌ Falhou: Status $response${NC}"
fi
echo ""

# Teste 2: Requisição Tailscale
echo "📋 Teste 2: Requisição Tailscale (100.74.201.62:8080)"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: http://100.74.201.62:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3001/api/auth/login)

if [ "$response" = "200" ] || [ "$response" = "204" ]; then
  echo -e "${GREEN}✅ Sucesso: Status $response${NC}"
else
  echo -e "${RED}❌ Falhou: Status $response${NC}"
fi
echo ""

# Teste 3: Requisição com domínio
echo "📋 Teste 3: Requisição com domínio (app.s3eengenharia.com.br:8080)"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: http://app.s3eengenharia.com.br:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  http://localhost:3001/api/auth/login)

if [ "$response" = "200" ] || [ "$response" = "204" ]; then
  echo -e "${GREEN}✅ Sucesso: Status $response${NC}"
else
  echo -e "${RED}❌ Falhou: Status $response${NC}"
fi
echo ""

# Teste 4: Verificar variáveis de ambiente
echo "📋 Teste 4: Verificando variáveis CORS no container"
cors_origin=$(docker-compose exec -T backend env | grep CORS_ORIGIN | cut -d'=' -f2)
frontend_url=$(docker-compose exec -T backend env | grep FRONTEND_URL | cut -d'=' -f2)

echo "CORS_ORIGIN: $cors_origin"
echo "FRONTEND_URL: $frontend_url"
echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumo dos Testes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver logs detalhados do backend:"
echo "  docker-compose logs backend | grep -i cors"
echo ""

