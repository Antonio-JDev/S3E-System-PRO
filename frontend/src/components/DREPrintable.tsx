import React from 'react';

interface DREPrintableProps {
    tipo: 'lucro-real' | 'lucro-real-servicos' | 'dre-consolidado';
    periodo: {
        inicio: Date;
        fim: Date;
    };
    dados: any;
    usuario?: string;
    logoUrl?: string;
}

const DREPrintable = React.forwardRef<HTMLDivElement, DREPrintableProps>(
    ({ tipo, periodo, dados, usuario, logoUrl }, ref) => {
        const formatMoeda = (valor: number) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(valor);
        };

        const formatData = (data: Date) => {
            return new Date(data).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const formatDataHora = (data: Date) => {
            return new Date(data).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const getFonteCustoLabel = (fonte: string) => {
            switch (fonte) {
                case 'XML': return 'XML (Última Compra)';
                case 'CADASTRO': return 'Cadastro';
                case 'SEM_CUSTO': return 'Sem Custo';
                default: return fonte;
            }
        };

        return (
            <div ref={ref}>
                <style>{`
                    @page {
                        size: A4;
                        margin: 20mm;
                    }

                    .print-container {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: #000;
                        background: white;
                        padding: 0;
                    }

                    .print-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 3px solid #1e40af;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }

                    .print-logo {
                        max-width: 150px;
                        max-height: 80px;
                        object-fit: contain;
                    }

                    .print-title {
                        text-align: right;
                        flex: 1;
                        margin-left: 20px;
                    }

                    .print-title h1 {
                        font-size: 24px;
                        font-weight: bold;
                        color: #1e40af;
                        margin: 0 0 5px 0;
                    }

                    .print-title p {
                        font-size: 12px;
                        color: #6b7280;
                        margin: 2px 0;
                    }

                    .print-info {
                        background: #f3f4f6;
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        font-size: 11px;
                    }

                    .print-info-item {
                        display: flex;
                        gap: 5px;
                    }

                    .print-info-label {
                        font-weight: bold;
                        color: #374151;
                    }

                    .print-info-value {
                        color: #6b7280;
                    }

                    .print-section {
                        margin-bottom: 25px;
                    }

                    .section-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1e40af;
                        margin-bottom: 10px;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #e5e7eb;
                    }

                    .cards-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                        margin-bottom: 20px;
                    }

                    .card-print {
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 10px;
                        text-align: center;
                    }

                    .card-label {
                        font-size: 10px;
                        color: #6b7280;
                        font-weight: 600;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }

                    .card-value {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1f2937;
                    }

                    .card-value.positive {
                        color: #059669;
                    }

                    .card-value.negative {
                        color: #dc2626;
                    }

                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                        font-size: 10px;
                    }

                    .print-table thead {
                        background: #1e40af;
                        color: white;
                    }

                    .print-table th {
                        padding: 8px 6px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 9px;
                        text-transform: uppercase;
                    }

                    .print-table th.text-right {
                        text-align: right;
                    }

                    .print-table th.text-center {
                        text-align: center;
                    }

                    .print-table tbody tr {
                        border-bottom: 1px solid #e5e7eb;
                    }

                    .print-table tbody tr:hover {
                        background: #f9fafb;
                    }

                    .print-table td {
                        padding: 6px;
                        color: #374151;
                    }

                    .print-table td.text-right {
                        text-align: right;
                    }

                    .print-table td.text-center {
                        text-align: center;
                    }

                    .print-table td.font-bold {
                        font-weight: bold;
                    }

                    .print-table .row-total {
                        background: #f3f4f6;
                        font-weight: bold;
                    }

                    .print-table .row-subtotal {
                        background: #e0f2fe;
                        font-weight: bold;
                    }

                    .print-table .row-highlight {
                        background: #dbeafe;
                        font-weight: bold;
                    }

                    .badge {
                        display: inline-block;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 8px;
                        font-weight: 600;
                    }

                    .badge-success {
                        background: #d1fae5;
                        color: #065f46;
                    }

                    .badge-warning {
                        background: #fef3c7;
                        color: #92400e;
                    }

                    .badge-danger {
                        background: #fee2e2;
                        color: #991b1b;
                    }

                    .print-footer {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 2px solid #e5e7eb;
                        font-size: 9px;
                        color: #6b7280;
                        text-align: center;
                    }

                    .page-break {
                        page-break-after: always;
                    }

                    @media print {
                        .print-container {
                            width: 100%;
                            max-width: none;
                        }
                        
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                `}</style>

                <div className="print-container">
                    {/* Header */}
                    <div className="print-header">
                        {logoUrl && (
                            <img src={logoUrl} alt="Logo" className="print-logo" />
                        )}
                        <div className="print-title">
                            <h1>
                                {tipo === 'lucro-real' 
                                    ? 'LUCRO REAL POR PRODUTO' 
                                    : tipo === 'lucro-real-servicos'
                                    ? 'LUCRO REAL POR SERVIÇO'
                                    : 'DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO'}
                            </h1>
                            <p>Análise Financeira Gerencial</p>
                        </div>
                    </div>

                    {/* Informações do Relatório */}
                    <div className="print-info">
                        <div className="print-info-item">
                            <span className="print-info-label">Período:</span>
                            <span className="print-info-value">
                                {formatData(periodo.inicio)} a {formatData(periodo.fim)}
                            </span>
                        </div>
                        <div className="print-info-item">
                            <span className="print-info-label">Gerado em:</span>
                            <span className="print-info-value">
                                {formatDataHora(new Date())}
                            </span>
                        </div>
                        {usuario && (
                            <div className="print-info-item">
                                <span className="print-info-label">Gerado por:</span>
                                <span className="print-info-value">{usuario}</span>
                            </div>
                        )}
                        <div className="print-info-item">
                            <span className="print-info-label">Tipo:</span>
                            <span className="print-info-value">
                                {tipo === 'lucro-real' 
                                    ? 'Lucro Real (Produtos)' 
                                    : tipo === 'lucro-real-servicos'
                                    ? 'Lucro Real (Serviços)'
                                    : 'DRE Consolidado'}
                            </span>
                        </div>
                    </div>

                    {/* LUCRO REAL */}
                    {tipo === 'lucro-real' && dados && (
                        <>
                            {/* Cards de Resumo */}
                            <div className="print-section">
                                <div className="section-title">Resumo Financeiro</div>
                                <div className="cards-grid">
                                    <div className="card-print">
                                        <div className="card-label">Total Vendas</div>
                                        <div className="card-value">{formatMoeda(dados.resumo.totalVenda)}</div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Custo Real</div>
                                        <div className="card-value negative">{formatMoeda(dados.resumo.totalCusto)}</div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Lucro Real</div>
                                        <div className="card-value positive">{formatMoeda(dados.resumo.totalLucro)}</div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Margem Real</div>
                                        <div className="card-value">{dados.resumo.margemReal.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Produtos */}
                            <div className="print-section">
                                <div className="section-title">Lucro Real por Produto</div>
                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>Produto</th>
                                            <th className="text-center">Qtd</th>
                                            <th className="text-right">Venda Unit</th>
                                            <th className="text-right">Custo Real</th>
                                            <th className="text-right">Lucro Unit</th>
                                            <th className="text-right">Lucro Total</th>
                                            <th className="text-right">Margem %</th>
                                            <th className="text-center">Fonte</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dados.produtos.map((produto: any, index: number) => (
                                            <tr key={index}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>
                                                        {produto.materialNome}
                                                        {produto.tipoItem && (
                                                            <span style={{ 
                                                                marginLeft: '6px',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '8px',
                                                                fontWeight: 600,
                                                                background: produto.tipoItem === 'ORIGINAL' ? '#dbeafe' : '#fed7aa',
                                                                color: produto.tipoItem === 'ORIGINAL' ? '#1e40af' : '#c2410c'
                                                            }}>
                                                                {produto.tipoItem === 'ORIGINAL' ? 'Original' : 'Aditivo'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '8px', color: '#6b7280' }}>{produto.sku}</div>
                                                </td>
                                                <td className="text-center">
                                                    {produto.quantidadeVendida} {produto.unidadeMedida}
                                                </td>
                                                <td className="text-right" style={{ color: '#2563eb' }}>
                                                    {formatMoeda(produto.valorVendaUnitario)}
                                                </td>
                                                <td className="text-right" style={{ color: '#dc2626' }}>
                                                    {produto.custoRealUnitario !== null ? formatMoeda(produto.custoRealUnitario) : '-'}
                                                </td>
                                                <td className="text-right" style={{ color: '#059669' }}>
                                                    {produto.lucroRealUnitario !== null ? formatMoeda(produto.lucroRealUnitario) : '-'}
                                                </td>
                                                <td className="text-right font-bold" style={{ color: '#059669' }}>
                                                    {produto.lucroRealTotal !== null ? formatMoeda(produto.lucroRealTotal) : '-'}
                                                </td>
                                                <td className="text-right">
                                                    <span className={produto.margemReal !== null && produto.margemReal > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                                                        {produto.margemReal !== null ? `${produto.margemReal.toFixed(1)}%` : '-'}
                                                    </span>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge ${
                                                        produto.fonteCusto === 'XML' ? 'badge-success' : 
                                                        produto.fonteCusto === 'CADASTRO' ? 'badge-warning' : 
                                                        'badge-danger'
                                                    }`}>
                                                        {getFonteCustoLabel(produto.fonteCusto)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Estatísticas */}
                            {dados.estatisticas && (
                                <div className="print-section">
                                    <div className="section-title">Estatísticas</div>
                                    <div className="cards-grid">
                                        <div className="card-print">
                                            <div className="card-label">Total Produtos</div>
                                            <div className="card-value">{dados.estatisticas.totalProdutos}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Com Custo XML</div>
                                            <div className="card-value positive">{dados.estatisticas.produtosComXML}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Custo Cadastro</div>
                                            <div className="card-value" style={{ color: '#d97706' }}>{dados.estatisticas.produtosComCadastro}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Sem Custo</div>
                                            <div className="card-value negative">{dados.estatisticas.produtosSemCusto}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* LUCRO REAL - SERVIÇOS */}
                    {tipo === 'lucro-real-servicos' && dados && (
                        <>
                            {/* Cards de Resumo */}
                            <div className="print-section">
                                <div className="section-title">Resumo Financeiro</div>
                                <div className="cards-grid">
                                    <div className="card-print">
                                        <div className="card-label">Receita de Serviços</div>
                                        <div className="card-value">
                                            {formatMoeda(dados.resumo.totalVendaServicos || dados.resumo.totalVenda)}
                                        </div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Custo de Execução</div>
                                        <div className="card-value negative">
                                            {formatMoeda(dados.resumo.totalCustoServicos || dados.resumo.totalCusto)}
                                        </div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Lucro Líquido</div>
                                        <div className="card-value positive">
                                            {formatMoeda(dados.resumo.totalLucroServicos || dados.resumo.totalLucro)}
                                        </div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Margem</div>
                                        <div className="card-value">
                                            {(dados.resumo.margemServicos || dados.resumo.margemReal).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Serviços */}
                            <div className="print-section">
                                <div className="section-title">Lucro Real por Serviço</div>
                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>Serviço</th>
                                            <th>Cliente</th>
                                            <th className="text-center">Qtd/Horas</th>
                                            <th className="text-right">Receita</th>
                                            <th className="text-right">Custo</th>
                                            <th className="text-right">Lucro</th>
                                            <th className="text-right">Margem %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dados.servicos || []).map((servico: any, index: number) => {
                                            const receita = servico.receitaServico ?? servico.valorTotalServico ?? 0;
                                            const custo = servico.custoExecucao ?? 0;
                                            const lucro = receita - custo;
                                            const margem = receita > 0 ? (lucro / receita) * 100 : servico.margem ?? 0;

                                            return (
                                                <tr key={index}>
                                                    <td>
                                                        <div style={{ fontWeight: 600 }}>
                                                            {servico.nomeServico || servico.descricao || 'Serviço sem nome'}
                                                        </div>
                                                    </td>
                                                    <td>{servico.clienteNome || '-'}</td>
                                                    <td className="text-center">
                                                        {servico.quantidade || servico.horas || 1}{' '}
                                                        {servico.unidadeMedida || 'h'}
                                                    </td>
                                                    <td className="text-right" style={{ color: '#2563eb' }}>
                                                        {formatMoeda(receita)}
                                                    </td>
                                                    <td className="text-right" style={{ color: '#dc2626' }}>
                                                        {custo > 0 ? formatMoeda(custo) : '-'}
                                                    </td>
                                                    <td className="text-right font-bold" style={{ color: '#059669' }}>
                                                        {formatMoeda(lucro)}
                                                    </td>
                                                    <td className="text-right">
                                                        <span className={margem >= 0 ? 'badge badge-success' : 'badge badge-danger'}>
                                                            {margem.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Estatísticas */}
                            {dados.estatisticas && (
                                <div className="print-section">
                                    <div className="section-title">Estatísticas</div>
                                    <div className="cards-grid">
                                        <div className="card-print">
                                            <div className="card-label">Total Serviços</div>
                                            <div className="card-value">{dados.estatisticas.totalServicos || 0}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Com Custo</div>
                                            <div className="card-value positive">{dados.estatisticas.servicosComCusto || 0}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Sem Custo</div>
                                            <div className="card-value negative">{dados.estatisticas.servicosSemCusto || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* DRE CONSOLIDADO */}
                    {tipo === 'dre-consolidado' && dados && (
                        <>
                            {/* Cards de Margem */}
                            <div className="print-section">
                                <div className="section-title">Margens</div>
                                <div className="cards-grid">
                                    <div className="card-print">
                                        <div className="card-label">Margem Bruta</div>
                                        <div className="card-value positive">{dados.resumo.margemBruta.toFixed(2)}%</div>
                                    </div>
                                    <div className="card-print">
                                        <div className="card-label">Margem Líquida</div>
                                        <div className="card-value positive">{dados.resumo.margemLiquida.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela DRE */}
                            <div className="print-section">
                                <div className="section-title">Demonstração do Resultado</div>
                                <table className="print-table">
                                    <tbody>
                                        <tr className="row-highlight">
                                            <td className="font-bold">RECEITA BRUTA</td>
                                            <td className="text-right font-bold" style={{ color: '#2563eb' }}>
                                                {formatMoeda(dados.resumo.receitaBruta)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '20px' }}>(-) Impostos sobre Vendas</td>
                                            <td className="text-right" style={{ color: '#dc2626' }}>
                                                {formatMoeda(-dados.resumo.impostosVendas)}
                                            </td>
                                        </tr>
                                        <tr className="row-subtotal">
                                            <td className="font-bold">RECEITA LÍQUIDA</td>
                                            <td className="text-right font-bold" style={{ color: '#2563eb' }}>
                                                {formatMoeda(dados.resumo.receitaLiquida)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>(-) CPV - Custo de Materiais</td>
                                            <td className="text-right" style={{ color: '#dc2626' }}>
                                                {formatMoeda(-dados.resumo.cpv.materiais)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>(-) CPV - Custo de Mão de Obra</td>
                                            <td className="text-right" style={{ color: '#dc2626' }}>
                                                {formatMoeda(-dados.resumo.cpv.maoDeObra)}
                                            </td>
                                        </tr>
                                        <tr className="row-subtotal">
                                            <td className="font-bold">LUCRO BRUTO</td>
                                            <td className="text-right font-bold" style={{ color: '#059669' }}>
                                                {formatMoeda(dados.resumo.lucroBruto)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>(-) Despesas Fixas</td>
                                            <td className="text-right" style={{ color: '#dc2626' }}>
                                                {formatMoeda(-dados.resumo.despesasOperacionais.despesasFixas)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>(-) Gastos com Veículos</td>
                                            <td className="text-right" style={{ color: '#dc2626' }}>
                                                {formatMoeda(-dados.resumo.despesasOperacionais.veiculos)}
                                            </td>
                                        </tr>
                                        <tr className="row-subtotal">
                                            <td className="font-bold">EBITDA / LUCRO OPERACIONAL</td>
                                            <td className="text-right font-bold" style={{ color: '#8b5cf6' }}>
                                                {formatMoeda(dados.resumo.ebitda)}
                                            </td>
                                        </tr>
                                        <tr className="row-total">
                                            <td className="font-bold" style={{ fontSize: '12px' }}>LUCRO LÍQUIDO FINAL</td>
                                            <td className="text-right font-bold" style={{ fontSize: '12px', color: '#2563eb' }}>
                                                {formatMoeda(dados.resumo.lucroLiquido)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Métricas */}
                            {dados.metricas && (
                                <div className="print-section">
                                    <div className="section-title">Métricas Operacionais</div>
                                    <div className="cards-grid">
                                        <div className="card-print">
                                            <div className="card-label">Total de Vendas</div>
                                            <div className="card-value">{dados.metricas.totalVendas}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Total de Compras</div>
                                            <div className="card-value">{dados.metricas.totalCompras}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Total de Despesas</div>
                                            <div className="card-value">{dados.metricas.totalDespesas}</div>
                                        </div>
                                        <div className="card-print">
                                            <div className="card-label">Ticket Médio</div>
                                            <div className="card-value">{formatMoeda(dados.metricas.ticketMedioVenda)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="print-footer">
                        <p>Este relatório foi gerado automaticamente pelo Sistema S3E</p>
                        <p>Documento confidencial - Uso restrito</p>
                    </div>
                </div>
            </div>
        );
    }
);

DREPrintable.displayName = 'DREPrintable';

export default DREPrintable;
