import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OrcamentoPDFData } from '../../types/pdfCustomization';
import PrintRenderer from '../PrintRenderer';
import { ensureHtml, normalizeEmptyParagraphsForPdf, normalizeListItemsForPdf } from '../../utils/tipTapUtils';

interface OrcamentoPrintableProps {
    orcamento: OrcamentoPDFData;
    folhaTimbradaUrl?: string;
    opacidade?: number;
}

// === Constantes de página A4 (compatíveis com PrintRenderer) ===
const PX_PER_MM = 3.78;
const PAGE_HEIGHT_PX = Math.round(297 * PX_PER_MM); // ~1123px
const PAGE_WIDTH_PX = Math.round(210 * PX_PER_MM);   // ~794px
const MARGIN_TOP_PX = 95;
const MARGIN_BOTTOM_PX = 100;
const MARGIN_LEFT_PX = 20;
const MARGIN_RIGHT_PX = 20;
const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX; // ~928px
const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - MARGIN_LEFT_PX - MARGIN_RIGHT_PX;     // ~754px
const RESERVE_PADDING_PX = 16;

// SSR-safe layout effect (mantém compatibilidade com testes Vitest/JSDOM)
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface PaginationState {
    pages: number[][];
    totalsFitOnLast: boolean;
}

const formatCurrencyBR = (value: number) =>
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OrcamentoPrintable = React.forwardRef<HTMLDivElement, OrcamentoPrintableProps>(
    ({ orcamento, folhaTimbradaUrl, opacidade = 0.05 }, ref) => {

        // Preparar conteúdo combinado para o PrintRenderer (descrições/observações)
        const conteudoCombinado = useMemo(() => {
            const partes: string[] = [];

            const normalizeForPdf = (raw: any) => {
                const html = ensureHtml(raw);
                // Ordem importa:
                // 1) manter bullets na mesma linha (li/p)
                // 2) preservar ENTER ENTER (parágrafos vazios)
                return normalizeEmptyParagraphsForPdf(normalizeListItemsForPdf(html));
            };

            if (orcamento.descricaoGeral) {
                partes.push(`
                    <div class="section">
                        <h2>Descrição Geral</h2>
                        ${normalizeForPdf(orcamento.descricaoGeral)}
                    </div>
                `);
            }

            if (orcamento.descricaoTecnica) {
                partes.push(`
                    <div class="section">
                        ${normalizeForPdf(orcamento.descricaoTecnica)}
                    </div>
                `);
            }

            if (orcamento.observacoes) {
                partes.push(`
                    <div class="section">
                        <h2>Observações Importantes</h2>
                        ${normalizeForPdf(orcamento.observacoes)}
                    </div>
                `);
            }

            return partes.join('\n');
        }, [orcamento.descricaoGeral, orcamento.descricaoTecnica, orcamento.observacoes]);

        const items = orcamento.items || [];

        const hasEnderecos = Boolean(
            orcamento.enderecos?.obra ||
            orcamento.enderecos?.cobranca ||
            orcamento.cliente?.endereco ||
            (orcamento as any).enderecoObra ||
            orcamento.projeto?.enderecoObra
        );

        const hasPagamento = Boolean(orcamento.pagamento || orcamento.financeiro?.condicaoPagamento);

        // Chave estável para invalidar a medição quando os dados relevantes mudarem.
        const measureKey = useMemo(() => {
            try {
                return JSON.stringify({
                    items: items.map(i => ({
                        n: i.nome ?? '',
                        d: i.descricao ?? '',
                        u: i.unidade ?? '',
                        q: i.quantidade ?? 0,
                        vu: i.valorUnitario ?? 0,
                        vt: i.valorTotal ?? 0,
                    })),
                    cliente: orcamento.cliente,
                    enderecos: orcamento.enderecos,
                    enderecoObra: (orcamento as any).enderecoObra,
                    numeroObra: (orcamento as any).numeroObra,
                    clienteNumero: (orcamento.cliente as any)?.numero,
                    projetoEnderecoObra: orcamento.projeto?.enderecoObra,
                    financeiro: orcamento.financeiro,
                    pagamento: orcamento.pagamento,
                    numero: orcamento.numero,
                    numeroSequencial: orcamento.numeroSequencial,
                    titulo: orcamento.projeto?.titulo,
                    emissao: orcamento.emissao,
                    data: orcamento.data,
                    validade: orcamento.validade,
                    orcamentistaNome: orcamento.orcamentistaNome,
                });
            } catch {
                return String(items.length);
            }
        }, [orcamento, items]);

        // Estado de paginação. Fallback inicial: tudo na pg 1 (mesmo comportamento antigo até o useLayoutEffect rodar).
        const [pagination, setPagination] = useState<PaginationState>(() => ({
            pages: [items.map((_, i) => i)],
            totalsFitOnLast: true,
        }));

        // Quantas páginas o PrintRenderer da descrição técnica gerou (0 se não houver descrição).
        const [printRendererPagesCount, setPrintRendererPagesCount] = useState<number>(0);
        // Recebemos pelo menos uma contagem do PrintRenderer? (ou não há PrintRenderer)
        const [pageCountReceived, setPageCountReceived] = useState<boolean>(!conteudoCombinado);

        useEffect(() => {
            // Quando o conteúdo técnico muda: aguardar nova contagem antes de exibir page-numbers.
            if (!conteudoCombinado) {
                setPrintRendererPagesCount(0);
                setPageCountReceived(true);
            } else {
                setPageCountReceived(false);
            }
        }, [conteudoCombinado]);

        const handlePrintRendererPagesComputed = useCallback((count: number) => {
            setPrintRendererPagesCount(count);
            setPageCountReceived(true);
        }, []);

        const measureRef = useRef<HTMLDivElement>(null);
        const lastKeyRef = useRef<string>('');

        useIsomorphicLayoutEffect(() => {
            const root = measureRef.current;
            if (!root) return;

            // Em StrictMode o effect roda 2x; evita recomputar para a mesma chave.
            if (lastKeyRef.current === measureKey) return;
            lastKeyRef.current = measureKey;

            const headerPg1 = root.querySelector<HTMLElement>('[data-measure="header-pg1"]');
            const headerPgN = root.querySelector<HTMLElement>('[data-measure="header-pgn"]');
            const totaisEl = root.querySelector<HTMLElement>('[data-measure="totais"]');
            const pagamentoEl = root.querySelector<HTMLElement>('[data-measure="pagamento"]');
            const itemRows = root.querySelectorAll<HTMLTableRowElement>('tr[data-measure="item-row"]');

            const measure = (el: Element | null) => (el ? el.getBoundingClientRect().height : 0);

            const H_HEADER_PG1 = measure(headerPg1);
            const H_HEADER_PGN = measure(headerPgN);
            const H_TOTAIS = measure(totaisEl);
            const H_PAGAMENTO = measure(pagamentoEl);
            const trHeights = Array.from(itemRows).map(tr => tr.getBoundingClientRect().height || 24);

            const RESERVE_END = H_TOTAIS + H_PAGAMENTO + RESERVE_PADDING_PX;

            // Algoritmo de paginação por altura medida.
            const newPages: number[][] = [[]];
            let cur = H_HEADER_PG1 || 0;

            for (let i = 0; i < trHeights.length; i++) {
                const trH = trHeights[i] || 24;
                const currentArr = newPages[newPages.length - 1];
                if (cur + trH > CONTENT_HEIGHT_PX && currentArr.length > 0) {
                    newPages.push([]);
                    cur = H_HEADER_PGN || 0;
                }
                newPages[newPages.length - 1].push(i);
                cur += trH;
            }

            const totalsFitOnLast = cur + RESERVE_END <= CONTENT_HEIGHT_PX;

            setPagination(prev => {
                const same =
                    prev.pages.length === newPages.length &&
                    prev.totalsFitOnLast === totalsFitOnLast &&
                    prev.pages.every((p, idx) =>
                        p.length === (newPages[idx]?.length ?? -1) &&
                        p.every((v, j) => v === newPages[idx][j])
                    );
                if (same) return prev;
                return { pages: newPages, totalsFitOnLast };
            });
        }, [measureKey]);

        // === Blocos reutilizáveis (mesmos no medidor offscreen e nas páginas visíveis) ===

        const renderWatermark = () => (
            <div
                className={`watermark-background${folhaTimbradaUrl ? ' custom-letterhead' : ''}`}
                style={folhaTimbradaUrl ? { backgroundImage: `url('${folhaTimbradaUrl}')` } : undefined}
            >
                {!folhaTimbradaUrl && (
                    <div className="watermark-center">
                        S3E
                        <div className="watermark-subtitle">ENGENHARIA ELÉTRICA</div>
                    </div>
                )}
            </div>
        );

        const renderTitleBlock = () => (
            <div className="orcamento-title">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0 }}>{orcamento.projeto?.titulo || `ORÇAMENTO DE VENDA #${orcamento.numero}`}</h1>
                    <strong style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>ORÇAMENTO: {orcamento.numeroSequencial ?? orcamento.numero}</strong>
                </div>
                <div className="orcamento-details">
                    <div className="detail-item">
                        <label>Cliente:</label>
                        <strong>{orcamento.cliente?.nome || 'Cliente'}</strong>
                    </div>
                    <div className="detail-item">
                        <label>Emissão:</label>
                        <strong>{orcamento.emissao || orcamento.data || new Date().toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div className="detail-item">
                        <label>Validade:</label>
                        <strong>{orcamento.validade || '-'}</strong>
                    </div>
                    <div className="detail-item">
                        <label>Orçamentista:</label>
                        <strong>{orcamento.orcamentistaNome || 'Não identificado'}</strong>
                    </div>
                </div>
            </div>
        );

        const renderClienteBlock = () => (
            <div className="cliente-section">
                <div className="section-title">Dados do Cliente</div>
                <div className="cliente-info-grid">
                    <div className="cliente-info-item">
                        <div className="cliente-info-label">Nome:</div>
                        <div className="cliente-info-value">{orcamento.cliente.nome}</div>
                    </div>
                    {orcamento.cliente.cpfCnpj && (
                        <div className="cliente-info-item">
                            <div className="cliente-info-label">CPF/CNPJ:</div>
                            <div className="cliente-info-value">{orcamento.cliente.cpfCnpj}</div>
                        </div>
                    )}
                    {orcamento.cliente.email && (
                        <div className="cliente-info-item">
                            <div className="cliente-info-label">Email:</div>
                            <div className="cliente-info-value">{orcamento.cliente.email}</div>
                        </div>
                    )}
                    {orcamento.cliente.telefone && (
                        <div className="cliente-info-item">
                            <div className="cliente-info-label">Telefone:</div>
                            <div className="cliente-info-value">{orcamento.cliente.telefone}</div>
                        </div>
                    )}
                </div>
            </div>
        );

        const renderEnderecosBlock = () => (
            <div className="addresses-row">
                {(orcamento.enderecos?.cobranca || orcamento.cliente?.endereco) && (
                    <div className="address-box">
                        <div className="section-title">Endereço de Cobrança</div>
                        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            {orcamento.enderecos?.cobranca || (orcamento.cliente?.endereco && (orcamento.cliente as any)?.numero
                                ? `${orcamento.cliente.endereco}, ${(orcamento.cliente as any).numero}`
                                : orcamento.cliente?.endereco)}
                        </div>
                    </div>
                )}
                {(orcamento.enderecos?.obra || (orcamento as any).enderecoObra || orcamento.projeto?.enderecoObra) && (
                    <div className="address-box">
                        <div className="section-title">Endereço da Obra</div>
                        <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            {orcamento.enderecos?.obra || (() => {
                                const logradouro = (orcamento as any).enderecoObra || orcamento.projeto?.enderecoObra || '';
                                return logradouro + ((orcamento as any).numeroObra ? `, ${(orcamento as any).numeroObra}` : '');
                            })()}
                        </div>
                    </div>
                )}
            </div>
        );

        const renderItensSectionTitle = (continuacao: boolean) => (
            <div style={{ fontSize: '10px', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {continuacao ? 'Itens do Orçamento (continuação)' : 'Itens do Orçamento'}
            </div>
        );

        const renderItensTableHeader = () => (
            <thead>
                <tr>
                    <th>Descrição</th>
                    <th>Unid.</th>
                    <th>Qtd</th>
                    <th>Valor Unit.</th>
                    <th>Total</th>
                </tr>
            </thead>
        );

        const renderItensTableRow = (
            item: OrcamentoPDFData['items'][number],
            key: React.Key,
            opts?: { measure?: boolean }
        ) => (
            <tr key={key} {...(opts?.measure ? { 'data-measure': 'item-row' } : {})}>
                <td>
                    <div>{item.nome || 'Item'}</div>
                </td>
                <td>{item.unidade || 'UN'}</td>
                <td>{(item.quantidade || 0).toFixed(2)}</td>
                <td>{formatCurrencyBR(item.valorUnitario || 0)}</td>
                <td><strong>{formatCurrencyBR(item.valorTotal || 0)}</strong></td>
            </tr>
        );

        const renderItensTable = (pageItems: OrcamentoPDFData['items']) => (
            <div className="itens-section">
                <table className="itens-table">
                    {renderItensTableHeader()}
                    <tbody>
                        {pageItems.map((item, idx) => renderItensTableRow(item, `row-${idx}`))}
                    </tbody>
                </table>
            </div>
        );

        const renderTotaisBlock = () => {
            const qtdItens = items.length;
            const valorTotalItens = items.reduce((s, i) => s + (i.valorTotal || 0), 0);
            return (
                <div className="totais-section">
                    <div className="totais-row" style={{ marginBottom: '4px' }}>
                        <span>Quantidade: {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</span>
                        <span>Valor total dos itens R$ {valorTotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {(orcamento.financeiro?.desconto ?? 0) > 0 && (
                        <div className="totais-row">
                            <span>Desconto:</span>
                            <strong>- {formatCurrencyBR(orcamento.financeiro?.desconto || 0)}</strong>
                        </div>
                    )}
                    {(orcamento.financeiro?.impostos || 0) > 0 && (
                        <div className="totais-row">
                            <span>Impostos:</span>
                            <strong>{formatCurrencyBR(orcamento.financeiro?.impostos || 0)}</strong>
                        </div>
                    )}
                    <div className="totais-row total-final">
                        <span>VALOR TOTAL DO ORÇAMENTO:</span>
                        <span>{formatCurrencyBR(orcamento.financeiro?.valorTotal || 0)}</span>
                    </div>
                </div>
            );
        };

        const renderPagamentoBlock = () => (
            <div className="pagamento-section">
                <div className="section-title">Forma / Condições de Pagamento</div>
                <table className="pagamento-table">
                    <thead>
                        <tr>
                            <th>Condição</th>
                            <th>Observação</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>{orcamento.pagamento || orcamento.financeiro?.condicaoPagamento}</strong></td>
                            <td>Pagamento conforme condições acordadas</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );

        // === Cálculo do total de páginas do documento inteiro ===
        const itemsPagesCount = pagination.pages.length;
        const extraTotalsPageCount = pagination.totalsFitOnLast ? 0 : 1;
        const totalPages = itemsPagesCount + extraTotalsPageCount + (conteudoCombinado ? printRendererPagesCount : 0);
        const printRendererStartPageNumber = itemsPagesCount + extraTotalsPageCount + 1;
        const showPageNumbers = pageCountReceived && totalPages > 0;

        const renderPdfPage = (key: React.Key, content: React.ReactNode, pageNumber?: number) => (
            <div className="pdf-page" key={key}>
                {renderWatermark()}
                <div className="page-content">
                    <div className="page">
                        {content}
                    </div>
                </div>
                {showPageNumbers && pageNumber != null && (
                    <div className="page-number">
                        {pageNumber} / {totalPages}
                    </div>
                )}
            </div>
        );

        return (
            <div ref={ref}>
                <style>{`
                    @page {
                        size: A4;
                        margin: 95px 0 80px 0;
                    }

                    .print-container {
                        position: relative;
                        background: transparent;
                        margin: 0 auto;
                    }

                    .pdf-page {
                        position: relative;
                        width: 210mm;
                        min-height: 297mm;
                        background-color: white;
                        margin: 0 auto 20px auto;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        overflow: visible;
                        break-after: page;
                    }

                    .watermark-background {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 210mm;
                        height: 297mm;
                        z-index: 0;
                        pointer-events: none;
                    }

                    .watermark-background.custom-letterhead {
                        background-size: 100% 100%;
                        background-position: top left;
                        background-repeat: no-repeat;
                    }
                    
                    .page-content {
                        position: relative;
                        z-index: 1;
                        padding-top: 95px;
                        padding-left: 20px;
                        padding-right: 20px;
                        padding-bottom: 100px;
                        min-height: 297mm;
                        height: 297mm;
                        box-sizing: border-box;
                        overflow: visible;
                        display: flex;
                        flex-direction: column;
                    }

                    .page {
                        margin: 0;
                        padding: 0;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }

                    @media print {
                        * {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }

                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        @page {
                            size: A4;
                            margin: 95px 0 80px 0;
                        }

                        .print-container {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                        }

                        .pdf-page {
                            width: 210mm !important;
                            height: 297mm !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            page-break-after: always;
                            break-after: page;
                            overflow: hidden !important;
                        }

                        .pdf-page:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }

                        .page-content {
                            padding-top: 95px !important;
                            padding-bottom: 100px !important;
                            padding-left: 20px !important;
                            padding-right: 20px !important;
                        }

                        /* Cada página tem seu próprio watermark (absolute, não fixed) */
                        .watermark-background {
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 210mm !important;
                            height: 297mm !important;
                            background-size: 100% 100% !important;
                            background-position: top left !important;
                            background-repeat: no-repeat !important;
                        }

                        .page-break {
                            display: none !important;
                        }

                        .no-break {
                            page-break-inside: avoid;
                            break-inside: avoid;
                        }

                        .page-number {
                            display: block !important;
                        }

                        /* Forçar que PrintRenderer pages imprimam corretamente */
                        .printable-page {
                            width: 210mm !important;
                            height: 297mm !important;
                            margin: 0 !important;
                            box-shadow: none !important;
                            page-break-after: always !important;
                            break-after: page !important;
                            overflow: hidden !important;
                        }

                        .printable-page:last-child {
                            page-break-after: auto !important;
                            break-after: auto !important;
                        }
                    }

                    .watermark-center {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 140px;
                        font-weight: 900;
                        color: #1e40af;
                        opacity: ${opacidade};
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

                    .page {
                        max-width: 100%;
                        position: relative;
                        background: transparent;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 10pt;
                        line-height: 1.4;
                        color: #1e293b;
                    }

                    .orcamento-title {
                        background: transparent;
                        color: #1e293b;
                        padding: 8px 0;
                        margin-bottom: 8px;
                        border-bottom: 2px solid #1e293b;
                    }

                    .orcamento-title h1 {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 6px;
                    }

                    .orcamento-details {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        grid-template-rows: auto auto;
                        gap: 8px;
                        font-size: 10px;
                    }

                    .detail-item label {
                        display: block;
                        opacity: 0.7;
                        margin-bottom: 2px;
                        font-size: 9px;
                    }

                    .detail-item strong {
                        font-size: 10px;
                    }

                    .section-title {
                        font-size: 11px;
                        font-weight: bold;
                        color: #1e293b;
                        margin-bottom: 6px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }

                    .cliente-section {
                        background: transparent;
                        padding: 6px 0;
                        margin-bottom: 8px;
                        border: none;
                    }

                    .cliente-info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px 12px;
                        font-size: 12px;
                        line-height: 1.4;
                    }

                    .cliente-info-item {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                    }

                    .cliente-info-label {
                        font-size: 9px;
                        color: #64748b;
                        font-weight: normal;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                    }

                    .cliente-info-value {
                        font-weight: bold;
                        color: #1e293b;
                        font-size: 11px;
                    }

                    .addresses-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        margin-bottom: 8px;
                    }

                    .address-box {
                        background: transparent;
                        padding: 6px 0;
                        border: none;
                    }

                    table.itens-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 8px;
                        font-size: 11px;
                    }

                    table.itens-table thead {
                        background: transparent;
                        color: #1e293b;
                    }

                    table.itens-table th {
                        padding: 6px 4px;
                        text-align: left;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                        font-size: 10px;
                        border-bottom: 1px solid #cbd5e1;
                    }

                    table.itens-table th:nth-child(2),
                    table.itens-table th:nth-child(3),
                    table.itens-table th:nth-child(4),
                    table.itens-table th:nth-child(5) {
                        text-align: right;
                    }

                    table.itens-table td {
                        padding: 6px 4px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 11px;
                        background: transparent;
                    }

                    table.itens-table td:nth-child(2),
                    table.itens-table td:nth-child(3),
                    table.itens-table td:nth-child(4),
                    table.itens-table td:nth-child(5) {
                        text-align: right;
                    }

                    .totais-section {
                        background: transparent;
                        padding: 8px 0;
                        margin-bottom: 8px;
                    }

                    .totais-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                        font-size: 11px;
                    }

                    .totais-row.total-final {
                        border-top: 2px solid #1e293b;
                        margin-top: 4px;
                        padding-top: 6px;
                        font-size: 13px;
                        font-weight: bold;
                        color: #1e293b;
                    }

                    .pagamento-section {
                        margin-bottom: 12px;
                    }

                    table.pagamento-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 6px;
                        font-size: 11px;
                    }

                    table.pagamento-table thead {
                        background: transparent;
                        color: #1e293b;
                    }

                    table.pagamento-table tbody tr {
                        background: transparent;
                    }

                    table.pagamento-table th {
                        padding: 4px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 1px solid #cbd5e1;
                        font-size: 10px;
                    }

                    table.pagamento-table td {
                        padding: 4px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 11px;
                    }

                    .descricao-section {
                        background: transparent;
                        padding: 0;
                        margin-bottom: 0;
                        border: none;
                        display: flex;
                        flex-direction: column;
                        max-height: 100%;
                    }

                    .descricao-content {
                        color: #1e293b;
                        font-size: 11px;
                        line-height: 1.6;
                        margin-top: 8px;
                        overflow: hidden;
                    }

                    .descricao-content img {
                        max-width: 100%;
                        max-height: 150px;
                        height: auto;
                        margin: 8px 0;
                        border-radius: 4px;
                        object-fit: contain;
                    }

                    .descricao-content ul, .descricao-content ol {
                        margin: 8px 0 8px 20px;
                    }

                    /* Bullet/número e texto na mesma linha (Tiptap gera <li><p>...</p></li>) */
                    .section ul li p, .section ol li p,
                    .descricao-content ul li p, .descricao-content ol li p {
                        display: inline !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .descricao-content table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }

                    .descricao-content table td, .descricao-content table th {
                        border: 1px solid #cbd5e1;
                        padding: 6px;
                    }

                    .descricao-content h2, .descricao-content h3 {
                        margin: 12px 0 8px 0;
                        color: #0c4a6e;
                        font-size: 13px;
                    }

                    .descricao-content p {
                        margin: 8px 0;
                    }

                    .observacoes-section {
                        background: transparent;
                        padding: 0;
                        border: none;
                        margin-bottom: 16px;
                    }

                    .observacoes-content {
                        color: #1e293b;
                        font-size: 11px;
                        line-height: 1.6;
                        margin-top: 8px;
                    }

                    .page-number {
                        position: absolute;
                        bottom: 30.5px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 12px;
                        font-weight: 700;
                        color: #000000;
                        z-index: 2;
                    }

                    .page-footer-space {
                        height: 80px;
                        flex-shrink: 0;
                    }

                    /* Host invisível usado apenas para medir alturas dos blocos. */
                    .measure-host {
                        position: fixed;
                        left: -99999px;
                        top: 0;
                        width: ${CONTENT_WIDTH_PX}px;
                        visibility: hidden;
                        pointer-events: none;
                        z-index: -1;
                    }

                    /* Dark mode: preview = documento A4 (só background-color p/ não apagar folha timbrada) */
                    .dark .print-container .pdf-page {
                        background-color: #fff !important;
                        color: #1e293b !important;
                    }
                    .dark .print-container .watermark-background.custom-letterhead {
                        background-color: transparent !important;
                    }
                    .dark .print-container .watermark-center {
                        opacity: ${opacidade} !important;
                        color: #1e40af !important;
                    }
                    .dark .print-container .watermark-subtitle {
                        color: #1e40af !important;
                    }
                    .dark .print-container .pdf-page thead,
                    .dark .print-container .pdf-page thead th,
                    .dark .print-container .pdf-page tbody,
                    .dark .print-container .pdf-page tbody tr,
                    .dark .print-container .pdf-page tbody td {
                        background-color: transparent !important;
                        background-image: none !important;
                        color: #1e293b !important;
                    }
                    .dark .print-container .pdf-page tbody tr:hover {
                        background-color: transparent !important;
                    }
                    .dark .print-container .orcamento-title,
                    .dark .print-container .section-title,
                    .dark .print-container .cliente-info-value,
                    .dark .print-container .totais-row.total-final,
                    .dark .print-container .descricao-content,
                    .dark .print-container .observacoes-content,
                    .dark .print-container .page-content,
                    .dark .print-container .page-content p,
                    .dark .print-container .page-content span,
                    .dark .print-container .page-content strong,
                    .dark .print-container .page-content td,
                    .dark .print-container .page-content th {
                        color: #1e293b !important;
                    }
                    .dark .print-container .detail-item label,
                    .dark .print-container .cliente-info-label {
                        color: #64748b !important;
                    }
                `}</style>

                {/* Host invisível para medir alturas reais dos blocos (header pg1, header pgN, totais, pagamento, cada <tr>) */}
                <div className="measure-host" aria-hidden="true" ref={measureRef}>
                    <div className="page" style={{ width: '100%', maxWidth: '100%' }}>
                        <div data-measure="header-pg1">
                            {renderTitleBlock()}
                            {renderClienteBlock()}
                            {hasEnderecos && renderEnderecosBlock()}
                            <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #000000' }} />
                            {renderItensSectionTitle(false)}
                            <table className="itens-table">
                                {renderItensTableHeader()}
                            </table>
                        </div>
                        <div data-measure="header-pgn">
                            {renderItensSectionTitle(true)}
                            <table className="itens-table">
                                {renderItensTableHeader()}
                            </table>
                        </div>
                        <table className="itens-table">
                            <tbody>
                                {items.map((item, i) =>
                                    renderItensTableRow(item, `measure-row-${i}`, { measure: true })
                                )}
                            </tbody>
                        </table>
                        <div data-measure="totais">{renderTotaisBlock()}</div>
                        {hasPagamento && <div data-measure="pagamento">{renderPagamentoBlock()}</div>}
                    </div>
                </div>

                <div className="print-container">
                    {pagination.pages.map((indices, pageIdx) => {
                        const isLastItemsPage = pageIdx === pagination.pages.length - 1;
                        const pageItems = indices.map(i => items[i]).filter(Boolean);
                        const pageNumber = pageIdx + 1;
                        return renderPdfPage(`items-pg-${pageIdx}`, (
                            <>
                                {pageIdx === 0 ? (
                                    <>
                                        {renderTitleBlock()}
                                        {renderClienteBlock()}
                                        {hasEnderecos && renderEnderecosBlock()}
                                        <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #000000' }} />
                                        {renderItensSectionTitle(false)}
                                    </>
                                ) : (
                                    renderItensSectionTitle(true)
                                )}
                                {renderItensTable(pageItems)}
                                {isLastItemsPage && pagination.totalsFitOnLast && (
                                    <>
                                        {renderTotaisBlock()}
                                        {hasPagamento && renderPagamentoBlock()}
                                    </>
                                )}
                            </>
                        ), pageNumber);
                    })}

                    {!pagination.totalsFitOnLast && renderPdfPage('totais-pgto-extra', (
                        <>
                            {renderTotaisBlock()}
                            {hasPagamento && renderPagamentoBlock()}
                        </>
                    ), itemsPagesCount + 1)}

                    {conteudoCombinado && (
                        <PrintRenderer
                            content={conteudoCombinado}
                            folhaTimbradaUrl={folhaTimbradaUrl}
                            opacidade={opacidade}
                            className="technical-content-pages"
                            pageNumberStartFrom={showPageNumbers ? printRendererStartPageNumber : undefined}
                            totalPages={showPageNumbers ? totalPages : undefined}
                            onPagesComputed={handlePrintRendererPagesComputed}
                        />
                    )}
                </div>
            </div>
        );
    }
);

OrcamentoPrintable.displayName = 'OrcamentoPrintable';

export default OrcamentoPrintable;
