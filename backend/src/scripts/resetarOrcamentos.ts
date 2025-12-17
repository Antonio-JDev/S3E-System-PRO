/**
 * Script para resetar todos os orçamentos e o número sequencial
 * 
 * ATENÇÃO: Este script irá DELETAR TODOS os orçamentos do banco de dados!
 * 
 * Para executar:
 * npx tsx src/scripts/resetarOrcamentos.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetarOrcamentos() {
  try {
    console.log('🗑️  Iniciando reset de orçamentos...');

    // 1. Contar orçamentos antes de deletar
    const totalOrcamentos = await prisma.orcamento.count();
    console.log(`📊 Total de orçamentos encontrados: ${totalOrcamentos}`);

    if (totalOrcamentos === 0) {
      console.log('ℹ️  Não há orçamentos para deletar.');
      
      // Mesmo assim, resetar a sequência
      await resetarSequencia();
      console.log('✅ Sequência resetada com sucesso!');
      return;
    }

    // 2. Deletar todos os orçamentos (os itens serão deletados automaticamente por cascade)
    console.log('🗑️  Deletando orçamentos...');
    const resultado = await prisma.orcamento.deleteMany({});
    console.log(`✅ ${resultado.count} orçamento(s) deletado(s)`);

    // 3. Resetar a sequência do numeroSequencial
    await resetarSequencia();

    console.log('✅ Reset completo! Todos os orçamentos foram deletados e a sequência foi resetada.');
    console.log('📝 O próximo orçamento criado terá o número 1.');

  } catch (error) {
    console.error('❌ Erro ao resetar orçamentos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function resetarSequencia() {
  try {
    // Resetar a sequência do PostgreSQL para o numeroSequencial
    // O nome da sequência no PostgreSQL é: "orcamentos_numeroSequencial_seq"
    await prisma.$executeRawUnsafe(`
      ALTER SEQUENCE "orcamentos_numeroSequencial_seq" RESTART WITH 1;
    `);
    console.log('✅ Sequência resetada para 1');
  } catch (error: any) {
    // Se a sequência não existir ou houver erro, tentar criar/resetar de outra forma
    console.warn('⚠️  Erro ao resetar sequência:', error.message);
    console.log('ℹ️  Tentando método alternativo...');
    
    try {
      // Método alternativo: verificar e resetar
      await prisma.$executeRawUnsafe(`
        SELECT setval('orcamentos_numeroSequencial_seq', 1, false);
      `);
      console.log('✅ Sequência resetada (método alternativo)');
    } catch (error2: any) {
      console.error('❌ Erro ao resetar sequência (método alternativo):', error2.message);
      console.log('⚠️  Você pode precisar resetar manualmente a sequência no banco de dados.');
    }
  }
}

// Executar o script
resetarOrcamentos()
  .then(() => {
    console.log('✨ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
