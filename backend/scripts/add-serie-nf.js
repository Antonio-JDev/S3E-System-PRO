const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Adicionando coluna serieNF na tabela compras...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE compras 
      ADD COLUMN IF NOT EXISTS "serieNF" TEXT;
    `);
    
    console.log('✅ Coluna serieNF adicionada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
