import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();

export class PDFOrcamentoService {
    /**
     * Gera PDF usando Puppeteer
     */
    static async gerarPDF(orcamentoId: string, marcaDaguaConfig?: {
        tipo: 'imagem' | 'texto' | 'template';
        opacidade?: number;
        posicao?: string;
        tamanho?: string;
        logoUrl?: string;
        folhaTimbradaUrl?: string;
    }): Promise<Buffer> {
        const html = await this.gerarHTMLOrcamento(orcamentoId, marcaDaguaConfig);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            
            // Configurar para ignorar erros de rede e carregamento de recursos
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                // Permitir apenas document e stylesheet
                if (['document', 'stylesheet', 'font'].includes(request.resourceType())) {
                    request.continue();
                } else {
                    request.abort();
                }
            });
            
            // Definir timeout menor e waitUntil mais permissivo
            await page.setContent(html, { 
                waitUntil: 'domcontentloaded',
                timeout: 10000 
            });
            
            // Aguardar um pouco para fontes carregarem
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '0mm',
                    right: '0mm',
                    bottom: '0mm',
                    left: '0mm'
                }
            });
            
            return Buffer.from(pdfBuffer);
        } finally {
            await browser.close();
        }
    }

    /**
     * Gera HTML profissional para PDF de orçamento com folha timbrada S3E
     */
    static async gerarHTMLOrcamento(orcamentoId: string, marcaDaguaConfig?: {
        tipo: 'imagem' | 'texto' | 'template';
        opacidade?: number;
        posicao?: string;
        tamanho?: string;
        logoUrl?: string;
        folhaTimbradaUrl?: string;
    }) {
        // Buscar orçamento completo com todas as relações
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                cliente: true,
                items: {
                    include: {
                        material: true,
                        kit: true
                    }
                }
            }
        });

        if (!orcamento) {
            throw new Error('Orçamento não encontrado');
        }

        // Configurações da empresa
        const empresa = {
            nome: 'S3E ENGENHARIA ELÉTRICA',
            razaoSocial: 'S3E SERVICOS DE MANUTENCAO ELETRICA LTDA',
            cnpj: '16.625.927/0001-57',
            endereco: 'Rua Blumenau, 1622',
            bairro: 'Barra do Rio',
            cidade: 'Itajaí',
            estado: 'SC',
            cep: '88305-104',
            telefone: '(47) 3083-6361',
            email: 'contato@s3e.com.br'
        };

        const opacidadeMarcaDagua = marcaDaguaConfig?.opacidade || 0.05;
        const logoUrl = marcaDaguaConfig?.logoUrl;
        const folhaTimbradaUrl = marcaDaguaConfig?.folhaTimbradaUrl;

        // Gerar HTML com template profissional e folha timbrada
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orçamento ${orcamento.numeroSequencial}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4;
            margin: 0;
        }

        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #1e293b;
            background: transparent;
            position: relative;
            margin: 0;
            padding: 0;
        }

        /* === FOLHA TIMBRADA / MARCA D'ÁGUA === */
        .watermark-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
        }

        .watermark-background.custom-letterhead {
            background-image: var(--letterhead-url);
            background-size: 210mm 297mm;
            background-position: top left;
            background-repeat: repeat-y;
        }

        .watermark-background.custom-letterhead > * {
            display: none !important;
        }


        /* === SPACER FIXO NO TOPO E RODAPÉ DE TODAS AS PÁGINAS === */
        .page-top-spacer {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 95px;
            min-height: 95px;
            background: transparent;
            z-index: -2;
            pointer-events: none;
            display: block;
        }


        .page-bottom-spacer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 80px;
            min-height: 80px;
            background: transparent;
            z-index: -2;
            pointer-events: none;
            display: block;
        }

        /* Garantir que a folha timbrada apareça em todas as páginas */
        @media print {
            .watermark-background {
                position: fixed !important;
            }

            .page-top-spacer {
                position: fixed !important;
                top: 0 !important;
                height: 95px !important;
                display: block !important;
            }


            .page-bottom-spacer {
                position: fixed !important;
                bottom: 0 !important;
                height: 80px !important;
                display: block !important;
            }

            /* Garantir margin-top de 95px e margin-bottom de 80px em TODAS as páginas */
            @page {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
            }

            @page :first {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
            }

            /* Garantir que TODAS as páginas subsequentes também tenham as margens */
            @page :left {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            @page :right {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            /* Mantém o padding-top da div .page para a primeira página */
            body > .page {
                padding-top: 95px;
                padding-bottom: 80px;
                min-height: calc(100vh - 95px - 80px);
            }

            /* Quando descrição técnica quebra para nova página, o spacer fixo cuida do espaçamento */
            .descricoes-wrapper {
                padding-top: 95px;
                padding-bottom: 80px;
            }

            /* Garantir que tabelas não quebrem mal */
            table, thead, tbody, tr {
                page-break-inside: avoid !important;
            }

            /* Imagens não podem quebrar no meio */
            img {
                page-break-inside: avoid !important;
                page-break-before: auto !important;
                page-break-after: auto !important;
            }

        }

        /* Cantos decorativos superiores */
        .corner-top-left {
            position: absolute;
            top: 0;
            left: 0;
            width: 300px;
            height: 150px;
        }

        /* Cantos decorativos inferiores */
        .corner-bottom-right {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 300px;
            height: 150px;
        }

        /* Logo central como marca d'água */
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

        /* === PÁGINA === */
        .page {
            max-width: 100%;
            margin: 0 15px;

            padding: 95px 15px 80px 15px;
            position: relative;
            background: transparent;
            min-height: calc(100vh - 95px - 80px);
        }

        /* Adicionar padding-top em elementos que podem começar após quebra de página */
        .descricao-content,
        .observacoes-content {
            position: relative;
        }


        /* Garantir padding-top e padding-bottom em todas as páginas após quebra de página */
        @media print {
            /* Aplicar margin-top de 95px e margin-bottom de 80px em TODAS as páginas */
            @page {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            /* Primeira página também deve ter as margens */
            @page :first {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            /* Garantir que TODAS as páginas subsequentes também tenham as margens */
            @page :left {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            @page :right {
                margin-top: 95px !important;
                margin-bottom: 80px !important;
            }

            /* Garantir que qualquer quebra de página tenha padding-top e padding-bottom */
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }

        /* Evitar quebra de página dentro de elementos importantes */
        .orcamento-title,
        .cliente-section,
        .address-box,
        .descricao-section,
        .totais-section,
        .pagamento-section,
        .observacoes-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        /* Permitir quebra antes das descrições longas se necessário */
        .descricao-section {
            page-break-before: auto;
            break-before: auto;
        }

        /* Tabela - evitar quebra no meio das linhas */
        table.itens-table {
            page-break-before: auto;
            break-before: auto;
        }

        table.itens-table thead {
            page-break-after: avoid;
            break-after: avoid;
        }

        table.itens-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        table.itens-table tbody {
            page-break-before: auto;
            break-before: auto;
        }

        /* Espaçamento entre seções para melhor quebra */
        .cliente-section,
        .addresses-row,
        .itens-section,
        .totais-section,
        .pagamento-section {
            margin-bottom: 8px;
        }

        /* === TABELA DE ITENS === */
        .itens-section {
            margin-bottom: 12px;
        }

        /* Descrições SEMPRE começam em nova página */
        .descricoes-wrapper {
            page-break-before: always;
            break-before: page;
            padding-top: 95px;
            padding-bottom: 80px;
            position: relative;
            min-height: calc(100vh - 95px - 80px);
        }

        /* Descrições podem quebrar se muito longas */
        .descricao-section {
            page-break-inside: auto;
            break-inside: auto;
            orphans: 3;
            widows: 3;
            position: relative;

            margin-bottom: 20px;
        }

        /* Garantir que quando descrição técnica quebra para nova página, tenha padding-top */
        .descricao-section::before {
            content: "";
            display: block;
            height: 95px;
            position: absolute;
            top: -95px;
            left: 0;
            width: 100%;
            pointer-events: none;
            visibility: hidden;
        }

        /* Adicionar espaço no topo de qualquer conteúdo que quebrar para nova página */
        .descricao-section:first-child,
        .observacoes-section:first-child {
            margin-top: 0;
        }


        /* Garantir padding-top e padding-bottom em todas as páginas geradas automaticamente */
        @media print {
            /* O spacer fixo no topo + margin-top e margin-bottom do @page garantem o espaçamento em todas as páginas */
            
            /* Primeira seção de descrição em nova página tem padding-top do wrapper */
            .descricoes-wrapper > .descricao-section:first-child,
            .descricoes-wrapper > .observacoes-section:first-child {
                margin-top: 0;
            }

            /* Quando conteúdo quebra para nova página, garantir que o spacer apareça */
            .descricao-section,
            .observacoes-section {
                position: relative;
            }

            /* Adicionar padding-top se uma seção começar em nova página após quebra */
            .descricao-section:not(:first-child)::before,
            .observacoes-section:not(:first-child)::before {
                content: "";
                display: block;
                height: 95px;
                margin-top: -95px;
                visibility: hidden;
            }


            /* Garantir que todas as seções respeitem o padding-bottom */
            .descricao-section:last-child,
            .observacoes-section:last-child {
                padding-bottom: 80px;
            }
        }


        /* === TÍTULO DO ORÇAMENTO === */
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

        /* === SEÇÃO CLIENTE === */
        .cliente-section {
            background: transparent;
            padding: 6px 0;
            margin-bottom: 8px;
            border: none;
        }

        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
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

        /* === ENDEREÇOS === */
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

        /* === DESCRIÇÕES === */
        .descricao-section {
            background: transparent;
            padding: 12px 0;
            margin-bottom: 16px;
            border: none;
            page-break-inside: avoid;
        }

        .descricao-content {
            color: #1e293b;
            font-size: 12px;
            line-height: 1.6;
            margin-top: 6px;
        }

        .descricao-section.projeto {
            border-left-color: #1e40af;
        }

        /* Garantir que elementos não quebrem mal entre páginas */
        .cliente-section,
        .addresses-row,
        .itens-section,
        .totais-section,
        .pagamento-section,
        .observacoes-section {
            page-break-inside: avoid;
        }

        /* Suporte para HTML rico do Jodit */
        .descricao-content img {
            max-width: 100%;
            max-height: 200px;
            height: auto;
            margin: 10px 0;
            border-radius: 4px;
            object-fit: contain;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .descricao-content ul, .descricao-content ol {
            margin: 8px 0 8px 20px;
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
        }

        /* === TABELA DE ITENS === */
        .itens-section {
            margin-bottom: 20px;
        }

        table.itens-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
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
            font-size: 12px;
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
            font-size: 12px;
            background: transparent;
        }

        table.itens-table td:nth-child(2),
        table.itens-table td:nth-child(3),
        table.itens-table td:nth-child(4),
        table.itens-table td:nth-child(5) {
            text-align: right;
        }

        table.itens-table tbody tr:hover {
            background: transparent;
        }

        table.itens-table tbody tr {
            background: transparent;
            page-break-inside: avoid;
        }

        table.itens-table thead {
            display: table-header-group;
        }

        .item-tipo {
            display: inline-block;
            font-size: 7px;
            padding: 2px 6px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 3px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        /* Descrição técnica dos materiais removida - não é mais exibida */

        /* === TOTAIS === */
        .totais-section {
            background: transparent;
            padding: 8px 0;
            margin-bottom: 8px;
        }

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
            color: #1e293b;
        }

        /* === FORMA DE PAGAMENTO === */
        .pagamento-section {
            margin-bottom: 12px;
        }

        table.pagamento-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 12px;
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
            font-size: 12px;
        }

        table.pagamento-table td {
            padding: 4px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
        }

        /* === OBSERVAÇÕES === */
        .observacoes-section {
            background: transparent;
            padding: 12px 0;
            border: none;
            margin-bottom: 16px;
        }

        .observacoes-content {
            color: #1e293b;
            font-size: 12px;
            line-height: 1.6;
            margin-top: 6px;
        }


        @media print {
            .watermark-background,
            .watermark-center {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>

    <body>
    <!-- Spacer fixo no topo de todas as páginas -->
    <div class="page-top-spacer"></div>
    
    <!-- Spacer fixo no rodapé de todas as páginas -->
    <div class="page-bottom-spacer"></div>

    <!-- Folha Timbrada / Marca d'água de fundo -->
    <div class="watermark-background${folhaTimbradaUrl ? ' custom-letterhead' : ''}" ${folhaTimbradaUrl ? `style="--letterhead-url: url('${folhaTimbradaUrl}');"` : ''}>
        <!-- Cantos decorativos superiores -->
        <svg class="corner-top-left" viewBox="0 0 300 150">
            <rect x="0" y="0" width="200" height="30" rx="15" fill="#1e40af" opacity="0.15"/>
            <rect x="0" y="40" width="180" height="30" rx="15" fill="#cbd5e1" opacity="0.2"/>
        </svg>
        
        <!-- Cantos decorativos inferiores -->
        <svg class="corner-bottom-right" viewBox="0 0 300 150">
            <rect x="100" y="120" width="200" height="30" rx="15" fill="#1e40af" opacity="0.15"/>
            <rect x="120" y="80" width="180" height="30" rx="15" fill="#cbd5e1" opacity="0.2"/>
        </svg>

        <!-- Logo central como marca d'água -->
        <div class="watermark-center">
            S3E
            <div class="watermark-subtitle">ENGENHARIA ELÉTRICA</div>
        </div>
    </div>

    <div class="page">
        <!-- Título do Orçamento -->
        <div class="orcamento-title">
            <h1>${orcamento.titulo || `ORÇAMENTO DE VENDA #${orcamento.numeroSequencial}`}</h1>
            <div class="orcamento-details">
                <div class="detail-item">
                    <label>Cliente:</label>
                    <strong>${orcamento.cliente.nome}</strong>
                </div>
                <div class="detail-item">
                    <label>Emissão:</label>
                    <strong>${new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}</strong>
                </div>
                <div class="detail-item">
                    <label>Validade:</label>
                    <strong>${new Date(orcamento.validade).toLocaleDateString('pt-BR')}</strong>
                </div>
                <div class="detail-item">
                    <strong style="font-size: 16px; font-weight: bold;">ORÇAMENTO ${orcamento.numeroSequencial}</strong>
                </div>
                ${(orcamento.previsaoInicio && orcamento.previsaoTermino) || orcamento.previsaoTermino ? `
                <div class="detail-item">
                    <label>Prazo de Entrega:</label>
                    <strong>${orcamento.previsaoInicio && orcamento.previsaoTermino ? `${new Date(orcamento.previsaoInicio).toLocaleDateString('pt-BR')} a ${new Date(orcamento.previsaoTermino).toLocaleDateString('pt-BR')}` : new Date(orcamento.previsaoTermino).toLocaleDateString('pt-BR')}</strong>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Cliente -->
        <div class="cliente-section">
            <div class="section-title">Dados do Cliente</div>
            <div class="cliente-info-grid">
                <div class="cliente-info-item">
                    <div class="cliente-info-label">Nome:</div>
                    <div class="cliente-info-value">${orcamento.cliente.nome}</div>
                </div>
                ${orcamento.cliente.cpfCnpj ? `
                <div class="cliente-info-item">
                    <div class="cliente-info-label">CPF/CNPJ:</div>
                    <div class="cliente-info-value">${orcamento.cliente.cpfCnpj}</div>
                </div>
                ` : ''}
                ${orcamento.cliente.email ? `
                <div class="cliente-info-item">
                    <div class="cliente-info-label">Email:</div>
                    <div class="cliente-info-value">${orcamento.cliente.email}</div>
                </div>
                ` : ''}
                ${orcamento.cliente.telefone ? `
                <div class="cliente-info-item">
                    <div class="cliente-info-label">Telefone:</div>
                    <div class="cliente-info-value">${orcamento.cliente.telefone}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Endereços de Cobrança e Entrega -->
        ${orcamento.enderecoObra || orcamento.cliente.endereco ? `
        <div class="addresses-row">
            ${orcamento.cliente.endereco ? `
            <div class="address-box">
                <div class="section-title">Endereço de Cobrança</div>
                <div style="font-size: 12px; line-height: 1.4;">
                    ${orcamento.cliente.endereco}
                </div>
            </div>
            ` : ''}
            ${orcamento.enderecoObra ? `
            <div class="address-box">
                <div class="section-title">Endereço da Obra</div>
                <div style="font-size: 12px; line-height: 1.4;">
                    ${orcamento.enderecoObra}${orcamento.bairro ? `, ${orcamento.bairro}` : ''}${orcamento.cidade ? ` - ${orcamento.cidade}` : ''}${orcamento.cep ? ` - ${orcamento.cep}` : ''}
                </div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Linha separadora -->
        <hr style="margin: 12px 0; border: none; border-top: 1px solid #000000;" />

        <!-- Itens do Orçamento -->
        <div class="itens-section">
            <div style="font-size: 10px; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Itens do Orçamento</div>
            <table class="itens-table">
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
                    ${orcamento.items.map(item => {
                        const tipoMap: Record<string, string> = {
                            'MATERIAL': 'Material',
                            'KIT': 'Kit',
                            'SERVICO': 'Serviço',
                            'QUADRO_PRONTO': 'Quadro Elétrico',
                            'CUSTO_EXTRA': 'Custo Extra'
                        };
                        const tipoLabel = tipoMap[item.tipo] || item.tipo;
                        
                        let nomeItem = item.descricao || 'Item do orçamento';
                        let descricaoDetalhada = '';
                        
                        if (item.material) {
                            nomeItem = item.material.nome;
                            if (item.material.descricao) {
                                descricaoDetalhada = item.material.descricao;
                            }
                            if (item.descricao && item.descricao !== item.material.nome && item.descricao !== item.material.descricao) {
                                descricaoDetalhada = item.descricao + (descricaoDetalhada ? '<br><br>' + descricaoDetalhada : '');
                            }
                        } else if (item.kit) {
                            nomeItem = item.kit.nome;
                            descricaoDetalhada = item.kit.descricao || '';
                        } else if (item.servicoNome) {
                            nomeItem = item.servicoNome;
                            descricaoDetalhada = item.descricao || '';
                        } else {
                            nomeItem = item.descricao || 'Item do orçamento';
                            descricaoDetalhada = '';
                        }
                        
                        return `
                        <tr>
                            <td>
                                <div>${nomeItem}</div>
                            </td>
                            <td>UN</td>
                            <td>${item.quantidade.toFixed(2)}</td>
                            <td>R$ ${item.precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td><strong>R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Totais -->
        <div class="totais-section">
            <div class="totais-row">
                <span>Total dos Itens:</span>
                <strong>R$ ${orcamento.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            ${orcamento.descontoValor > 0 ? `
            <div class="totais-row">
                <span>Desconto:</span>
                <strong>R$ ${orcamento.descontoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            ` : ''}
            ${orcamento.impostoPercentual > 0 ? `
            <div class="totais-row">
                <span>Impostos (${orcamento.impostoPercentual}%):</span>
                <strong>R$ ${(orcamento.precoVenda - (orcamento.items.reduce((sum, item) => sum + item.subtotal, 0) - orcamento.descontoValor)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            ` : ''}
            <div class="totais-row total-final">
                <span>VALOR TOTAL:</span>
                <span>R$ ${orcamento.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>

        <!-- Forma de Pagamento -->
        ${orcamento.condicaoPagamento ? `
        <div class="pagamento-section">
            <div class="section-title">Forma / Condições de Pagamento</div>
            <table class="pagamento-table">
                <thead>
                    <tr>
                        <th>Condição</th>
                        <th>Observação</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${orcamento.condicaoPagamento}</strong></td>
                        <td>Pagamento conforme condições acordadas</td>
                    </tr>
                </tbody>
            </table>
        </div>
        ` : ''}

        <!-- Lógica Condicional de Descrições -->
        ${(() => {
            // Se tiver APENAS descrição geral (sem técnica), coloca na primeira página
            if (orcamento.descricao && !orcamento.descricaoProjeto) {
                return `
                <!-- Descrição Geral (na primeira página) -->
                <div class="descricao-section" style="margin-bottom: 12px;">
                    <div class="section-title">Descrição Geral</div>
                    <div class="descricao-content">${orcamento.descricao}</div>
                </div>
                ${orcamento.observacoes ? `
                <div class="observacoes-section">
                    <div class="section-title">Observações Importantes</div>
                    <div class="observacoes-content">${orcamento.observacoes}</div>
                </div>
                ` : ''}
                `;
            }
            
            // Se tiver descrição técnica, usa nova página (padrão existente)
            if (orcamento.descricaoProjeto || (orcamento.descricao && orcamento.descricaoProjeto)) {
                return `
                <div class="descricoes-wrapper">
                    ${orcamento.descricao ? `
                    <div class="descricao-section">
                        <div class="section-title">Descrição Geral</div>
                        <div class="descricao-content">${orcamento.descricao}</div>
                    </div>
                    ` : ''}
                    
                    ${orcamento.descricaoProjeto ? `
                    <div class="descricao-section projeto">
                        <div class="section-title">Descrição Técnica do Projeto</div>
                        <div class="descricao-content">${orcamento.descricaoProjeto}</div>
                    </div>
                    ` : ''}
                    
                    ${orcamento.observacoes ? `
                    <div class="observacoes-section">
                        <div class="section-title">Observações Importantes</div>
                        <div class="observacoes-content">${orcamento.observacoes}</div>
                    </div>
                    ` : ''}
                </div>
                `;
            }
            
            // Se tiver apenas observações
            if (orcamento.observacoes && !orcamento.descricao && !orcamento.descricaoProjeto) {
                return `
                <div class="observacoes-section" style="margin-bottom: 12px;">
                    <div class="section-title">Observações Importantes</div>
                    <div class="observacoes-content">${orcamento.observacoes}</div>
                </div>
                `;
            }
            
            return '';
        })()}
    </div>
</body>
</html>
        `;

        console.log('✅ HTML do orçamento gerado com sucesso (versão atualizada - sem backgrounds, fonte 12px, padding 95px/80px, margin 15px)');
        return html;
    }

    /**
     * Gera configuração de marca d'água baseada no template S3E
     */
    static gerarMarcaDaguaS3E(opacidade: number = 0.05) {
        return {
            tipo: 'template' as const,
            opacidade,
            template: 'S3E_ENGENHARIA'
        };
    }
}
