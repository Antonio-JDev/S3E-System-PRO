/**
 * Utilitários para importação e exportação de serviços via JSON
 */

export interface ServicoTemplate {
    codigo: string;
    nome: string;
    descricao?: string;
    tipo: string;
    tipoServico?: 'MAO_DE_OBRA' | 'MONTAGEM' | 'ENGENHARIA' | 'PROJETOS' | 'ADMINISTRATIVO';
    preco: number;
    custo?: number | null; // ✅ NOVO: Custo do serviço (aceita vazio, 0 ou valor)
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
                codigo: 'MOB-001',
                nome: 'Instalação de Tomada',
                descricao: 'Instalação de tomada padrão 2P+T',
                tipo: 'Instalação',
                tipoServico: 'MAO_DE_OBRA',
                preco: 50.00,
                custo: 25.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'MONT-001',
                nome: 'Montagem de Quadro Elétrico',
                descricao: 'Montagem e instalação de quadro de distribuição',
                tipo: 'Instalação',
                tipoServico: 'MONTAGEM',
                preco: 500.00,
                custo: 300.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'ENG-PRO-001',
                nome: 'Projeto Elétrico Residencial',
                descricao: 'Elaboração de projeto elétrico residencial completo',
                tipo: 'Projeto',
                tipoServico: 'PROJETOS',
                preco: 1500.00,
                custo: null, // ✅ Campo opcional: pode ser null, 0 ou valor
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'ADM-001',
                nome: 'Serviço Administrativo',
                descricao: 'Serviço administrativo padrão',
                tipo: 'Outro',
                tipoServico: 'ADMINISTRATIVO',
                preco: 100.00,
                custo: 0, // ✅ Campo opcional: pode ser 0
                unidade: 'hora',
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
            // Mão de Obra
            {
                codigo: 'MOB-001',
                nome: 'Instalação de Tomada 2P+T',
                descricao: 'Instalação de tomada padrão brasileiro 2P+T 10A/20A',
                tipo: 'Instalação',
                tipoServico: 'MAO_DE_OBRA',
                preco: 50.00,
                custo: 25.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'MOB-002',
                nome: 'Instalação de Interruptor Simples',
                descricao: 'Instalação de interruptor simples 10A',
                tipo: 'Instalação',
                tipoServico: 'MAO_DE_OBRA',
                preco: 40.00,
                custo: 20.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'MOB-003',
                nome: 'Lançamento de Cabo em Eletroduto',
                descricao: 'Lançamento de cabo elétrico em eletroduto existente',
                tipo: 'Instalação',
                tipoServico: 'MAO_DE_OBRA',
                preco: 15.00,
                custo: 8.00, // ✅ Campo opcional: custo do serviço
                unidade: 'm',
                ativo: true
            },
            // Montagem
            {
                codigo: 'MONT-001',
                nome: 'Montagem de Quadro de Distribuição',
                descricao: 'Montagem e instalação de quadro de distribuição até 12 disjuntores',
                tipo: 'Instalação',
                tipoServico: 'MONTAGEM',
                preco: 500.00,
                custo: 300.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'MONT-002',
                nome: 'Montagem de Painel Elétrico',
                descricao: 'Montagem de painel elétrico industrial',
                tipo: 'Instalação',
                tipoServico: 'MONTAGEM',
                preco: 800.00,
                custo: 500.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            // Engenharia / Projetos
            {
                codigo: 'ENG-PRO-001',
                nome: 'Projeto Elétrico Residencial',
                descricao: 'Elaboração de projeto elétrico residencial completo',
                tipo: 'Projeto',
                tipoServico: 'PROJETOS',
                preco: 1500.00,
                custo: null, // ✅ Campo opcional: pode ser null (sem custo definido)
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'ENG-PRO-002',
                nome: 'Projeto Elétrico Comercial',
                descricao: 'Elaboração de projeto elétrico comercial',
                tipo: 'Projeto',
                tipoServico: 'PROJETOS',
                preco: 3000.00,
                custo: 2000.00, // ✅ Campo opcional: custo do serviço
                unidade: 'un',
                ativo: true
            },
            {
                codigo: 'ENG-PRO-003',
                nome: 'Laudo Técnico de Instalações',
                descricao: 'Elaboração de laudo técnico de instalações elétricas',
                tipo: 'LaudoTecnico',
                tipoServico: 'ENGENHARIA',
                preco: 800.00,
                custo: 0, // ✅ Campo opcional: pode ser 0 (custo zero)
                unidade: 'un',
                ativo: true
            },
            // Administrativo
            {
                codigo: 'ADM-001',
                nome: 'Serviço Administrativo',
                descricao: 'Serviço administrativo padrão',
                tipo: 'Outro',
                tipoServico: 'ADMINISTRATIVO',
                preco: 100.00,
                custo: 50.00, // ✅ Campo opcional: custo do serviço
                unidade: 'hora',
                ativo: true
            },
            {
                codigo: 'ADM-002',
                nome: 'Consultoria Administrativa',
                descricao: 'Consultoria em processos administrativos',
                tipo: 'Consultoria',
                tipoServico: 'ADMINISTRATIVO',
                preco: 150.00,
                custo: null, // ✅ Campo opcional: pode ser null, 0 ou valor
                unidade: 'hora',
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
            tipoServico: s.tipoServico,
            preco: s.preco,
            custo: s.custo !== undefined ? s.custo : null, // ✅ NOVO: Custo
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
        } else {
            // Aceita número ou string que pode ser convertida para número
            const precoNum = typeof servico.preco === 'number' ? servico.preco : parseFloat(servico.preco);
            if (isNaN(precoNum) || precoNum < 0) {
                errors.push(`Linha ${linha}: Campo "preco" deve ser um número positivo`);
            }
        }

        // Validar custo (opcional - aceita vazio, 0 ou valor positivo)
        if (servico.custo !== undefined && servico.custo !== null && servico.custo !== '') {
            const custoNum = typeof servico.custo === 'number' ? servico.custo : parseFloat(servico.custo);
            if (isNaN(custoNum) || custoNum < 0) {
                errors.push(`Linha ${linha}: Campo "custo" deve ser um número positivo ou vazio`);
            }
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

