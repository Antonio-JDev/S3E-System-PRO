import { PrismaClient } from '@prisma/client';
import { gerarSKUCotacao } from '../utils/skuGenerator';

const prisma = new PrismaClient();

/**
 * Script para gerar SKUs únicos para todas as cotações existentes
 * EXECUTAR APÓS APLICAR A MIGRATION DO CAMPO SKU
 */
async function gerarSKUsParaCotacoes() {
  console.log('🔧 [SKU Cotações] Iniciando geração de SKUs para cotações existentes...');
  
  try {
    // Buscar todas as cotações que não têm SKU
    const cotacoesSemSKU = await prisma.cotacao.findMany({
      where: {
        sku: null
      },
      select: {
        id: true,
        nome: true,
        sku: true
      }
    });

    console.log(`📊 [SKU Cotações] Encontradas ${cotacoesSemSKU.length} cotações sem SKU`);

    if (cotacoesSemSKU.length === 0) {
      console.log('✅ [SKU Cotações] Todas as cotações já possuem SKU!');
      return;
    }

    let sucessos = 0;
    let erros = 0;

    // Processar em lotes para evitar sobrecarga
    const LOTE_SIZE = 10;
    for (let i = 0; i < cotacoesSemSKU.length; i += LOTE_SIZE) {
      const lote = cotacoesSemSKU.slice(i, i + LOTE_SIZE);
      
      console.log(`📦 [SKU Cotações] Processando lote ${Math.floor(i / LOTE_SIZE) + 1}/${Math.ceil(cotacoesSemSKU.length / LOTE_SIZE)}`);
      
      for (const cotacao of lote) {
        try {
          // Gerar SKU único
          const novoSKU = await gerarSKUCotacao(prisma);
          
          // Atualizar cotação com novo SKU
          await prisma.cotacao.update({
            where: { id: cotacao.id },
            data: { sku: novoSKU }
          });
          
          console.log(`✅ [SKU Cotações] SKU gerado para "${cotacao.nome}": ${novoSKU}`);
          sucessos++;
          
        } catch (error: any) {
          console.error(`❌ [SKU Cotações] Erro ao gerar SKU para cotação ${cotacao.id}:`, error.message);
          erros++;
        }
      }
      
      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 [SKU Cotações] Processamento concluído:`);
    console.log(`   ✅ Sucessos: ${sucessos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📊 Total processado: ${sucessos + erros}`);

    // Verificar resultado final
    const cotacoesComSKU = await prisma.cotacao.count({
      where: {
        sku: {
          not: null
        }
      }
    });

    const totalCotacoes = await prisma.cotacao.count();
    
    console.log(`\n📈 [SKU Cotações] Estatísticas finais:`);
    console.log(`   🎯 Cotações com SKU: ${cotacoesComSKU}/${totalCotacoes}`);
    console.log(`   📊 Cobertura: ${((cotacoesComSKU / totalCotacoes) * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('💥 [SKU Cotações] Erro fatal:', error);
    throw error;
  } finally {
    // Só desconectar se executado diretamente via CLI
    if (require.main === module) {
      await prisma.$disconnect();
    }
  }
}

// Executar script se chamado diretamente
if (require.main === module) {
  gerarSKUsParaCotacoes()
    .then(() => {
      console.log('🏁 [SKU Cotações] Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💀 [SKU Cotações] Script falhou:', error);
      process.exit(1);
    });
}

export default gerarSKUsParaCotacoes;