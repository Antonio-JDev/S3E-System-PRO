/**
 * Script para normalizar categorias de materiais existentes no banco de dados
 * 
 * Este script corrige valores inválidos como "Importado XML", "Produto", etc.
 * e os classifica automaticamente baseado no nome do material.
 * 
 * Uso: npx tsx src/scripts/normalizarCategoriasMateriais.ts
 */

import { PrismaClient } from '@prisma/client';
import { classificarMaterialPorNome, normalizarCategoria, isCategoriaValida } from '../utils/materialClassifier';

const prisma = new PrismaClient();

async function normalizarCategorias() {
  try {
    console.log('🔄 Iniciando normalização de categorias de materiais...\n');

    // Buscar todos os materiais
    const materiais = await prisma.material.findMany({
      select: {
        id: true,
        nome: true,
        categoria: true,
        sku: true
      }
    });

    console.log(`📊 Total de materiais encontrados: ${materiais.length}\n`);

    let corrigidos = 0;
    let jaCorretos = 0;
    let erros = 0;

    for (const material of materiais) {
      try {
        const categoriaAtual = material.categoria;
        
        // Verificar se já está válida
        if (isCategoriaValida(categoriaAtual)) {
          jaCorretos++;
          continue;
        }

        // Normalizar categoria
        let categoriaNova = normalizarCategoria(categoriaAtual);
        
        // Se ainda não for válida após normalização, classificar automaticamente
        if (!isCategoriaValida(categoriaNova)) {
          categoriaNova = classificarMaterialPorNome(material.nome);
        }

        // Atualizar apenas se mudou
        if (categoriaNova !== categoriaAtual) {
          await prisma.material.update({
            where: { id: material.id },
            data: { categoria: categoriaNova }
          });

          console.log(`✅ ${material.sku} - "${material.nome}"`);
          console.log(`   ${categoriaAtual} → ${categoriaNova}\n`);
          corrigidos++;
        } else {
          jaCorretos++;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar material ${material.id}:`, error);
        erros++;
      }
    }

    console.log('\n📈 Resumo da normalização:');
    console.log(`   ✅ Corrigidos: ${corrigidos}`);
    console.log(`   ✓ Já corretos: ${jaCorretos}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📊 Total: ${materiais.length}\n`);

    if (corrigidos > 0) {
      console.log('✅ Normalização concluída com sucesso!');
    } else {
      console.log('ℹ️ Nenhuma correção necessária. Todos os materiais já estão com categorias válidas.');
    }

  } catch (error) {
    console.error('❌ Erro ao normalizar categorias:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
normalizarCategorias()
  .then(() => {
    console.log('\n✨ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

