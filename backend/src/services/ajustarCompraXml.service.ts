import { XMLParser } from 'fast-xml-parser';
import { prisma } from '../lib/prisma';
import { upsertAlias } from './materialFornecedorAlias.service';
import {
  camposAjusteItemDeXml,
  emparelharItensCompraComXml,
  extrairDadosAjusteDeNfe,
  validarIdentidadeNfeCompra,
} from '../utils/nfeXmlAjuste.util';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export class AjustarCompraXmlError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = 'AjustarCompraXmlError';
  }
}

export type AjustarCompraXmlResult = {
  compra: any;
  itensAtualizados: number;
  aliasesAtualizados: number;
  totais: {
    valorICMS: number;
    valorIPI: number;
    valorFrete: number;
    outrasDespesas: number;
    valorDesconto: number;
    valorTotalProdutos: number;
    valorTotalNota: number;
  };
};

/**
 * Reimporta o XML da mesma NF sobre a compra existente (ajuste, não cria nova).
 * Atualiza ICMS/totais em xmlData, EAN/cProd nos itens e aliases dos materiais vinculados.
 */
export async function ajustarCompraComXml(
  compraId: string,
  xmlContent: string,
  createdBy?: string | null
): Promise<AjustarCompraXmlResult> {
  if (!compraId) {
    throw new AjustarCompraXmlError('ID da compra é obrigatório.');
  }
  if (!xmlContent || !String(xmlContent).trim()) {
    throw new AjustarCompraXmlError('XML não fornecido.');
  }

  let parsed: any;
  try {
    parsed = xmlParser.parse(xmlContent);
  } catch {
    throw new AjustarCompraXmlError(
      'Não foi possível ler o XML. Verifique se o arquivo é uma NF-e válida.'
    );
  }

  const dados = extrairDadosAjusteDeNfe(parsed);
  if (!dados.identidade.numeroNF) {
    throw new AjustarCompraXmlError('XML inválido: número da NF não encontrado.');
  }
  if (!dados.items.length) {
    throw new AjustarCompraXmlError('XML inválido: nenhum item encontrado na nota.');
  }

  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: {
      items: {
        select: {
          id: true,
          nomeProduto: true,
          codigoFornecedor: true,
          ean: true,
          materialId: true,
          ncm: true,
        },
      },
    },
  });

  if (!compra) {
    throw new AjustarCompraXmlError('Compra não encontrada.', 404);
  }

  if (compra.status === 'Cancelado') {
    throw new AjustarCompraXmlError('Não é possível ajustar uma compra cancelada.');
  }

  const identidadeOk = validarIdentidadeNfeCompra(
    {
      numeroNF: compra.numeroNF,
      serieNF: compra.serieNF,
      fornecedorCNPJ: compra.fornecedorCNPJ,
    },
    dados.identidade
  );
  if (!identidadeOk.ok) {
    throw new AjustarCompraXmlError(identidadeOk.message);
  }

  const pares = emparelharItensCompraComXml(compra.items, dados.items);
  const paresValidos = pares.filter(
    (p): p is { compraItemId: string; xmlItem: (typeof dados.items)[0] } => p != null
  );

  if (paresValidos.length === 0) {
    throw new AjustarCompraXmlError(
      'Não foi possível relacionar os itens do XML com os itens desta compra. Confira se é a mesma nota.'
    );
  }

  let xmlMeta: Record<string, unknown> = {};
  if (compra.xmlData) {
    try {
      xmlMeta = JSON.parse(compra.xmlData) || {};
    } catch {
      xmlMeta = {};
    }
  }

  xmlMeta = {
    ...xmlMeta,
    valorICMS: dados.totais.valorICMS,
    valorIPI: dados.totais.valorIPI,
    valorFrete: dados.totais.valorFrete,
    outrasDespesas: dados.totais.outrasDespesas,
    valorDesconto: dados.totais.valorDesconto,
    valorTotalProdutos: dados.totais.valorTotalProdutos,
    valorTotalNota: dados.totais.valorTotalNota,
    chaveAcesso: dados.identidade.chaveAcesso || (xmlMeta as any).chaveAcesso || null,
    statusImportacao: 'XML',
    ajustadoEm: new Date().toISOString(),
  };

  const itemById = new Map(compra.items.map((it) => [it.id, it]));
  let itensAtualizados = 0;
  let aliasesAtualizados = 0;

  await prisma.$transaction(async (tx) => {
    for (const { compraItemId, xmlItem } of paresValidos) {
      const atual = itemById.get(compraItemId);
      if (!atual) continue;

      const patch = camposAjusteItemDeXml(xmlItem, atual);
      await tx.compraItem.update({
        where: { id: compraItemId },
        data: patch,
      });
      itensAtualizados += 1;

      if (atual.materialId && compra.fornecedorId) {
        // upsertAlias já ignora ean/cProd nulos no update (não apaga alias existente)
        await upsertAlias(tx as any, {
          materialId: atual.materialId,
          fornecedorId: compra.fornecedorId,
          nomeOriginal: xmlItem.nomeProduto || atual.nomeProduto,
          codigoFornecedor: xmlItem.codigoFornecedor,
          ean: xmlItem.ean,
          ncm: xmlItem.ncm || atual.ncm,
          origem: 'IMPORTACAO',
          createdBy: createdBy || null,
        });
        aliasesAtualizados += 1;
      }
    }

    const frete = dados.totais.valorFrete;
    const outras = dados.totais.outrasDespesas;
    const desconto = Math.min(
      Math.max(0, dados.totais.valorDesconto),
      compra.valorSubtotal || 0
    );
    const valorTotal =
      dados.totais.valorTotalNota > 0
        ? dados.totais.valorTotalNota
        : (compra.valorSubtotal || 0) - desconto + frete + outras + (dados.totais.valorIPI || 0);

    await tx.compra.update({
      where: { id: compraId },
      data: {
        valorFrete: frete,
        outrasDespesas: outras,
        valorDesconto: desconto,
        valorTotal,
        xmlData: JSON.stringify(xmlMeta),
        ...(dados.identidade.serieNF && !compra.serieNF
          ? { serieNF: dados.identidade.serieNF }
          : {}),
      },
    });
  });

  const compraAtualizada = await prisma.compra.findUnique({
    where: { id: compraId },
    include: {
      fornecedor: true,
      items: {
        include: {
          material: {
            select: {
              id: true,
              nome: true,
              sku: true,
              ncm: true,
              unidadeMedida: true,
              preco: true,
              valorVenda: true,
              estoque: true,
              imagemUrl: true,
            },
          },
        },
      },
    },
  });

  return {
    compra: {
      ...compraAtualizada,
      valorICMS: dados.totais.valorICMS,
      valorIPI: dados.totais.valorIPI,
      valorTotalProdutos: dados.totais.valorTotalProdutos,
      valorTotalNota: dados.totais.valorTotalNota,
      statusImportacao: 'XML',
    },
    itensAtualizados,
    aliasesAtualizados,
    totais: dados.totais,
  };
}
