/**
 * Utilitários para geração automática de códigos de serviços
 */

export type TipoServicoClassificacao = 'MAO_DE_OBRA' | 'MONTAGEM' | 'ENGENHARIA' | 'PROJETOS' | 'ADMINISTRATIVO';

/**
 * Mapeia tipo de serviço para prefixo do código
 */
export function getCodigoPrefix(tipoServico: TipoServicoClassificacao): string {
    switch (tipoServico) {
        case 'MAO_DE_OBRA':
            return 'MOB';
        case 'MONTAGEM':
            return 'MONT';
        case 'ENGENHARIA':
        case 'PROJETOS':
            return 'ENG-PRO';
        case 'ADMINISTRATIVO':
            return 'ADM';
        default:
            return 'SERV';
    }
}

/**
 * Extrai o número sequencial de um código existente
 * Ex: "MOB-001" -> 1, "MOB-123" -> 123
 */
export function extractSequentialNumber(codigo: string, prefix: string): number | null {
    const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    const match = codigo.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

/**
 * Gera o próximo código sequencial para um tipo de serviço
 * @param servicosExistentes Lista de serviços existentes
 * @param tipoServico Tipo de serviço para gerar o código
 * @returns Código no formato "PREFIX-XXX" (ex: "MOB-001")
 */
export function gerarProximoCodigo(
    servicosExistentes: Array<{ codigo: string; tipoServico?: string }>,
    tipoServico: TipoServicoClassificacao
): string {
    const prefix = getCodigoPrefix(tipoServico);
    
    // Filtrar serviços do mesmo tipo
    const servicosDoTipo = servicosExistentes.filter(s => {
        const servicoTipo = (s as any).tipoServico || s.tipoServico;
        // Para ENGENHARIA e PROJETOS, usar o mesmo prefixo
        if (tipoServico === 'ENGENHARIA' || tipoServico === 'PROJETOS') {
            return servicoTipo === 'ENGENHARIA' || servicoTipo === 'PROJETOS';
        }
        return servicoTipo === tipoServico;
    });
    
    // Extrair números sequenciais
    const numeros = servicosDoTipo
        .map(s => extractSequentialNumber(s.codigo, prefix))
        .filter((num): num is number => num !== null)
        .sort((a, b) => b - a); // Ordenar do maior para o menor
    
    // Próximo número é o maior + 1, ou 1 se não houver nenhum
    const proximoNumero = numeros.length > 0 ? numeros[0] + 1 : 1;
    
    // Formatar com 3 dígitos (001, 002, etc)
    const numeroFormatado = proximoNumero.toString().padStart(3, '0');
    
    return `${prefix}-${numeroFormatado}`;
}

/**
 * Formata o nome do tipo de serviço para exibição
 */
export function formatTipoServicoNome(tipoServico: TipoServicoClassificacao): string {
    switch (tipoServico) {
        case 'MAO_DE_OBRA':
            return 'Mão de Obra';
        case 'MONTAGEM':
            return 'Montagem';
        case 'ENGENHARIA':
            return 'Engenharia';
        case 'PROJETOS':
            return 'Projetos';
        case 'ADMINISTRATIVO':
            return 'Administrativo';
        default:
            return tipoServico;
    }
}

/**
 * Retorna a cor e estilo para cada tipo de serviço
 */
export function getTipoServicoStyle(tipoServico: TipoServicoClassificacao): {
    bg: string;
    text: string;
    ring: string;
    icon: string;
} {
    switch (tipoServico) {
        case 'MAO_DE_OBRA':
            return {
                bg: 'bg-blue-100',
                text: 'text-blue-800',
                ring: 'ring-1 ring-blue-200',
                icon: '🔧'
            };
        case 'MONTAGEM':
            return {
                bg: 'bg-green-100',
                text: 'text-green-800',
                ring: 'ring-1 ring-green-200',
                icon: '⚙️'
            };
        case 'ENGENHARIA':
        case 'PROJETOS':
            return {
                bg: 'bg-purple-100',
                text: 'text-purple-800',
                ring: 'ring-1 ring-purple-200',
                icon: '📐'
            };
        case 'ADMINISTRATIVO':
            return {
                bg: 'bg-orange-100',
                text: 'text-orange-800',
                ring: 'ring-1 ring-orange-200',
                icon: '📋'
            };
        default:
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-800',
                ring: 'ring-1 ring-gray-200',
                icon: '🛠️'
            };
    }
}
