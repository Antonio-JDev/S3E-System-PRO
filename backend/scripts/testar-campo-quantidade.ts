import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testar() {
  try {
    // Tentar criar uma ferramenta de teste com quantidade
    const ferramenta = await prisma.ferramenta.create({
      data: {
        nome: 'Ferramenta Teste',
        codigo: 'TEST-001',
        categoria: 'Teste',
        quantidade: 10,
        valorCompra: 50.00
      }
    });
    
    console.log('✅ Ferramenta criada com sucesso!');
    console.log(`   Nome: ${ferramenta.nome}`);
    console.log(`   Quantidade: ${ferramenta.quantidade}`);
    console.log(`   Valor: R$ ${ferramenta.valorCompra}`);
    
    // Deletar a ferramenta de teste
    await prisma.ferramenta.delete({
      where: { id: ferramenta.id }
    });
    
    console.log('\n✅ Campo quantidade está funcionando perfeitamente!');
    console.log('   A ferramenta de teste foi removida.');
    
  } catch (error: any) {
    if (error.message?.includes('quantidade')) {
      console.error('❌ Erro: Campo quantidade não existe ou não está funcionando');
    } else {
      console.error('❌ Erro:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testar();

