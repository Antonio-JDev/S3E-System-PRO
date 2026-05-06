#!/bin/sh
# Script para aplicar migrações do Prisma com resolução automática de migrações falhadas

set -e

echo "🔄 Gerando Prisma Client..."
npx prisma generate

echo "🔍 Verificando migrações falhadas..."

# Função para resolver todas as migrações falhadas
resolve_failed_migrations() {
    # Lista todas as migrações falhadas e as resolve
    FAILED_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep -i "failed" | grep -oE "[0-9]{14}_[a-z_]+" || true)
    
    if [ -n "$FAILED_MIGRATIONS" ]; then
        echo "⚠️  Migrações falhadas detectadas, resolvendo..."
        for migration in $FAILED_MIGRATIONS; do
            echo "   Resolvendo migração: $migration"
            npx prisma migrate resolve --rolled-back "$migration" 2>/dev/null || \
            npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
        done
    else
        # Tenta resolver migrações falhadas de forma genérica
        echo "   Tentando resolver migrações falhadas genéricas..."
        npx prisma migrate resolve --rolled-back 2>/dev/null || true
    fi
}

# Resolver migrações falhadas conhecidas (compatibilidade)
echo "🔧 Resolvendo migrações falhadas conhecidas..."
npx prisma migrate resolve --applied 20241202_add_unit_conversion_fields 2>/dev/null || true
npx prisma migrate resolve --applied 20250115000000_add_audit_logs_hash_fields 2>/dev/null || true
npx prisma migrate resolve --applied 20251210182632_add_ncm_orcamento_and_agendamento_pagamento 2>/dev/null || true
npx prisma migrate resolve --applied 20260122000000_add_despesa_fixa_cascade_delete 2>/dev/null || true

# Resolver todas as migrações falhadas
resolve_failed_migrations

# Tentar aplicar migrações
echo "📦 Aplicando migrações pendentes..."
if ! npx prisma migrate deploy; then
    echo "⚠️  Falha ao aplicar migrações, tentando resolver novamente..."
    resolve_failed_migrations
    
    # Tentar novamente
    echo "🔄 Tentando aplicar migrações novamente..."
    npx prisma migrate deploy || {
        echo "❌ Erro ao aplicar migrações. Verifique os logs acima."
        exit 1
    }
fi

echo "✅ Migrações aplicadas com sucesso!"
