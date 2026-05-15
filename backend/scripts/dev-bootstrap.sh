#!/bin/sh
set -e

echo "🚀 DEV bootstrap (backend)"

echo "🔄 Prisma Client..."
npx prisma generate

echo "🔧 Resolvendo migrations que travam DEV (quando DB é novo/clone)..."
# Essas migrations existem no histórico e podem falhar dependendo do estado do banco.
# Em DEV, o objetivo é destravar o ambiente local.
npx prisma migrate resolve --applied 20241202_add_unit_conversion_fields >/dev/null 2>&1 || true
npx prisma migrate resolve --applied 20241204_add_ferramentas_kits >/dev/null 2>&1 || true
npx prisma migrate resolve --applied 20250115000000_add_audit_logs_hash_fields >/dev/null 2>&1 || true
npx prisma migrate resolve --applied 20250313120000_recurso_humano_estoque_compra_id_opcional >/dev/null 2>&1 || true

echo "📦 Aplicando migrations..."
npx prisma migrate deploy

echo "✅ Verificando status..."
npx prisma migrate status || true

echo "✅ DEV bootstrap concluído."

