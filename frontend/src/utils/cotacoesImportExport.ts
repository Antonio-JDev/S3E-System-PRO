/**
 * Utilitários para importação e exportação de cotações via JSON
 */

export interface CotacaoTemplate {
    nome: string;
    ncm?: string;
    valorUnitario: number;
    valorVenda?: number;
    unidadeMedida?: string; // un, m, cm, kg, etc.
    fornecedorNome?: string;
    observacoes?: string;
    ativo?: boolean;
}

export interface CotacoesImportData {
    versao: string;
    dataExportacao: string;
    cotacoes: CotacaoTemplate[];
}

export interface ImportResult {
    sucesso: number;
    erros: number;
    total: number;
    detalhes: Array<{
        linha: number;
        nome: string;
        status: 'sucesso' | 'erro';
        mensagem?: string;
    }>;
}

/**
 * Gera um template vazio para importação de cotações
 */
export function generateEmptyTemplate(): CotacoesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        cotacoes: [
            {
                nome: 'Material Exemplo',
                ncm: '85369090',
                valorUnitario: 10.50,
                valorVenda: 14.70,
                unidadeMedida: 'un',
                fornecedorNome: 'Fornecedor Exemplo LTDA',
                observacoes: 'Observações sobre a cotação',
                ativo: true
            }
        ]
    };
}

/**
 * Gera template com exemplos
 */
export function generateExampleTemplate(): CotacoesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        cotacoes: [
            {
                nome: 'DISJUNTOR BIPOLAR 20A CURVA C',
                ncm: '85362000',
                valorUnitario: 25.50,
                valorVenda: 35.70,
                unidadeMedida: 'un',
                fornecedorNome: 'Distribuidora Elétrica ABC',
                observacoes: 'Prazo de entrega: 5 dias úteis',
                ativo: true
            },
            {
                nome: 'CABO FLEXÍVEL 2,5MM² PRETO',
                ncm: '85444200',
                valorUnitario: 3.80,
                valorVenda: 5.32,
                unidadeMedida: 'm',
                fornecedorNome: 'Cabos e Fios XYZ',
                observacoes: 'Venda por metro',
                ativo: true
            },
            {
                nome: 'TOMADA 2P+T 10A BRANCA',
                ncm: '85363000',
                valorUnitario: 8.90,
                valorVenda: 12.46,
                unidadeMedida: 'un',
                fornecedorNome: 'Materiais Elétricos DEF',
                ativo: true
            }
        ]
    };
}

/**
 * Exporta cotações para JSON
 */
export function exportToJSON(cotacoes: CotacaoTemplate[]): CotacoesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        cotacoes: cotacoes.map(c => ({
            nome: c.nome,
            ncm: c.ncm || '',
            valorUnitario: c.valorUnitario,
            valorVenda: c.valorVenda,
            unidadeMedida: c.unidadeMedida || 'un',
            fornecedorNome: c.fornecedorNome || '',
            observacoes: c.observacoes || '',
            ativo: c.ativo !== false
        }))
    };
}

/**
 * Valida o JSON de importação
 */
export function validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
        errors.push('Arquivo JSON vazio ou inválido');
        return { valid: false, errors };
    }

    if (!data.versao) {
        errors.push('Campo "versao" é obrigatório');
    }

    if (!data.cotacoes || !Array.isArray(data.cotacoes)) {
        errors.push('Campo "cotacoes" deve ser um array');
        return { valid: false, errors };
    }

    if (data.cotacoes.length === 0) {
        errors.push('Array "cotacoes" está vazio');
        return { valid: false, errors };
    }

    // Validar cada cotação
    data.cotacoes.forEach((cotacao: any, index: number) => {
        const linha = index + 1;

        if (!cotacao.nome) {
            errors.push(`Linha ${linha}: Campo "nome" é obrigatório`);
        }

        if (cotacao.valorUnitario === undefined || cotacao.valorUnitario === null) {
            errors.push(`Linha ${linha}: Campo "valorUnitario" é obrigatório`);
        } else if (typeof cotacao.valorUnitario !== 'number' || cotacao.valorUnitario < 0) {
            errors.push(`Linha ${linha}: Campo "valorUnitario" deve ser um número positivo`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Lê arquivo JSON
 */
export async function readJSONFile(file: File): Promise<CotacoesImportData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                resolve(data);
            } catch (error) {
                reject(new Error('Erro ao ler arquivo JSON. Verifique se o formato está correto.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo'));
        };

        reader.readAsText(file);
    });
}

/**
 * Faz download do JSON
 */
export function downloadJSON(data: CotacoesImportData, filename: string = 'cotacoes-template.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

