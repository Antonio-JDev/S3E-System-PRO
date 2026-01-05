#!/bin/bash

# Script de teste de configuração SMTP
# Verifica se as variáveis SMTP estão configuradas corretamente

echo "🧪 Testando Configuração SMTP..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o container está rodando
if ! docker-compose ps | grep -q "s3e-backend"; then
  echo -e "${RED}❌ Container do backend não está rodando${NC}"
  echo "Execute: docker-compose up -d"
  exit 1
fi

echo "📋 Verificando variáveis SMTP no container..."
echo ""

# Verificar cada variável
smtp_host=$(docker-compose exec -T backend env | grep SMTP_HOST | cut -d'=' -f2)
smtp_port=$(docker-compose exec -T backend env | grep SMTP_PORT | cut -d'=' -f2)
smtp_secure=$(docker-compose exec -T backend env | grep SMTP_SECURE | cut -d'=' -f2)
smtp_user=$(docker-compose exec -T backend env | grep SMTP_USER | cut -d'=' -f2)
smtp_pass=$(docker-compose exec -T backend env | grep SMTP_PASS | cut -d'=' -f2)
smtp_from=$(docker-compose exec -T backend env | grep SMTP_FROM | cut -d'=' -f2)

# Teste 1: SMTP_HOST
echo "Teste 1: SMTP_HOST"
if [ "$smtp_host" = "smtps.uhserver.com" ]; then
  echo -e "${GREEN}✅ Correto: $smtp_host${NC}"
else
  echo -e "${YELLOW}⚠️  Esperado: smtps.uhserver.com, encontrado: $smtp_host${NC}"
fi
echo ""

# Teste 2: SMTP_PORT
echo "Teste 2: SMTP_PORT"
if [ "$smtp_port" = "465" ]; then
  echo -e "${GREEN}✅ Correto: $smtp_port${NC}"
else
  echo -e "${YELLOW}⚠️  Esperado: 465, encontrado: $smtp_port${NC}"
fi
echo ""

# Teste 3: SMTP_SECURE
echo "Teste 3: SMTP_SECURE"
if [ "$smtp_secure" = "true" ]; then
  echo -e "${GREEN}✅ Correto: $smtp_secure${NC}"
else
  echo -e "${YELLOW}⚠️  Esperado: true, encontrado: $smtp_secure${NC}"
fi
echo ""

# Teste 4: SMTP_USER
echo "Teste 4: SMTP_USER"
if [ "$smtp_user" = "contato@s3eengenharia.com.br" ]; then
  echo -e "${GREEN}✅ Correto: $smtp_user${NC}"
else
  echo -e "${YELLOW}⚠️  Esperado: contato@s3eengenharia.com.br, encontrado: $smtp_user${NC}"
fi
echo ""

# Teste 5: SMTP_PASS
echo "Teste 5: SMTP_PASS"
if [ -z "$smtp_pass" ]; then
  echo -e "${RED}❌ SMTP_PASS não está configurado${NC}"
  echo "   Configure no arquivo .env: SMTP_PASS=sua_senha_aqui"
else
  echo -e "${GREEN}✅ Configurado (senha oculta)${NC}"
fi
echo ""

# Teste 6: SMTP_FROM
echo "Teste 6: SMTP_FROM"
if [ "$smtp_from" = "contato@s3eengenharia.com.br" ]; then
  echo -e "${GREEN}✅ Correto: $smtp_from${NC}"
else
  echo -e "${YELLOW}⚠️  Esperado: contato@s3eengenharia.com.br, encontrado: $smtp_from${NC}"
fi
echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumo da Configuração SMTP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SMTP_HOST: $smtp_host"
echo "SMTP_PORT: $smtp_port"
echo "SMTP_SECURE: $smtp_secure"
echo "SMTP_USER: $smtp_user"
echo "SMTP_PASS: ${smtp_pass:+***configurado***}"
echo "SMTP_FROM: $smtp_from"
echo ""

if [ -z "$smtp_pass" ]; then
  echo -e "${YELLOW}⚠️  ATENÇÃO: Configure SMTP_PASS no arquivo .env${NC}"
fi

echo ""
echo "Para testar envio de email, use a funcionalidade de 'Esqueci minha senha'"
echo "ou verifique os logs: docker-compose logs backend | grep -i email"
echo ""

