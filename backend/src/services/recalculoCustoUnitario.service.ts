import { prisma } from '../lib/prisma';

/** Unidades que indicam venda/estoque em metros (podem ter sido compradas em KM) */
const UNIDADES_METROS = ['m', 'M', 'metro', 'metros'];

/** Fator KM -> M */
const KM_PARA_M = 1000;

/**
 * Valor de referência mínimo para considerar "custo suspeito" quando material não tem valorVenda (R$ por unidade).
 * Custos acima disso para material em metros podem indicar valor por KM registrado como por M.
 */
const CUSTO_MINIMO_SUSPEITO_POR_METRO = 100;

/**
 * Multiplicador: custo atual > (valorReferencia * MULTIPLICADOR_DIFERENCA_GRITANTE) indica possível erro KM/M.
 */
const MULTIPLICADOR_DIFERENCA_GRITANTE = 100;

export interface ResultadoRecalculo {
  aplicado: boolean;
  materialId: string;
  materialNome: string;
  motivo: string;
  valorUnitarioAnterior?: number;
  valorUnitarioNovo?: number;
  compraItemId?: string;
  numeroNF?: string;
}

/**
 * Verifica se o material está configurado em metros (M) e se o custo atual sugere que a compra veio em KM.
 * Regra: material em M + (valorUnit > 100 * valorVenda ou valorUnit > 100 quando sem valorVenda) => provável KM registrado como M.
 */
function deveRecalcular(
  unidadeMedida: string,
  valorUnitAtual: number,
  valorVendaRef: number | null,
  force: boolean
): { sim: boolean; motivo: string } {
  const unidadeNormalizada = (unidadeMedida || '').toLowerCase().trim();
  const emMetros = UNIDADES_METROS.some(u => u.toLowerCase() === unidadeNormalizada) || unidadeNormalizada === 'm';

  if (!emMetros) {
    return { sim: false, motivo: 'Material não está em metros (M). Recálculo KM→M aplica-se apenas a materiais em metros.' };
  }

  const valorReferencia = valorVendaRef != null && valorVendaRef > 0 ? valorVendaRef : CUSTO_MINIMO_SUSPEITO_POR_METRO;
  const limiteGritante = valorReferencia * MULTIPLICADOR_DIFERENCA_GRITANTE;

  if (force) {
    // No modo forçado, só exige custo suspeito (ex.: > 50) para não alterar valores baixos por engano
    if (valorUnitAtual < 50) {
      return { sim: false, motivo: 'Custo unitário atual muito baixo (< R$ 50). Não foi aplicada correção para evitar erro.' };
    }
    return { sim: true, motivo: 'Recálculo solicitado manualmente (material em metros e custo > R$ 50).' };
  }

  if (valorUnitAtual <= limiteGritante) {
    return {
      sim: false,
      motivo: `Proteção ativa: custo atual (R$ ${valorUnitAtual.toFixed(2)}) não atinge 100x o valor de referência (R$ ${valorReferencia.toFixed(2)}). Use "Recalcular" manualmente se tiver certeza.`
    };
  }

  return {
    sim: true,
    motivo: `Custo atual (R$ ${valorUnitAtual.toFixed(2)}) indica possível compra em KM registrada como M. Aplicando correção.`
  };
}

/**
 * Recalcula o custo unitário de um material quando a compra foi em KM mas o cadastro está em M.
 * Atualiza o CompraItem da última compra e o Material.preco.
 * O DRE (Lucro Real) usa esses dados, então a lucratividade passa a refletir o custo por metro correto.
 */
export async function recalcularCustoUnitarioMaterial(
  materialId: string,
  opts: { force?: boolean } = {}
): Promise<ResultadoRecalculo> {
  const { force = false } = opts;

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      nome: true,
      unidadeMedida: true,
      preco: true,
      valorVenda: true,
      valorVendaM: true
    }
  });

  if (!material) {
    return { aplicado: false, materialId, materialNome: '', motivo: 'Material não encontrado.' };
  }

  const ultimaCompraItem = await prisma.compraItem.findFirst({
    where: {
      materialId,
      compra: {
        status: 'Recebido',
        dataRecebimento: { not: null }
      }
    },
    orderBy: { compra: { dataRecebimento: 'desc' } },
    include: {
      compra: { select: { numeroNF: true } }
    }
  });

  if (!ultimaCompraItem) {
    return {
      aplicado: false,
      materialId: material.id,
      materialNome: material.nome,
      motivo: 'Nenhuma compra recebida encontrada para este material.'
    };
  }

  const valorUnitAtual = ultimaCompraItem.valorUnit;
  const quantidade = ultimaCompraItem.quantidade;
  const valorTotalItem = quantidade * valorUnitAtual;

  const valorVendaRef = material.valorVenda ?? material.valorVendaM ?? null;
  const { sim: aplicar, motivo } = deveRecalcular(
    material.unidadeMedida || 'un',
    valorUnitAtual,
    valorVendaRef,
    force
  );

  if (!aplicar) {
    return {
      aplicado: false,
      materialId: material.id,
      materialNome: material.nome,
      motivo
    };
  }

  // Custo por metro = valor total da compra / (quantidade em KM * 1000)
  const quantidadeEmMetros = quantidade * KM_PARA_M;
  const valorUnitarioNovo = valorTotalItem / quantidadeEmMetros;

  await prisma.$transaction(async (tx) => {
    await tx.compraItem.update({
      where: { id: ultimaCompraItem.id },
      data: { valorUnit: valorUnitarioNovo }
      // valorTotal não é alterado para preservar o total da NF na auditoria
    });
    await tx.material.update({
      where: { id: materialId },
      data: { preco: valorUnitarioNovo }
    });
  });

  return {
    aplicado: true,
    materialId: material.id,
    materialNome: material.nome,
    motivo,
    valorUnitarioAnterior: valorUnitAtual,
    valorUnitarioNovo,
    compraItemId: ultimaCompraItem.id,
    numeroNF: ultimaCompraItem.compra?.numeroNF ?? undefined
  };
}

/**
 * Lista materiais candidatos ao recálculo (em metros com custo muito alto em relação ao valor de venda).
 * Útil para exibir na interface ou para processamento em lote.
 */
export async function listarCandidatosRecalculo(): Promise<Array<{
  materialId: string;
  materialNome: string;
  sku: string | null;
  unidadeMedida: string;
  valorUnitarioAtual: number;
  valorVendaRef: number | null;
  numeroNF: string | null;
  dataUltimaCompra: Date | null;
}>> {
  const materiaisEmMetros = await prisma.material.findMany({
    where: {
      ativo: true,
      unidadeMedida: { in: ['m', 'M'] }
    },
    select: {
      id: true,
      nome: true,
      sku: true,
      unidadeMedida: true,
      preco: true,
      valorVenda: true,
      valorVendaM: true
    }
  });

  const candidatos: Array<{
    materialId: string;
    materialNome: string;
    sku: string | null;
    unidadeMedida: string;
    valorUnitarioAtual: number;
    valorVendaRef: number | null;
    numeroNF: string | null;
    dataUltimaCompra: Date | null;
  }> = [];

  for (const mat of materiaisEmMetros) {
    const ultimaCompra = await prisma.compraItem.findFirst({
      where: {
        materialId: mat.id,
        compra: { status: 'Recebido', dataRecebimento: { not: null } }
      },
      orderBy: { compra: { dataRecebimento: 'desc' } },
      include: { compra: { select: { numeroNF: true, dataRecebimento: true } } }
    });

    if (!ultimaCompra) continue;

    const valorRef = mat.valorVenda ?? mat.valorVendaM ?? null;
    const limite = (valorRef != null && valorRef > 0) ? valorRef * MULTIPLICADOR_DIFERENCA_GRITANTE : CUSTO_MINIMO_SUSPEITO_POR_METRO;
    if (ultimaCompra.valorUnit <= limite) continue;

    candidatos.push({
      materialId: mat.id,
      materialNome: mat.nome,
      sku: mat.sku,
      unidadeMedida: mat.unidadeMedida || 'm',
      valorUnitarioAtual: ultimaCompra.valorUnit,
      valorVendaRef: valorRef,
      numeroNF: ultimaCompra.compra?.numeroNF ?? null,
      dataUltimaCompra: ultimaCompra.compra?.dataRecebimento ?? null
    });
  }

  return candidatos;
}
