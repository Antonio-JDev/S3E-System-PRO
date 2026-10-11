/**
 * Identifica a parcela de salário (não vale nem adiantamento) da competência.
 * A descrição gerada pela folha é "Salário NOME - AAAA-MM (folha)".
 */
export function contaEhSalarioDaCompetencia(
    conta: {
        subtipo?: string | null;
        descricao?: string | null;
        dataVencimento: Date | string;
    },
    ano: number,
    mes: number,
): boolean {
    const subtipo = conta.subtipo ?? null;
    if (subtipo === 'VALE' || subtipo === 'ADIANTAMENTO') return false;
    if (subtipo && subtipo !== 'SALARIO') return false;

    const descricao = (conta.descricao ?? '').trim();
    const normalizada = descricao.toLowerCase();
    if (normalizada.startsWith('vale') || normalizada.startsWith('adiantamento')) return false;

    const mesReferencia = `${ano}-${String(mes).padStart(2, '0')}`;
    const vencimento = new Date(conta.dataVencimento);
    const noMes =
        !Number.isNaN(vencimento.getTime()) &&
        vencimento.getFullYear() === ano &&
        vencimento.getMonth() + 1 === mes;

    const pareceSalario =
        normalizada.startsWith('salário') ||
        normalizada.startsWith('salario') ||
        normalizada.includes('(folha)');
    const citaCompetencia = descricao.includes(mesReferencia);

    if (subtipo === 'SALARIO') return citaCompetencia || noMes;
    return pareceSalario && (citaCompetencia || noMes);
}
