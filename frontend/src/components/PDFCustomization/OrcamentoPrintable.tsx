import React, { useMemo } from 'react';
import { OrcamentoPDFData } from '../../types/pdfCustomization';
import PrintRenderer from '../PrintRenderer';
import { ensureHtml, normalizeEmptyParagraphsForPdf, normalizeListItemsForPdf } from '../../utils/tipTapUtils';

interface OrcamentoPrintableProps {
    orcamento: OrcamentoPDFData;
    folhaTimbradaUrl?: string;
    opacidade?: number;
}

const OrcamentoPrintable = React.forwardRef<HTMLDivElement, OrcamentoPrintableProps>(
    ({ orcamento, folhaTimbradaUrl, opacidade = 0.05 }, ref) => {
        
        // Preparar conteúdo combinado para o PrintRenderer
        const conteudoCombinado = useMemo(() => {
            const partes: string[] = [];

            const normalizeForPdf = (raw: any) => {
                const html = ensureHtml(raw);
                // Ordem importa:
                // 1) manter bullets na mesma linha (li/p)
                // 2) preservar ENTER ENTER (parágrafos vazios)
                return normalizeEmptyParagraphsForPdf(normalizeListItemsForPdf(html));
            };
            
            // Adicionar descrição geral se existir
            if (orcamento.descricaoGeral) {
                partes.push(`
                    <div class="section">
                        <h2>Descrição Geral</h2>
                        ${normalizeForPdf(orcamento.descricaoGeral)}
                    </div>
                `);
            }
            
            // Adicionar descrição técnica se existir
            if (orcamento.descricaoTecnica) {
                partes.push(`
                    <div class="section">
                        <h2>Descrição Técnica do Projeto</h2>
                        ${normalizeForPdf(orcamento.descricaoTecnica)}
                    </div>
                `);
            }
            
            // Adicionar observações se existir
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
                        background: white;
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
                        bottom: 30px;
                        right: 30px;
                        font-size: 9px;
                        color: #64748b;
                        z-index: 2;
                    }

                    .page-footer-space {
                        height: 80px;
                        flex-shrink: 0;
                    }

                    /* Dark mode: preview do PDF sempre como documento legível (fundo branco, texto opaco) */
                    .dark .print-container .pdf-page {
                        background: #fff !important;
                    }
                    .dark .print-container .pdf-page *,
                    .dark .print-container .page *,
                    .dark .print-container .page-content * {
                        color: #1e293b !important;
                        opacity: 1 !important;
                    }
                    .dark .print-container .orcamento-title,
                    .dark .print-container .section-title,
                    .dark .print-container .cliente-info-value,
                    .dark .print-container .totais-row.total-final,
                    .dark .print-container .descricao-content,
                    .dark .print-container .observacoes-content {
                        color: #1e293b !important;
                    }
                    .dark .print-container .detail-item label,
                    .dark .print-container .cliente-info-label {
                        color: #64748b !important;
                        opacity: 1 !important;
                    }
                `}</style>

                <div className="print-container">
                    {/* PÁGINA 1: Dados do Orçamento */}
                    <div className="pdf-page">
                        {/* Folha Timbrada */}
                        <div 
                            className={`watermark-background${folhaTimbradaUrl ? ' custom-letterhead' : ''}`}
                            style={folhaTimbradaUrl ? {
                                backgroundImage: `url('${folhaTimbradaUrl}')`
                            } : undefined}
                        >
                            {!folhaTimbradaUrl && (
                                <div className="watermark-center">
                                    S3E
                                    <div className="watermark-subtitle">ENGENHARIA ELÉTRICA</div>
                                </div>
                            )}
                        </div>

                        <div className="page-content">
                            <div className="page">
                    {/* Renderizar conteúdo do orçamento aqui: título e número na mesma linha; ORÇAMENTO: [número] em 14px negrito */}
                    <div className="orcamento-title no-break">
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

                    {/* Cliente */}
                    <div className="cliente-section no-break">
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

                    {/* Endereços (logradouro + número) */}
                    {(orcamento.enderecos?.obra || orcamento.enderecos?.cobranca || orcamento.cliente?.endereco || orcamento.enderecoObra || orcamento.projeto?.enderecoObra) && (
                        <div className="addresses-row no-break">
                            {(orcamento.enderecos?.cobranca || orcamento.cliente?.endereco) && (
                                <div className="address-box">
                                    <div className="section-title">Endereço de Cobrança</div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                        {orcamento.enderecos?.cobranca || (orcamento.cliente?.endereco && orcamento.cliente?.numero
                                            ? `${orcamento.cliente.endereco}, ${orcamento.cliente.numero}`
                                            : orcamento.cliente?.endereco)}
                                    </div>
                                </div>
                            )}
                            {(orcamento.enderecos?.obra || orcamento.enderecoObra || orcamento.projeto?.enderecoObra) && (
                                <div className="address-box">
                                    <div className="section-title">Endereço da Obra</div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                        {orcamento.enderecos?.obra || (() => {
                                            const logradouro = orcamento.enderecoObra || orcamento.projeto?.enderecoObra || '';
                                            return logradouro + (orcamento.numeroObra ? `, ${orcamento.numeroObra}` : '');
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Linha separadora */}
                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #000000' }} />

                    {/* Itens do Orçamento */}
                    <div className="itens-section">
                        <div style={{ fontSize: '10px', color: '#1e293b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            Itens do Orçamento
                        </div>
                        <table className="itens-table no-break">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Unid.</th>
                                    <th>Qtd</th>
                                    <th>Valor Unit.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(orcamento.items || []).map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <div>{item.nome || 'Item'}</div>
                                        </td>
                                        <td>{item.unidade || 'UN'}</td>
                                        <td>{(item.quantidade || 0).toFixed(2)}</td>
                                        <td>R$ {(item.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td><strong>R$ {(item.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totais */}
                    <div className="totais-section no-break">
                        {(() => {
                            const qtdItens = (orcamento.items || []).length;
                            const valorTotalItens = (orcamento.items || []).reduce((s, i) => s + (i.valorTotal || 0), 0);
                            return (
                                <div className="totais-row" style={{ marginBottom: '4px' }}>
                                    <span>Quantidade: {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}</span>
                                    <span>Valor total dos itens R$ {valorTotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            );
                        })()}
                        {(orcamento.financeiro?.desconto ?? 0) > 0 && (
                            <div className="totais-row">
                                <span>Desconto:</span>
                                <strong>- R$ {(orcamento.financeiro?.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                        )}
                        {(orcamento.financeiro?.impostos || 0) > 0 && (
                            <div className="totais-row">
                                <span>Impostos:</span>
                                <strong>R$ {(orcamento.financeiro?.impostos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                        )}
                        <div className="totais-row total-final">
                            <span>VALOR TOTAL DO ORÇAMENTO:</span>
                            <span>R$ {(orcamento.financeiro?.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Forma de Pagamento */}
                    {(orcamento.pagamento || orcamento.financeiro?.condicaoPagamento) && (
                        <div className="pagamento-section no-break">
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
                    )}

                            </div>
                        </div>
                    </div>

                    {/* PÁGINAS SEGUINTES: Descrições Técnicas com PrintRenderer */}
                    {conteudoCombinado && (
                        <PrintRenderer
                            content={conteudoCombinado}
                            folhaTimbradaUrl={folhaTimbradaUrl}
                            opacidade={opacidade}
                            className="technical-content-pages"
                        />
                    )}
                </div>
            </div>
        );
    }
);

OrcamentoPrintable.displayName = 'OrcamentoPrintable';

export default OrcamentoPrintable;
