const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🗑️  Removendo coluna classificacao da tabela orcamentos...');
    
    // Remover coluna classificacao
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "orcamentos" DROP COLUMN IF EXISTS "classificacao";
    `);
    
    console.log('✅ Coluna classificacao removida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Migration aplicada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  });
