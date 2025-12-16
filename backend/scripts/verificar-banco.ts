import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarBanco() {
  try {
    // Verificar qual banco está conectado
    const result = await prisma.$queryRaw<Array<{ current_database: string }>>`
      SELECT current_database();
    `;
    
    console.log('📊 Banco de dados conectado:', result[0]?.current_database);
    
    // Verificar registros problemáticos usando query raw
    const registrosProblematicos = await prisma.$queryRaw<Array<{ id: string; "createdAt": Date }>>`
      SELECT id, "createdAt" 
      FROM registros_atividade 
      WHERE "usuarioId" IS NULL;
    `;
    
    console.log(`\n⚠️  Registros com usuarioId NULL: ${registrosProblematicos.length}`);
    
    if (registrosProblematicos.length > 0) {
      console.log('\n📋 IDs dos registros problemáticos:');
      registrosProblematicos.forEach((reg, index) => {
        console.log(`  ${index + 1}. ID: ${reg.id}, Data: ${reg.createdAt}`);
      });
      
      // Verificar se há usuários disponíveis
      const usuarios = await prisma.user.findMany({
        take: 5,
        select: { id: true, name: true, email: true }
      });
      
      console.log('\n👥 Usuários disponíveis para atribuir:');
      usuarios.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
      });
      
      if (usuarios.length > 0) {
        console.log(`\n💡 Para corrigir, execute:`);
        console.log(`   DELETE FROM registros_atividade WHERE "usuarioId" IS NULL;`);
        console.log(`   OU atribua um usuário:`);
        console.log(`   UPDATE registros_atividade SET "usuarioId" = '${usuarios[0].id}' WHERE "usuarioId" IS NULL;`);
      }
    }
    
    // Verificar quantidade de ferramentas
    const totalFerramentas = await prisma.ferramenta.count();
    console.log(`\n🔧 Total de ferramentas no banco: ${totalFerramentas}`);
    
    // Verificar se o campo quantidade existe
    try {
      const ferramentaExemplo = await prisma.ferramenta.findFirst({
        select: {
          id: true,
          nome: true,
          quantidade: true
        }
      });
      
      if (ferramentaExemplo) {
        console.log(`\n✅ Campo 'quantidade' existe! Exemplo: ${ferramentaExemplo.nome} - Qtd: ${ferramentaExemplo.quantidade ?? 'NULL'}`);
      } else {
        console.log('\n⚠️  Nenhuma ferramenta encontrada para verificar o campo quantidade');
      }
    } catch (error: any) {
      if (error.message?.includes('quantidade')) {
        console.log('\n❌ Campo "quantidade" NÃO existe ainda na tabela ferramentas!');
        console.log('   Execute: npx prisma db push');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarBanco();

