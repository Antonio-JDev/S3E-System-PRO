#!/bin/sh
# Script para aplicar migration de valorVendaM e valorVendaCM em produção

echo "🔧 Aplicando migration para adicionar valorVendaM e valorVendaCM..."

# Aplicar SQL diretamente
psql $DATABASE_URL -c "ALTER TABLE materiais ADD COLUMN IF NOT EXISTS \"valorVendaM\" DOUBLE PRECISION;"
psql $DATABASE_URL -c "ALTER TABLE materiais ADD COLUMN IF NOT EXISTS \"valorVendaCM\" DOUBLE PRECISION;"

echo "✅ Migration aplicada com sucesso!"
echo "🔄 Regenerando Prisma Client..."
npx prisma generate

echo "✅ Pronto! As colunas foram adicionadas."
