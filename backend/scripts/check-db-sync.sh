#!/bin/sh
echo "🔍 Verificando sincronização do banco de dados..."

echo ""
echo "1. Verificando colunas faltantes..."
docker exec s3e-postgres psql -U s3e_prod -d s3e_producao -c "
SELECT 
    table_name,
    column_name,
    'FALTANDO' as status
FROM information_schema.columns
WHERE table_name IN ('contas_pagar', 'orcamento_items', 'registros_atividade')
AND column_name IN ('dataAgendamento', 'ncm', 'usuarioId')
ORDER BY table_name, column_name;
"

echo ""
echo "2. Verificando constraints faltantes..."
docker exec s3e-postgres psql -U s3e_prod -d s3e_producao -c "
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conrelid::regclass::text IN ('kits_ferramenta', 'registros_atividade')
AND conname LIKE '%eletricista%' OR conname LIKE '%usuario%'
ORDER BY conname;
"

echo ""
echo "3. Verificando status das migrações..."
docker exec s3e-backend-dev npx prisma migrate status

echo ""
echo "4. Testando Prisma Client..."
docker exec s3e-backend-dev node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Prisma Client conectado com sucesso');
    return prisma.\$disconnect();
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar Prisma Client:', err.message);
    process.exit(1);
  });
"

echo ""
echo "✅ Verificação concluída!"
