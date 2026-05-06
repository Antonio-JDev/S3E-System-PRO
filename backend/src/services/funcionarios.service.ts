import { prisma } from '../lib/prisma';
import { RhService } from './rh.service';
import { inicioFimMesCivilUtc } from '../utils/datetime-sp.util';

export const FuncionariosService = {
    // Listar todos os funcionários
    async listarFuncionarios() {
        return await prisma.funcionario.findMany({
            include: {
                vales: {
                    orderBy: { data: 'desc' }
                }
            },
            orderBy: { nome: 'asc' }
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
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO';
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
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO';
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

        return await prisma.funcionario.update({
            where: { id },
            data: updateData
        });
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
        let ano: number;
        let mes: number;
        if (mesRef && /^\d{4}-\d{2}$/.test(mesRef)) {
            const [a, m] = mesRef.split('-').map((v) => parseInt(v, 10));
            ano = a;
            mes = m;
        } else {
            const hoje = new Date();
            ano = hoje.getUTCFullYear();
            mes = hoje.getUTCMonth() + 1;
        }

        const { inicio, fim } = inicioFimMesCivilUtc(ano, mes);
        const dataReferencia = new Date(Date.UTC(ano, mes - 1, 1, 12, 0, 0, 0));

        const funcionarios = await prisma.funcionario.findMany({
            where: { status: 'Ativo' },
            include: {
                vales: {
                    where: {
                        data: {
                            gte: inicio,
                            lte: fim,
                        }
                    }
                }
            }
        });

        const totalFuncionarios = funcionarios.length;

        const folhas = await Promise.all(
            funcionarios.map((f) =>
                RhService.calcularFolhaMes({
                    funcionarioId: f.id,
                    dataReferencia,
                }).catch(() => null)
            )
        );

        const folhaPagamento = folhas.reduce((sum, folha) => {
            if (!folha) return sum;
            return sum + Number(folha.valores.totalAPagar || 0);
        }, 0);

        /** Resumo por colaborador para tela de RH (base/diária + total da folha na competência). */
        const porFuncionario = funcionarios.map((f, i) => {
            const folha = folhas[i];
            const salarioBaseNum =
                f.salarioBase != null ? Number(f.salarioBase) : Number(f.salario ?? 0);
            return {
                funcionarioId: f.id,
                tipoContrato: f.tipoContrato,
                salarioBase: salarioBaseNum,
                valorDiaria: f.valorDiaria != null ? Number(f.valorDiaria) : null,
                totalAPagar: folha ? Number(folha.valores.totalAPagar ?? 0) : 0,
            };
        });

        const valesMes = funcionarios.reduce(
            (sum, f) =>
                sum +
                f.vales.reduce((valeSum, v) => valeSum + Number(v.valor), 0),
            0
        );

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

