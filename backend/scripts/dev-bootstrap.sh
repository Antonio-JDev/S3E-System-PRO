#!/bin/sh
set -e

echo "DEV bootstrap (backend)"

# Imagens publicadas (ex.: odev10antonio/s3e-backend:2.1.7) ja trazem o Prisma Client
# gerado no build e rodam como usuario nodejs com node_modules read-only.
if [ -w node_modules/prisma ] 2>/dev/null; then
  echo "Prisma Client (dev local com node_modules gravavel)..."
  npx prisma generate
else
  echo "Prisma Client: pulando generate (imagem publicada / node_modules read-only)"
fi

resolve_known_failed() {
  echo "Resolvendo migrations conhecidas que travam DEV..."
  npx prisma migrate resolve --applied 20241202_add_unit_conversion_fields >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied 20241204_add_ferramentas_kits >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied 20250115000000_add_audit_logs_hash_fields >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied 20250313120000_recurso_humano_estoque_compra_id_opcional >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied 20250313123000_add_quantidade_historico_recurso >/dev/null 2>&1 || true
  npx prisma migrate resolve --applied 20260213_add_audit_logs >/dev/null 2>&1 || true
}

# Extrai o nome da migration do erro P3009/P3018: The `nome_da_migration` migration ...
extract_failed_migration() {
  grep -oE 'The `[^`]+` migration' "$1" 2>/dev/null | head -1 | sed 's/The `//;s/` migration//'
}

resolve_known_failed

echo "Aplicando migrations (com auto-resolve de failed)..."
attempt=0
max_attempts=30
while [ "$attempt" -lt "$max_attempts" ]; do
  if npx prisma migrate deploy 2>/tmp/prisma-migrate.err; then
    echo "Migrations aplicadas com sucesso."
    break
  fi

  failed=$(extract_failed_migration /tmp/prisma-migrate.err)
  if [ -z "$failed" ]; then
    echo "Erro no migrate deploy sem migration identificavel:"
    cat /tmp/prisma-migrate.err
    exit 1
  fi

  echo "  -> resolve --applied $failed (tentativa $((attempt + 1)))"
  npx prisma migrate resolve --applied "$failed" >/dev/null 2>&1 || true
  attempt=$((attempt + 1))
done

if [ "$attempt" -ge "$max_attempts" ]; then
  echo "Limite de tentativas de resolve atingido."
  npx prisma migrate status || true
  exit 1
fi

echo "Verificando status..."
npx prisma migrate status || true

echo "DEV bootstrap concluido."
