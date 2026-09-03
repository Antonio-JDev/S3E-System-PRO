import { LancamentoFolhaCategoria, TipoContratoFuncionario } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { inicioFimMesCivilUtc } from '../utils/datetime-sp.util';
import { recalcularMetricasFuncionario } from './ponto.service';

const CATEGORIAS_DESCONTO_FOLHA = new Set<LancamentoFolhaCategoria>([
    LancamentoFolhaCategoria.ADIANTAMENTO,
    LancamentoFolhaCategoria.FALTA,
    LancamentoFolhaCategoria.FALTA_JUSTIFICADA,
    LancamentoFolhaCategoria.DESCONTO_OUTRO,
]);

function parseMesRef(mesRef?: string): { ano: number; mes: number } {
    if (mesRef && /^\d{4}-\d{2}$/.test(mesRef)) {
        const [a, m] = mesRef.split('-').map((v) => parseInt(v, 10));
        return { ano: a, mes: m };
    }
    const hoje = new Date();
    return { ano: hoje.getUTCFullYear(), mes: hoje.getUTCMonth() + 1 };
}

/** Estimativa leve do total da folha na competência (sem recalcular ponto/HE). */
function estimarTotalFolhaCompetencia(f: {
    tipoContrato: TipoContratoFuncionario;
    salarioBase: { toString(): string } | null;
    salario: { toString(): string };
    valorDiaria: { toString(): string } | null;
    beneficios: Array<{ valorPadrao: { toString(): string } }>;
    lancamentosFolha: Array<{ categoria: LancamentoFolhaCategoria; valor: { toString(): string } }>;
    diasComPonto?: number;
}): number {
    const salarioBaseNum =
        f.salarioBase != null ? Number(f.salarioBase) : Number(f.salario ?? 0);
    const totalBeneficios = f.beneficios.reduce(
        (sum, b) => sum + Number(b.valorPadrao ?? 0),
        0,
    );

    let acrescimos = 0;
    let subtracoes = 0;
    for (const l of f.lancamentosFolha) {
        const valor = Number(l.valor ?? 0);
        if (
            l.categoria === LancamentoFolhaCategoria.ACRESCIMO ||
            l.categoria === LancamentoFolhaCategoria.PAGAMENTO_BANCO_HORAS
        ) {
            acrescimos += valor;
        } else if (CATEGORIAS_DESCONTO_FOLHA.has(l.categoria)) {
            subtracoes += valor;
        }
    }

    if (f.tipoContrato === TipoContratoFuncionario.REGISTRADO) {
        return salarioBaseNum + totalBeneficios + acrescimos - subtracoes;
    }

    const dias = f.diasComPonto ?? 0;
    const valorDiaria = Number(f.valorDiaria ?? 0);
    return dias * valorDiaria + totalBeneficios + acrescimos - subtracoes;
}

export const FuncionariosService = {
    // Listar todos os funcionários (vales opcionalmente filtrados por competência YYYY-MM)
    async listarFuncionarios(mesRef?: string) {
        const valesInclude: { orderBy: { data: 'desc' }; where?: { data: { gte: Date; lte: Date } } } = {
            orderBy: { data: 'desc' },
        };

        if (mesRef && /^\d{4}-\d{2}$/.test(mesRef)) {
            const { ano, mes } = parseMesRef(mesRef);
            const { inicio, fim } = inicioFimMesCivilUtc(ano, mes);
            valesInclude.where = { data: { gte: inicio, lte: fim } };
        }

        return await prisma.funcionario.findMany({
            include: {
                vales: valesInclude,
            },
            orderBy: { nome: 'asc' },
        });
    },

    // Buscar funcionário por ID
    async buscarFuncionario(id: string) {
        return await prisma.funcionario.findUnique({
            where: { id },
            include: {
                vales: {
                    orderBy: { data: 'desc' }
                }
            }
        });
    },

    // Criar funcionário
    async criarFuncionario(data: {
        nome: string;
        cargo: string;
        salario: number;
        dataAdmissao: string;
        cpf: string;
        telefone?: string;
        email?: string;
        status?: string;
        diaPagamento?: number;
        uniformeCamisa?: string;
        uniformeCalca?: string;
        uniformeBermuda?: string;
        uniformeSapato?: string;
        // Campos adicionais do módulo de RH
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS';
        salarioBase?: number;
        valorHora?: number;
        codigoRelogio?: number | null;
        valorDiaria?: number | null;
        descontoDiariaSemBatidaAutonomo?: boolean;
        cargaHorariaMensal?: number | null;
        saldoBancoHoras?: number | null;
        permitirHorasExtras100?: boolean;
        valorHoraNormalAutonomo?: number | null;
        valorHoraExtra50Autonomo?: number | null;
        valorHoraExtra100Autonomo?: number | null;
        valorHoraNoturna20Autonomo?: number | null;
    }) {
        return await prisma.funcionario.create({
            data: {
                ...data,
                dataAdmissao: new Date(data.dataAdmissao),
                // Garantir valores padrão consistentes
                tipoContrato: (data.tipoContrato as any) ?? 'REGISTRADO'
            }
        });
    },

    // Atualizar funcionário
    async atualizarFuncionario(id: string, data: {
        nome?: string;
        cargo?: string;
        salario?: number;
        dataAdmissao?: string;
        cpf?: string;
        telefone?: string;
        email?: string;
        status?: string;
        diaPagamento?: number;
        uniformeCamisa?: string;
        uniformeCalca?: string;
        uniformeBermuda?: string;
        uniformeSapato?: string;
        // Campos adicionais do módulo de RH
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS';
        salarioBase?: number;
        valorHora?: number;
        codigoRelogio?: number | null;
        valorDiaria?: number | null;
        descontoDiariaSemBatidaAutonomo?: boolean;
        cargaHorariaMensal?: number | null;
        saldoBancoHoras?: number | null;
        permitirHorasExtras100?: boolean;
        valorHoraNormalAutonomo?: number | null;
        valorHoraExtra50Autonomo?: number | null;
        valorHoraExtra100Autonomo?: number | null;
        valorHoraNoturna20Autonomo?: number | null;
    }) {
        const updateData: any = { ...data };
        if (data.dataAdmissao) {
            updateData.dataAdmissao = new Date(data.dataAdmissao);
        }

        const antes =
            data.tipoContrato != null
                ? await prisma.funcionario.findUnique({
                      where: { id },
                      select: { tipoContrato: true },
                  })
                : null;

        const updated = await prisma.funcionario.update({
            where: { id },
            data: updateData,
        });

        // Troca CLT ↔ Autônomo: recalcula métricas de ponto (atraso/extra vs diária/tarifas)
        if (
            data.tipoContrato != null &&
            antes &&
            String(antes.tipoContrato) !== String(data.tipoContrato)
        ) {
            try {
                await recalcularMetricasFuncionario(id);
            } catch (e) {
                console.error(
                    `[FuncionariosService] Falha ao recalcular ponto após troca de contrato (${id}):`,
                    e,
                );
            }
        }

        return updated;
    },

    // Histórico de pagamentos (contas a pagar RH) do funcionário
    async historicoPagamentos(funcionarioId: string) {
        return await prisma.contaPagar.findMany({
            where: {
                tipo: 'RH',
                funcionarioId
            },
            orderBy: { dataVencimento: 'desc' }
        });
    },

    // Deletar funcionário
    async deletarFuncionario(id: string) {
        return await prisma.funcionario.delete({
            where: { id }
        });
    },

    /**
     * Obter métricas de RH usando regras de folha (CLT e Autônomos).
     * @param mesRef Opcional: YYYY-MM para filtrar por competência; se omitido, usa mês atual.
     */
    async obterMetricasRH(mesRef?: string) {
        const { ano, mes } = parseMesRef(mesRef);
        const { inicio, fim } = inicioFimMesCivilUtc(ano, mes);

        const [totalFuncionarios, valesAgg, funcionarios, diasPontoPorFuncionario] =
            await Promise.all([
                prisma.funcionario.count({ where: { status: 'Ativo' } }),
                prisma.vale.aggregate({
                    where: {
                        data: { gte: inicio, lte: fim },
                        funcionario: { status: 'Ativo' },
                    },
                    _sum: { valor: true },
                }),
                prisma.funcionario.findMany({
                    where: { status: 'Ativo' },
                    select: {
                        id: true,
                        tipoContrato: true,
                        salarioBase: true,
                        salario: true,
                        valorDiaria: true,
                        beneficios: {
                            where: { ativo: true },
                            select: { valorPadrao: true },
                        },
                        lancamentosFolha: {
                            where: { referenciaAno: ano, referenciaMes: mes },
                            select: { categoria: true, valor: true },
                        },
                    },
                    orderBy: { nome: 'asc' },
                }),
                prisma.registroPonto.groupBy({
                    by: ['funcionarioId'],
                    where: { dataReferencia: { gte: inicio, lte: fim } },
                    _count: { id: true },
                }),
            ]);

        const diasPontoMap = new Map(
            diasPontoPorFuncionario.map((row) => [row.funcionarioId, row._count.id]),
        );

        const porFuncionario = funcionarios.map((f) => {
            const salarioBaseNum =
                f.salarioBase != null ? Number(f.salarioBase) : Number(f.salario ?? 0);
            const totalAPagar = estimarTotalFolhaCompetencia({
                ...f,
                diasComPonto: diasPontoMap.get(f.id) ?? 0,
            });
            return {
                funcionarioId: f.id,
                tipoContrato: f.tipoContrato,
                salarioBase: salarioBaseNum,
                valorDiaria: f.valorDiaria != null ? Number(f.valorDiaria) : null,
                totalAPagar,
            };
        });

        const folhaPagamento = porFuncionario.reduce((sum, row) => sum + row.totalAPagar, 0);
        const valesMes = Number(valesAgg._sum.valor ?? 0);
        const custoTotal = folhaPagamento + valesMes;

        return {
            totalFuncionarios,
            folhaPagamento,
            valesMes,
            custoTotal,
            referencia: { ano, mes },
            porFuncionario,
        };
    }
};

