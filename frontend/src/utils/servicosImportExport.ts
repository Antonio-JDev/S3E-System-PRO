/**
 * Utilitários para importação e exportação de serviços via JSON
 */

export interface ServicoTemplate {
    codigo: string;
    nome: string;
    descricao?: string;
    tipo: string;
    preco: number;
    unidade: string;
    ativo?: boolean;
}

export interface ServicosImportData {
    versao: string;
    dataExportacao: string;
    servicos: ServicoTemplate[];
}

export interface ImportResult {
    sucesso: number;
    erros: number;
    total: number;
    detalhes: Array<{
        linha: number;
        codigo: string;
        nome: string;
        status: 'sucesso' | 'erro';
        mensagem?: string;
    }>;
}

/**
 * Gera um template vazio para importação de serviços
 */
export function generateEmptyTemplate(): ServicosImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        servicos: [
            {
                codigo: 'SERV-001',
                nome: 'Instalação de Tomada',
                descricao: 'Instalação de tomada padrão 2P+T',
                tipo: 'Instalação',
                preco: 50.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'SERV-002',
                nome: 'Instalação de Interruptor',
                descricao: 'Instalação de interruptor simples',
                tipo: 'Instalação',
                preco: 40.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'SERV-003',
                nome: 'Lançamento de Cabo',
                descricao: 'Lançamento de cabo em eletroduto',
                tipo: 'Instalação',
                preco: 15.00,
                unidade: 'm',
                ativo: true
            }
        ]
    };
}

/**
 * Gera template com exemplos mais completos
 */
export function generateExampleTemplate(): ServicosImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        servicos: [
            // Instalações Elétricas
            {
                codigo: 'INST-001',
                nome: 'Instalação de Tomada 2P+T',
                descricao: 'Instalação de tomada padrão brasileiro 2P+T 10A/20A',
                tipo: 'Instalação',
                preco: 50.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'INST-002',
                nome: 'Instalação de Interruptor Simples',
                descricao: 'Instalação de interruptor simples 10A',
                tipo: 'Instalação',
                preco: 40.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'INST-003',
                nome: 'Instalação de Interruptor Paralelo',
                descricao: 'Instalação de interruptor paralelo (three-way)',
                tipo: 'Instalação',
                preco: 60.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'INST-004',
                nome: 'Instalação de Luminária',
                descricao: 'Instalação de luminária de teto ou parede',
                tipo: 'Instalação',
                preco: 80.00,
                unidade: 'un',
                ativo: true
            },
            // Lançamentos
            {
                codigo: 'LANC-001',
                nome: 'Lançamento de Cabo em Eletroduto',
                descricao: 'Lançamento de cabo elétrico em eletroduto existente',
                tipo: 'Lançamento',
                preco: 15.00,
                unidade: 'm',
                ativo: true
            },
            {
                codigo: 'LANC-002',
                nome: 'Instalação de Eletroduto',
                descricao: 'Instalação de eletroduto rígido ou flexível',
                tipo: 'Instalação',
                preco: 25.00,
                unidade: 'm',
                ativo: true
            },
            // Quadros Elétricos
            {
                codigo: 'QUAD-001',
                nome: 'Montagem de Quadro de Distribuição',
                descricao: 'Montagem e instalação de quadro de distribuição até 12 disjuntores',
                tipo: 'Montagem',
                preco: 500.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'QUAD-002',
                nome: 'Instalação de Disjuntor',
                descricao: 'Instalação de disjuntor em quadro existente',
                tipo: 'Instalação',
                preco: 35.00,
                unidade: 'un',
                ativo: true
            },
            // Manutenção
            {
                codigo: 'MANUT-001',
                nome: 'Manutenção Preventiva',
                descricao: 'Manutenção preventiva de instalações elétricas',
                tipo: 'Manutenção',
                preco: 200.00,
                unidade: 'h',
                ativo: true
            },
            {
                codigo: 'MANUT-002',
                nome: 'Manutenção Corretiva',
                descricao: 'Manutenção corretiva de instalações elétricas',
                tipo: 'Manutenção',
                preco: 150.00,
                unidade: 'h',
                ativo: true
            },
            // Projetos
            {
                codigo: 'PROJ-001',
                nome: 'Projeto Elétrico Residencial',
                descricao: 'Elaboração de projeto elétrico residencial completo',
                tipo: 'Projeto',
                preco: 1500.00,
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'PROJ-002',
                nome: 'Projeto Elétrico Comercial',
                descricao: 'Elaboração de projeto elétrico comercial',
                tipo: 'Projeto',
                preco: 3000.00,
                unidade: 'un',
                ativo: true
            }
        ]
    };
}

/**
 * Exporta serviços para JSON
 */
export function exportToJSON(servicos: ServicoTemplate[]): ServicosImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        servicos: servicos.map(s => ({
            codigo: s.codigo,
            nome: s.nome,
            descricao: s.descricao || '',
            tipo: s.tipo,
            preco: s.preco,
            unidade: s.unidade || 'un',
            ativo: s.ativo !== false
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

    if (!data.servicos || !Array.isArray(data.servicos)) {
        errors.push('Campo "servicos" deve ser um array');
        return { valid: false, errors };
    }

    if (data.servicos.length === 0) {
        errors.push('Array "servicos" está vazio');
        return { valid: false, errors };
    }

    // Validar cada serviço
    data.servicos.forEach((servico: any, index: number) => {
        const linha = index + 1;

        if (!servico.codigo) {
            errors.push(`Linha ${linha}: Campo "codigo" é obrigatório`);
        }

        if (!servico.nome) {
            errors.push(`Linha ${linha}: Campo "nome" é obrigatório`);
        }

        if (!servico.tipo) {
            errors.push(`Linha ${linha}: Campo "tipo" é obrigatório`);
        }

        if (servico.preco === undefined || servico.preco === null) {
            errors.push(`Linha ${linha}: Campo "preco" é obrigatório`);
        } else if (typeof servico.preco !== 'number' || servico.preco < 0) {
            errors.push(`Linha ${linha}: Campo "preco" deve ser um número positivo`);
        }

        if (!servico.unidade) {
            errors.push(`Linha ${linha}: Campo "unidade" é obrigatório`);
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
export async function readJSONFile(file: File): Promise<ServicosImportData> {
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
export function downloadJSON(data: ServicosImportData, filename: string = 'servicos-template.json') {
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

