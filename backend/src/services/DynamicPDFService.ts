import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { PDFCustomization, OrcamentoPDFData } from '../types/pdfCustomization';

export class DynamicPDFService {
    /**
     * Gera HTML dinâmico baseado nas customizações
     */
    private generateHTML(orcamentoData: OrcamentoPDFData, customization: PDFCustomization): string {
        const { watermark, design, content } = customization;

        // Template HTML/CSS inline
        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {
                    size: ${design.pageSize};
                    margin: ${design.margins.top}mm ${design.margins.right}mm ${design.margins.bottom}mm ${design.margins.left}mm;
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: ${design.typography.fontFamily}, sans-serif;
                    font-size: ${design.typography.fontSize === 'small' ? '10px' : design.typography.fontSize === 'large' ? '14px' : '12px'};
                    color: ${design.colors.text};
                    background: ${design.colors.background};
                    position: relative;
                }
                
                /* Marca d'Água */
                .watermark {
                    position: fixed;
                    ${watermark.position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%)' : ''}
                    ${watermark.position === 'diagonal' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%)' : ''}
                    ${watermark.position === 'header' ? 'top: 30mm; left: 50%; transform: translateX(-50%)' : ''}
                    ${watermark.position === 'footer' ? 'bottom: 30mm; left: 50%; transform: translateX(-50%)' : ''}
                    opacity: ${watermark.opacity};
                    z-index: 0;
                    pointer-events: none;
                    transform: ${watermark.position === 'diagonal' ? `translate(-50%, -50%) rotate(${watermark.rotation}deg)` : watermark.position === 'center' ? `translate(-50%, -50%) rotate(${watermark.rotation}deg)` : 'none'};
                }
                
                .watermark img {
                    max-width: ${watermark.size === 'small' ? '200px' : watermark.size === 'large' ? '500px' : '350px'};
                    max-height: ${watermark.size === 'small' ? '200px' : watermark.size === 'large' ? '500px' : '350px'};
                }
                
                .watermark-text {
                    font-size: ${watermark.size === 'small' ? '48px' : watermark.size === 'large' ? '96px' : '72px'};
                    font-weight: bold;
                    color: ${watermark.color || '#cccccc'};
                }
                
                /* Designs nos Cantos */
                .corner-design {
                    position: fixed;
                    width: ${design.corners.size}px;
                    height: ${design.corners.size}px;
                    opacity: ${design.corners.opacity};
                    color: ${design.colors.primary};
                }
                
                .corner-top-left { top: 0; left: 0; }
                .corner-top-right { top: 0; right: 0; transform: scaleX(-1); }
                .corner-bottom-left { bottom: 0; left: 0; transform: scaleY(-1); }
                .corner-bottom-right { bottom: 0; right: 0; transform: scale(-1); }
                
                .content {
                    position: relative;
                    z-index: 1;
                    padding: 20px;
                }
                
                /* Header */
                .header {
                    border-bottom: 3px solid ${design.colors.primary};
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                
                .company-name {
                    font-size: 28px;
                    font-weight: bold;
                    color: ${design.colors.primary};
                    margin-bottom: 5px;
                }
                
                .company-subtitle {
                    font-size: 14px;
                    color: ${design.colors.secondary};
                }
                
                /* Títulos */
                h1, h2, h3 {
                    color: ${design.colors.primary};
                    margin: 15px 0 10px 0;
                }
                
                h1 { font-size: 24px; }
                h2 { font-size: 18px; color: ${design.colors.secondary}; }
                h3 { font-size: 14px; }
                
                /* Tabelas */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                
                th {
                    background-color: ${design.colors.primary};
                    color: white;
                    padding: 10px;
                    text-align: left;
                    font-weight: bold;
                }
                
                td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                /* Removido background alternado das linhas */
                
                .total-row {
                    font-weight: bold;
                    font-size: 16px;
                }
                
                .total-value {
                    color: ${design.colors.accent};
                    font-size: 24px;
                }
                
                /* Footer */
                .footer {
                    border-top: 2px solid ${design.colors.secondary};
                    padding-top: 15px;
                    margin-top: 30px;
                    text-align: center;
                    font-size: 10px;
                    color: ${design.colors.text};
                }
                
                .signature-area {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-around;
                }
                
                .signature-box {
                    text-align: center;
                    width: 200px;
                }
                
                .signature-line {
                    border-top: 1px solid #000;
                    margin-top: 60px;
                    padding-top: 5px;
                }
                
                .info-box {
                    border-left: 4px solid ${design.colors.primary};
                    padding: 12px;
                    margin: 15px 0;
                }
                
                /* Controle de quebra de página */
                .description-summary {
                    page-break-after: avoid;
                    page-break-inside: avoid;
                    page-break-before: avoid;
                }
                
                .description-technical {
                    page-break-before: always;
                    page-break-inside: auto;
                }
            </style>
        </head>
        <body>
            <!-- Marca d'Água -->
            ${watermark.type !== 'none' ? `
                <div class="watermark">
                    ${watermark.type === 'logo' && watermark.content ? `<img src="${watermark.content}" alt="Watermark">` : ''}
                    ${watermark.type === 'text' && watermark.content ? `<div class="watermark-text">${watermark.content}</div>` : ''}
                </div>
            ` : ''}
            
            <!-- Designs nos Cantos -->
            ${design.corners.enabled && design.corners.design !== 'none' ? `
                ${this.getCornerDesignSVG(design.corners.design, 'corner-top-left')}
                ${this.getCornerDesignSVG(design.corners.design, 'corner-top-right')}
                ${this.getCornerDesignSVG(design.corners.design, 'corner-bottom-left')}
                ${this.getCornerDesignSVG(design.corners.design, 'corner-bottom-right')}
            ` : ''}
            
            <div class="content">
                <!-- Header da Empresa -->
                ${content.showCompanyHeader ? `
                    <div class="header">
                        <div class="company-name">${orcamentoData.empresa?.nome || 'S3E Engenharia'}</div>
                        <div class="company-subtitle">Soluções em Engenharia Elétrica</div>
                    </div>
                ` : ''}
                
                <!-- Informações do Orçamento -->
                <h1>ORÇAMENTO ${orcamentoData.numero}</h1>
                <div class="info-box">
                    <strong>Projeto:</strong> ${orcamentoData.projeto.titulo}<br>
                    <strong>Data:</strong> ${orcamentoData.data} | <strong>Validade:</strong> ${orcamentoData.validade}
                </div>
                
                <!-- Descrição Resumida (sempre na primeira página) -->
                ${orcamentoData.projeto.descricao ? `
                    <div class="description-summary">
                        <h2>Descrição do Projeto</h2>
                        <p>${orcamentoData.projeto.descricao}</p>
                    </div>
                ` : ''}
                
                <!-- Dados do Cliente -->
                <h2>Cliente</h2>
                <p><strong>${orcamentoData.cliente.nome}</strong></p>
                <p>CPF/CNPJ: ${orcamentoData.cliente.cpfCnpj}</p>
                ${orcamentoData.projeto.enderecoObra ? `<p>Endereço da Obra: ${orcamentoData.projeto.enderecoObra}${orcamentoData.projeto.bairro ? ', ' + orcamentoData.projeto.bairro : ''}${orcamentoData.projeto.cidade ? ', ' + orcamentoData.projeto.cidade : ''}${orcamentoData.projeto.cep ? ' - CEP: ' + orcamentoData.projeto.cep : ''}</p>` : ''}
                ${orcamentoData.cliente.telefone ? `<p>Telefone: ${orcamentoData.cliente.telefone}</p>` : ''}
                
                <!-- Itens do Orçamento -->
                <h2>Itens do Orçamento</h2>
                <table>
                    <thead>
                        <tr>
                            ${content.showItemCodes ? '<th>Código</th>' : ''}
                            <th>Descrição</th>
                            <th>Unid.</th>
                            <th>Qtd.</th>
                            <th>Valor Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orcamentoData.items.map(item => `
                            <tr>
                                ${content.showItemCodes ? `<td style="font-size: 14px;">${item.codigo || '-'}</td>` : ''}
                                <td style="font-size: 14px;">${item.nome}${content.showTechnicalDescriptions && item.descricao ? `<br><small style="color: #666; font-size: 12px;">${item.descricao}</small>` : ''}</td>
                                <td style="font-size: 14px;">${item.unidade}</td>
                                <td style="font-size: 14px;">${item.quantidade}</td>
                                <td style="font-size: 14px;">R$ ${item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td style="font-size: 14px;">R$ ${item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Resumo Financeiro */}
                <div style="margin-top: 20px;">
                    <table style="width: 50%; margin-left: auto;">
                        <tr>
                            <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
                            <td style="text-align: right; padding: 5px;">R$ ${orcamentoData.financeiro.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        <tr>
                            <td style="text-align: right; padding: 5px;"><strong>BDI (${orcamentoData.financeiro.bdi}%):</strong></td>
                            <td style="text-align: right; padding: 5px;">R$ ${(orcamentoData.financeiro.valorComBDI - orcamentoData.financeiro.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        ${orcamentoData.financeiro.desconto > 0 ? `
                        <tr>
                            <td style="text-align: right; padding: 5px;"><strong>Desconto:</strong></td>
                            <td style="text-align: right; padding: 5px; color: red;">-R$ ${orcamentoData.financeiro.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        ` : ''}
                        ${orcamentoData.financeiro.impostos > 0 ? `
                        <tr>
                            <td style="text-align: right; padding: 5px;"><strong>Impostos:</strong></td>
                            <td style="text-align: right; padding: 5px;">R$ ${orcamentoData.financeiro.impostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        ` : ''}
                        <tr class="total-row">
                            <td style="text-align: right; padding: 10px;"><strong>VALOR TOTAL:</strong></td>
                            <td style="text-align: right; padding: 10px;" class="total-value">R$ ${orcamentoData.financeiro.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </table>
                </div>
                
                ${content.showPaymentInfo ? `
                    <div class="info-box" style="margin-top: 20px;">
                        <strong>Condição de Pagamento:</strong> ${orcamentoData.financeiro.condicaoPagamento}
                    </div>
                ` : ''}
                
                ${orcamentoData.observacoes && content.showTechnicalDescriptions ? `
                    <div class="description-technical">
                        <h2>Descrição Técnica e Observações</h2>
                        <p>${orcamentoData.observacoes}</p>
                    </div>
                ` : ''}
                
                ${content.includeSafetyWarnings ? `
                    <div class="info-box" style="border-left-color: #F59E0B; margin-top: 20px;">
                        <strong>⚠️ Avisos de Segurança:</strong><br>
                        • Todos os serviços devem ser executados por profissionais qualificados.<br>
                        • Siga as normas técnicas NBR 5410 e NR-10.<br>
                        • Utilize EPIs adequados durante a execução.
                    </div>
                ` : ''}
                
                ${content.showSignatures ? `
                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="signature-line">
                                <strong>S3E Engenharia</strong><br>
                                Responsável Técnico
                            </div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line">
                                <strong>${orcamentoData.cliente.nome}</strong><br>
                                Cliente
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${content.showCompanyFooter ? `
                    <div class="footer">
                        <p><strong>${orcamentoData.empresa?.nome || 'S3E Engenharia'}</strong></p>
                        <p>${orcamentoData.empresa?.cnpj || 'CNPJ: 00.000.000/0000-00'} | contato@s3e.com.br | (48) 0000-0000</p>
                    </div>
                ` : ''}
            </div>
        </body>
        </html>
        `;

        return htmlTemplate;
    }

    /**
     * Retorna SVG dos designs de cantos
     */
    private getCornerDesignSVG(design: string, className: string): string {
        const svgs: Record<string, string> = {
            geometric: '<svg class="corner-design ' + className + '" viewBox="0 0 100 100"><path d="M0,0 L100,0 L0,100 Z" fill="currentColor"/></svg>',
            curves: '<svg class="corner-design ' + className + '" viewBox="0 0 100 100"><path d="M0,0 Q100,0 100,100 L0,100 Z" fill="currentColor"/></svg>',
            lines: '<svg class="corner-design ' + className + '" viewBox="0 0 100 100"><g><line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" stroke-width="3"/><line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" stroke-width="3"/></g></svg>'
        };

        return svgs[design] || '';
    }

    /**
     * Gera PDF usando Puppeteer
     */
    async generatePDF(orcamentoData: OrcamentoPDFData, customization: PDFCustomization): Promise<Buffer> {
        let browser;

        try {
            console.log('🚀 Iniciando geração de PDF personalizado...');

            // Gerar HTML
            const html = this.generateHTML(orcamentoData, customization);

            // Iniciar Puppeteer
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Configurar conteúdo
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            // Gerar PDF
            const pdfBuffer = await page.pdf({
                format: customization.design.pageSize === 'Letter' ? 'Letter' : 'A4',
                printBackground: true,
                margin: {
                    top: `${customization.design.margins.top}mm`,
                    right: `${customization.design.margins.right}mm`,
                    bottom: `${customization.design.margins.bottom}mm`,
                    left: `${customization.design.margins.left}mm`
                }
            });

            console.log('✅ PDF gerado com sucesso!');

            return Buffer.from(pdfBuffer);
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            throw new Error('Erro ao gerar PDF personalizado');
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

export default new DynamicPDFService();

