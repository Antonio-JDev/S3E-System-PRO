/**
 * Script de migração retroativa: recalcula valorVenda, valorImposto e custoAgregado
 * em todos os materiais conforme a fórmula Simples Nacional:
 * - Preço de Venda = Preço de Compra × Markup (Fabricante ou Revendedor)
 * - Valor do Imposto (DAS) = Preço de Venda × (alíquota/100)
 * - Custo Agregado = Preço de Compra + Valor do Imposto
 *
 * Uso: npx ts-node scripts/migrar-precificacao-simples-nacional.ts
 * (executar a partir da pasta backend)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function main() {
  const config = await prisma.configuracaoSistema.findUnique({
    where: { id: 'sistema-config' },
    select: {
      aliquotaImpostoPadrao: true,
      markupFabricante: true,
      markupRevendedor: true,
      percentualImpostoPadrao: true,
      multiplicadorVenda: true
    }
  });

  const aliquota = config?.aliquotaImpostoPadrao ?? config?.percentualImpostoPadrao ?? 8;
  const markupFabricante = config?.markupFabricante ?? config?.multiplicadorVenda ?? 1.55;
  const markupRevendedor = config?.markupRevendedor ?? 1.10;

  const materiais = await prisma.material.findMany({
    where: { preco: { gt: 0 } },
    include: { fornecedor: { select: { classificacao: true } } }
  });

  let atualizados = 0;
  for (const m of materiais) {
    const preco = m.preco ?? 0;
    if (preco <= 0) continue;

    const classificacao = (m.fornecedor as any)?.classificacao;
    const markup = classificacao === 'Representante_Vendedor' ? markupRevendedor : markupFabricante;
    const valorVenda = roundMoney(preco * markup);
    const aliquotaDecimal = aliquota / 100;
    const valorImposto = roundMoney(valorVenda * aliquotaDecimal);
    const custoAgregado = roundMoney(preco + valorImposto);

    await prisma.material.update({
      where: { id: m.id },
      data: {
        valorVenda,
        valorImposto,
        custoAgregado
      }
    });
    atualizados++;
  }

  console.log(`Migração concluída: ${atualizados} materiais atualizados (valorVenda, valorImposto, custoAgregado).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
