import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function corrigirRegistro() {
  try {
    console.log('🔍 Verificando registros com usuarioId NULL...');
    
    // Deletar o registro problemático (mais seguro que atribuir um usuário aleatório)
    const resultado = await prisma.$executeRaw`
      DELETE FROM registros_atividade 
      WHERE "usuarioId" IS NULL;
    `;
    
    console.log(`✅ ${resultado} registro(s) deletado(s) com sucesso!`);
    console.log('\n💡 Agora você pode executar: npx prisma db push');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir registro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigirRegistro();

