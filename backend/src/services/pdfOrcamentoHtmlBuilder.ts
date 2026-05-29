import {
  PDF_CONTENT_WIDTH_PX,
  PDF_MARGIN_BOTTOM_PX,
  PDF_MARGIN_LEFT_PX,
  PDF_MARGIN_RIGHT_PX,
  PDF_MARGIN_TOP_PX,
  type OrcamentoItemsPagination,
} from './pdfOrcamentoPagination.util';
import {
  escapeHtmlAttr,
  formatCurrencyBR,
  normalizeEmptyParagraphsForPdf,
  normalizeListItemsForPdf,
} from './pdfOrcamentoHtml.util';

export type OrcamentoPdfItem = {
  nomeItem: string;
  unidade: string;
  quantidade: number;
  precoUnit: number;
  subtotal: number;
};

export type OrcamentoPdfModel = {
  numeroSequencial: number | string;
  titulo: string;
  createdAt: Date;
  validade: Date;
  orcamentistaNome: string | null;
  previsaoInicio?: Date | null;
  previsaoTermino?: Date | null;
  cliente: {
    nome: string;
    cpfCnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
    endereco?: string | null;
    numero?: string | null;
  };
  enderecoObra?: string | null;
  numeroObra?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  cep?: string | null;
  items: OrcamentoPdfItem[];
  precoVenda: number;
  descontoValor: number;
  impostoPercentual: number;
  condicaoPagamento?: string | null;
  descricao?: string | null;
  descricaoProjeto?: string | null;
  observacoes?: string | null;
};

export type OrcamentoPdfHtmlOptions = {
  folhaTimbradaUrl?: string;
  opacidadeMarcaDagua: number;
};

function mapItemFromPrisma(item: {
  quantidade: number | { toNumber?: () => number };
  precoUnit: number | { toNumber?: () => number };
  subtotal: number | { toNumber?: () => number };
  descricao?: string | null;
  servicoNome?: string | null;
  material?: { nome: string; descricao?: string | null } | null;
  kit?: { nome: string; descricao?: string | null } | null;
}): OrcamentoPdfItem {
  const qty = typeof item.quantidade === 'number' ? item.quantidade : Number(item.quantidade);
  const preco =
    typeof item.precoUnit === 'number' ? item.precoUnit : Number(item.precoUnit);
  const sub =
    typeof item.subtotal === 'number' ? item.subtotal : Number(item.subtotal);

  let nomeItem = item.descricao || 'Item do orçamento';
  if (item.material) {
    nomeItem = item.material.nome;
  } else if (item.kit) {
    nomeItem = item.kit.nome;
  } else if (item.servicoNome) {
    nomeItem = item.servicoNome;
  }

  return {
    nomeItem,
    unidade: 'UN',
    quantidade: qty,
    precoUnit: preco,
    subtotal: sub,
  };
}

export function mapPrismaOrcamentoToPdfModel(orcamento: {
  numeroSequencial: number;
  titulo?: string | null;
  createdAt: Date;
  validade: Date;
  orcamentistaNome?: string | null;
  previsaoInicio?: Date | null;
  previsaoTermino?: Date | null;
  precoVenda: number | { toNumber?: () => number };
  descontoValor: number | { toNumber?: () => number };
  impostoPercentual: number | { toNumber?: () => number };
  condicaoPagamento?: string | null;
  descricao?: string | null;
  descricaoProjeto?: string | null;
  observacoes?: string | null;
  enderecoObra?: string | null;
  numeroObra?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  cep?: string | null;
  cliente: OrcamentoPdfModel['cliente'];
  items: Parameters<typeof mapItemFromPrisma>[0][];
}): OrcamentoPdfModel {
  const precoVenda =
    typeof orcamento.precoVenda === 'number' ? orcamento.precoVenda : Number(orcamento.precoVenda);
  const descontoValor =
    typeof orcamento.descontoValor === 'number'
      ? orcamento.descontoValor
      : Number(orcamento.descontoValor);
  const impostoPercentual =
    typeof orcamento.impostoPercentual === 'number'
      ? orcamento.impostoPercentual
      : Number(orcamento.impostoPercentual);

  return {
    numeroSequencial: orcamento.numeroSequencial,
    titulo: orcamento.titulo || `ORÇAMENTO DE VENDA #${orcamento.numeroSequencial}`,
    createdAt: orcamento.createdAt,
    validade: orcamento.validade,
    orcamentistaNome: orcamento.orcamentistaNome ?? null,
    previsaoInicio: orcamento.previsaoInicio,
    previsaoTermino: orcamento.previsaoTermino,
    cliente: orcamento.cliente,
    enderecoObra: orcamento.enderecoObra,
    numeroObra: orcamento.numeroObra,
    bairro: orcamento.bairro,
    cidade: orcamento.cidade,
    cep: orcamento.cep,
    items: orcamento.items.map(mapItemFromPrisma),
    precoVenda,
    descontoValor,
    impostoPercentual,
    condicaoPagamento: orcamento.condicaoPagamento,
    descricao: orcamento.descricao,
    descricaoProjeto: orcamento.descricaoProjeto,
    observacoes: orcamento.observacoes,
  };
}

function buildSharedStyles(opacidadeMarcaDagua: number): string {
  return `
        * { margin: 0; padding: 0; box-sizing: border-box; }

        @page { size: A4; margin: 0; }

        html, body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #1e293b;
            background: transparent;
        }

        .print-container {
            margin: 0;
            padding: 0;
        }

        .pdf-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            overflow: hidden;
            page-break-after: always;
            break-after: page;
            background: white;
        }

        .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
        }

        .watermark-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            height: 297mm;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .watermark-background .letterhead-img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: fill;
            object-position: top left;
        }

        .watermark-background.custom-letterhead > *:not(.letterhead-img) {
            display: none !important;
        }

        .watermark-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 140px;
            font-weight: 900;
            color: #1e40af;
            opacity: ${opacidadeMarcaDagua};
            text-align: center;
            line-height: 1.2;
            letter-spacing: 4px;
        }

        .watermark-subtitle {
            font-size: 32px;
            font-weight: 600;
            margin-top: 10px;
            letter-spacing: 2px;
        }

        .page-content {
            position: relative;
            z-index: 1;
            padding-top: ${PDF_MARGIN_TOP_PX}px;
            padding-left: ${PDF_MARGIN_LEFT_PX}px;
            padding-right: ${PDF_MARGIN_RIGHT_PX}px;
            padding-bottom: ${PDF_MARGIN_BOTTOM_PX}px;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            box-sizing: border-box;
            overflow: hidden;
            background: transparent;
        }

        .page {
            margin: 0;
            padding: 0;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .measure-host {
            position: fixed;
            left: -99999px;
            top: 0;
            width: ${PDF_CONTENT_WIDTH_PX}px;
            visibility: hidden;
            pointer-events: none;
            z-index: -1;
        }

        .orcamento-title {
            padding: 8px 0;
            margin-bottom: 8px;
            border-bottom: 2px solid #1e293b;
        }
        .orcamento-title h1 { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
        .orcamento-details {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            font-size: 10px;
        }
        .detail-item label { display: block; opacity: 0.7; margin-bottom: 2px; font-size: 9px; }
        .detail-item strong { font-size: 10px; }

        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .cliente-section { padding: 6px 0; margin-bottom: 8px; }
        .cliente-info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 12px;
            font-size: 12px;
        }
        .cliente-info-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
        }
        .cliente-info-value { font-weight: bold; font-size: 11px; }

        .addresses-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
        }

        table.itens-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11px;
        }
        table.itens-table th {
            padding: 6px 4px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            border-bottom: 1px solid #cbd5e1;
        }
        table.itens-table th:nth-child(2),
        table.itens-table th:nth-child(3),
        table.itens-table th:nth-child(4),
        table.itens-table th:nth-child(5) { text-align: right; }
        table.itens-table td {
            padding: 6px 4px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
        table.itens-table td:nth-child(2),
        table.itens-table td:nth-child(3),
        table.itens-table td:nth-child(4),
        table.itens-table td:nth-child(5) { text-align: right; }

        .container-fechamento { margin-top: 12px; }
        .totais-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 12px;
        }
        .totais-row.total-final {
            border-top: 2px solid #1e293b;
            margin-top: 4px;
            padding-top: 6px;
            font-size: 14px;
            font-weight: bold;
        }

        table.pagamento-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 12px;
        }
        table.pagamento-table th,
        table.pagamento-table td {
            padding: 4px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }

        .descricao-content, .observacoes-content {
            color: #1e293b;
            font-size: 11px;
            line-height: 1.6;
            margin-top: 8px;
        }
        .descricao-content p.tiptap-empty-paragraph { min-height: 1em; }
        .descricao-content ul li p, .descricao-content ol li p {
            display: inline !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        @media print {
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pdf-page {
                width: 210mm !important;
                height: 297mm !important;
                overflow: hidden !important;
            }
            .page-content {
                padding-top: ${PDF_MARGIN_TOP_PX}px !important;
                padding-left: ${PDF_MARGIN_LEFT_PX}px !important;
                padding-right: ${PDF_MARGIN_RIGHT_PX}px !important;
                padding-bottom: ${PDF_MARGIN_BOTTOM_PX}px !important;
            }
        }
    `;
}

function buildWatermarkHtml(opts: OrcamentoPdfHtmlOptions): string {
  const { folhaTimbradaUrl, opacidadeMarcaDagua } = opts;
  const letterheadImg = folhaTimbradaUrl
    ? `<img class="letterhead-img" src="${escapeHtmlAttr(folhaTimbradaUrl)}" alt="" />`
    : '';

  if (folhaTimbradaUrl) {
    return `<div class="watermark-background custom-letterhead">${letterheadImg}</div>`;
  }

  return `
    <div class="watermark-background">
        <div class="watermark-center">
            S3E
            <div class="watermark-subtitle">ENGENHARIA ELÉTRICA</div>
        </div>
    </div>`;
}

function wrapPdfPage(innerContent: string, opts: OrcamentoPdfHtmlOptions): string {
  return `
    <div class="pdf-page">
        ${buildWatermarkHtml(opts)}
        <div class="page-content">
            <div class="page">${innerContent}</div>
        </div>
    </div>`;
}

function hasEnderecos(model: OrcamentoPdfModel): boolean {
  return Boolean(model.enderecoObra || model.cliente.endereco);
}

function buildTitleBlock(model: OrcamentoPdfModel): string {
  const prazo =
    (model.previsaoInicio && model.previsaoTermino) || model.previsaoTermino
      ? `<div class="detail-item">
            <label>Prazo de Entrega:</label>
            <strong>${
              model.previsaoInicio && model.previsaoTermino
                ? `${model.previsaoInicio.toLocaleDateString('pt-BR')} a ${model.previsaoTermino.toLocaleDateString('pt-BR')}`
                : model.previsaoTermino!.toLocaleDateString('pt-BR')
            }</strong>
        </div>`
      : '';

  return `
    <div class="orcamento-title">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
            <h1 style="margin:0;">${model.titulo}</h1>
            <strong style="font-size:14px;white-space:nowrap;">ORÇAMENTO: ${model.numeroSequencial}</strong>
        </div>
        <div class="orcamento-details">
            <div class="detail-item"><label>Cliente:</label><strong>${model.cliente.nome}</strong></div>
            <div class="detail-item"><label>Emissão:</label><strong>${model.createdAt.toLocaleDateString('pt-BR')}</strong></div>
            <div class="detail-item"><label>Validade:</label><strong>${model.validade.toLocaleDateString('pt-BR')}</strong></div>
            <div class="detail-item"><label>Orçamentista:</label><strong>${model.orcamentistaNome || 'Não identificado'}</strong></div>
            ${prazo}
        </div>
    </div>`;
}

function buildClienteBlock(model: OrcamentoPdfModel): string {
  const c = model.cliente;
  return `
    <div class="cliente-section">
        <div class="section-title">Dados do Cliente</div>
        <div class="cliente-info-grid">
            <div><div class="cliente-info-label">Nome:</div><div class="cliente-info-value">${c.nome}</div></div>
            ${c.cpfCnpj ? `<div><div class="cliente-info-label">CPF/CNPJ:</div><div class="cliente-info-value">${c.cpfCnpj}</div></div>` : ''}
            ${c.email ? `<div><div class="cliente-info-label">Email:</div><div class="cliente-info-value">${c.email}</div></div>` : ''}
            ${c.telefone ? `<div><div class="cliente-info-label">Telefone:</div><div class="cliente-info-value">${c.telefone}</div></div>` : ''}
        </div>
    </div>`;
}

function buildEnderecosBlock(model: OrcamentoPdfModel): string {
  if (!hasEnderecos(model)) return '';
  const cobranca = model.cliente.endereco
    ? `${model.cliente.endereco}${model.cliente.numero ? `, ${model.cliente.numero}` : ''}`
    : '';
  const obra = model.enderecoObra
    ? `${model.enderecoObra}${model.numeroObra ? `, ${model.numeroObra}` : ''}${model.bairro ? ` - ${model.bairro}` : ''}${model.cidade ? ` - ${model.cidade}` : ''}${model.cep ? ` - CEP: ${model.cep}` : ''}`
    : '';

  return `
    <div class="addresses-row">
        ${cobranca ? `<div class="address-box"><div class="section-title">Endereço de Cobrança</div><div style="font-size:12px;line-height:1.4;">${cobranca}</div></div>` : ''}
        ${obra ? `<div class="address-box"><div class="section-title">Endereço da Obra</div><div style="font-size:12px;line-height:1.4;">${obra}</div></div>` : ''}
    </div>`;
}

function buildItensSectionTitle(continuacao: boolean): string {
  return `<div style="font-size:10px;color:#1e293b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.3px;">${continuacao ? 'Itens do Orçamento (continuação)' : 'Itens do Orçamento'}</div>`;
}

function buildItensTableHeader(): string {
  return `<thead><tr><th>Descrição</th><th>Unid.</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr></thead>`;
}

function buildItemRow(item: OrcamentoPdfItem, measureAttr?: boolean): string {
  const attr = measureAttr ? ' data-measure="item-row"' : '';
  return `
    <tr${attr}>
        <td><div>${item.nomeItem}</div></td>
        <td>${item.unidade}</td>
        <td>${item.quantidade.toFixed(2)}</td>
        <td>${formatCurrencyBR(item.precoUnit)}</td>
        <td><strong>${formatCurrencyBR(item.subtotal)}</strong></td>
    </tr>`;
}

function buildItensTable(items: OrcamentoPdfItem[], measureRows = false): string {
  return `
    <div class="itens-section">
        <table class="itens-table">
            ${buildItensTableHeader()}
            <tbody>${items.map((i) => buildItemRow(i, measureRows)).join('')}</tbody>
        </table>
    </div>`;
}

function buildTotaisBlock(model: OrcamentoPdfModel, measureAttr?: boolean): string {
  const attr = measureAttr ? ' data-measure="totais"' : '';
  const qtd = model.items.length;
  const valorItens = model.items.reduce((s, i) => s + i.subtotal, 0);
  const impostosValor =
    model.impostoPercentual > 0
      ? model.precoVenda - (valorItens - model.descontoValor)
      : 0;

  return `
    <div class="totais-section"${attr}>
        <div class="totais-row" style="margin-bottom:4px;">
            <span>Quantidade: ${qtd} ${qtd === 1 ? 'item' : 'itens'}</span>
            <span>Valor total dos itens ${formatCurrencyBR(valorItens)}</span>
        </div>
        ${model.descontoValor > 0 ? `<div class="totais-row"><span>Desconto:</span><strong>- ${formatCurrencyBR(model.descontoValor)}</strong></div>` : ''}
        ${model.impostoPercentual > 0 ? `<div class="totais-row"><span>Impostos (${model.impostoPercentual}%):</span><strong>${formatCurrencyBR(impostosValor)}</strong></div>` : ''}
        <div class="totais-row total-final">
            <span>VALOR TOTAL DO ORÇAMENTO:</span>
            <span>${formatCurrencyBR(model.precoVenda)}</span>
        </div>
    </div>`;
}

function buildPagamentoBlock(model: OrcamentoPdfModel, measureAttr?: boolean): string {
  if (!model.condicaoPagamento) return '';
  const attr = measureAttr ? ' data-measure="pagamento"' : '';
  return `
    <div class="pagamento-section"${attr}>
        <div class="section-title">Forma / Condições de Pagamento</div>
        <table class="pagamento-table">
            <thead><tr><th>Condição</th><th>Observação</th></tr></thead>
            <tbody>
                <tr>
                    <td><strong>${model.condicaoPagamento}</strong></td>
                    <td>Pagamento conforme condições acordadas</td>
                </tr>
            </tbody>
        </table>
    </div>`;
}

function buildDescriptionSection(title: string, html: string): string {
  const body = normalizeEmptyParagraphsForPdf(normalizeListItemsForPdf(html));
  return `
    <div class="descricao-section">
        <div class="section-title">${title}</div>
        <div class="descricao-content">${body}</div>
    </div>`;
}

function buildMeasureHost(model: OrcamentoPdfModel): string {
  const allRows = model.items.map((i) => buildItemRow(i, true)).join('');
  return `
    <div class="measure-host" aria-hidden="true">
        <div data-measure="header-pg1">
            ${buildTitleBlock(model)}
            ${buildClienteBlock(model)}
            ${hasEnderecos(model) ? buildEnderecosBlock(model) : ''}
            <hr style="margin:12px 0;border:none;border-top:1px solid #000;" />
            ${buildItensSectionTitle(false)}
            <table class="itens-table">${buildItensTableHeader()}</table>
        </div>
        <div data-measure="header-pgn">
            ${buildItensSectionTitle(true)}
            <table class="itens-table">${buildItensTableHeader()}</table>
        </div>
        <table class="itens-table"><tbody>${allRows}</tbody></table>
        ${buildTotaisBlock(model, true)}
        ${buildPagamentoBlock(model, true)}
    </div>`;
}

export function buildOrcamentoMeasureHtml(
  model: OrcamentoPdfModel,
  opts: OrcamentoPdfHtmlOptions
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Medição Orçamento ${model.numeroSequencial}</title>
    <style>${buildSharedStyles(opts.opacidadeMarcaDagua)}</style>
</head>
<body>
    ${buildMeasureHost(model)}
</body>
</html>`;
}

function buildDescriptionPages(model: OrcamentoPdfModel, opts: OrcamentoPdfHtmlOptions): string {
  const pages: string[] = [];

  const pushSection = (title: string, content?: string | null) => {
    if (!content?.trim()) return;
    pages.push(wrapPdfPage(buildDescriptionSection(title, content), opts));
  };

  if (model.descricaoProjeto || (model.descricao && model.descricaoProjeto)) {
    pushSection('Descrição Geral', model.descricao);
    pushSection('Descrição Técnica do Projeto', model.descricaoProjeto);
    pushSection('Observações Importantes', model.observacoes);
  } else if (model.descricao && !model.descricaoProjeto) {
    pushSection('Descrição Geral', model.descricao);
    pushSection('Observações Importantes', model.observacoes);
  } else if (model.observacoes) {
    pushSection('Observações Importantes', model.observacoes);
  }

  return pages.join('\n');
}

export function buildOrcamentoPaginatedHtml(
  model: OrcamentoPdfModel,
  opts: OrcamentoPdfHtmlOptions,
  pagination: OrcamentoItemsPagination
): string {
  const pagesHtml: string[] = [];
  const { items } = model;

  pagination.pages.forEach((indices, pageIdx) => {
    const pageItems = indices.map((i) => items[i]).filter(Boolean);
    const isLastItemsPage = pageIdx === pagination.pages.length - 1;
    const parts: string[] = [];

    if (pageIdx === 0) {
      parts.push(
        buildTitleBlock(model),
        buildClienteBlock(model),
        hasEnderecos(model) ? buildEnderecosBlock(model) : '',
        '<hr style="margin:12px 0;border:none;border-top:1px solid #000;" />',
        buildItensSectionTitle(false)
      );
    } else {
      parts.push(buildItensSectionTitle(true));
    }

    parts.push(buildItensTable(pageItems));

    if (isLastItemsPage && pagination.totalsFitOnLast) {
      parts.push(
        '<div class="container-fechamento">',
        buildTotaisBlock(model),
        buildPagamentoBlock(model),
        '</div>'
      );
    }

    pagesHtml.push(wrapPdfPage(parts.join('\n'), opts));
  });

  if (!pagination.totalsFitOnLast) {
    pagesHtml.push(
      wrapPdfPage(
        `<div class="container-fechamento">${buildTotaisBlock(model)}${buildPagamentoBlock(model)}</div>`,
        opts
      )
    );
  }

  pagesHtml.push(buildDescriptionPages(model, opts));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orçamento ${model.numeroSequencial}</title>
    <style>${buildSharedStyles(opts.opacidadeMarcaDagua)}</style>
</head>
<body>
    <div class="print-container">
        ${pagesHtml.join('\n')}
    </div>
</body>
</html>`;
}
