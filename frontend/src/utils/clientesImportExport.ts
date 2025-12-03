/**
 * Utilitários para importação e exportação de clientes via JSON
 */

export interface ClienteTemplate {
    nome: string;
    cpfCnpj: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    tipo?: 'PF' | 'PJ';
    ativo?: boolean;
}

export interface ClientesImportData {
    versao: string;
    dataExportacao: string;
    clientes: ClienteTemplate[];
}

export interface ImportResult {
    sucesso: number;
    erros: number;
    total: number;
    detalhes: Array<{
        linha: number;
        cpfCnpj: string;
        nome: string;
        status: 'sucesso' | 'erro';
        mensagem?: string;
    }>;
}

/**
 * Gera um template vazio para importação de clientes
 */
export function generateEmptyTemplate(): ClientesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        clientes: [
            {
                nome: 'Cliente Exemplo LTDA',
                cpfCnpj: '00.000.000/0000-00',
                email: 'contato@exemplo.com',
                telefone: '(00) 00000-0000',
                endereco: 'Rua Exemplo, 123',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '00000-000',
                tipo: 'PJ',
                ativo: true
            }
        ]
    };
}

/**
 * Gera template com exemplos
 */
export function generateExampleTemplate(): ClientesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        clientes: [
            {
                nome: 'Empresa ABC Construções LTDA',
                cpfCnpj: '12.345.678/0001-90',
                email: 'contato@abcconstrucoes.com.br',
                telefone: '(11) 98765-4321',
                endereco: 'Av. Paulista, 1000',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '01310-100',
                tipo: 'PJ',
                ativo: true
            },
            {
                nome: 'João Silva',
                cpfCnpj: '123.456.789-00',
                email: 'joao.silva@email.com',
                telefone: '(11) 91234-5678',
                endereco: 'Rua das Flores, 456',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '04567-890',
                tipo: 'PF',
                ativo: true
            },
            {
                nome: 'Construtora XYZ S/A',
                cpfCnpj: '98.765.432/0001-10',
                email: 'comercial@construtoraXYZ.com.br',
                telefone: '(21) 3456-7890',
                endereco: 'Rua do Comércio, 789',
                cidade: 'Rio de Janeiro',
                estado: 'RJ',
                cep: '20000-000',
                tipo: 'PJ',
                ativo: true
            }
        ]
    };
}

/**
 * Exporta clientes para JSON
 */
export function exportToJSON(clientes: ClienteTemplate[]): ClientesImportData {
    return {
        versao: '1.0.0',
        dataExportacao: new Date().toISOString(),
        clientes: clientes.map(c => ({
            nome: c.nome,
            cpfCnpj: c.cpfCnpj,
            email: c.email || '',
            telefone: c.telefone || '',
            endereco: c.endereco || '',
            cidade: c.cidade || '',
            estado: c.estado || '',
            cep: c.cep || '',
            tipo: c.tipo || 'PJ',
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

    if (!data.clientes || !Array.isArray(data.clientes)) {
        errors.push('Campo "clientes" deve ser um array');
        return { valid: false, errors };
    }

    if (data.clientes.length === 0) {
        errors.push('Array "clientes" está vazio');
        return { valid: false, errors };
    }

    // Validar cada cliente
    data.clientes.forEach((cliente: any, index: number) => {
        const linha = index + 1;

        if (!cliente.nome) {
            errors.push(`Linha ${linha}: Campo "nome" é obrigatório`);
        }

        if (!cliente.cpfCnpj) {
            errors.push(`Linha ${linha}: Campo "cpfCnpj" é obrigatório`);
        }

        if (cliente.tipo && !['PF', 'PJ'].includes(cliente.tipo)) {
            errors.push(`Linha ${linha}: Campo "tipo" deve ser "PF" ou "PJ"`);
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
export async function readJSONFile(file: File): Promise<ClientesImportData> {
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
export function downloadJSON(data: ClientesImportData, filename: string = 'clientes-template.json') {
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

