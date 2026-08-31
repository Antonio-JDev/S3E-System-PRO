import { prisma } from '../lib/prisma';
import { calcularResumoConsumo } from '../utils/frotaConsumo.util';
import {
  ipvaJaPagoNoAno,
  ipvaVenceNoMes,
  mesVencimentoIpvaCotaUnica,
  extrairFinalNumericoPlaca,
  nomeMesIpva,
} from '../utils/ipvaPlaca.util';
import { enriquecerVencimentosVeiculo, calcularDiasAteVencimento } from '../utils/vencimentoVeiculo.util';

function mapVeiculoResponse(veiculo: any, extras: Record<string, unknown> = {}) {
  const venc = enriquecerVencimentosVeiculo(veiculo);
  return { ...veiculo, ...extras, ...venc };
}

function parseDataOpcional(value?: string | null): Date | undefined {
  if (value == null || value === '') return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function mapGastoCombustivel(g: { tipo: string; data: Date; km: number | null; litros: unknown }) {
  return {
    tipo: g.tipo,
    data: g.data,
    km: g.km,
    litros: g.litros != null ? Number(g.litros) : null,
  };
}

export const VeiculosService = {
    async listarVeiculos() {
        const veiculos = await prisma.veiculo.findMany({
            include: {
                gastos: {
                    orderBy: { data: 'desc' }
                }
            },
            orderBy: { modelo: 'asc' }
        });

        const mesRef = new Date().toISOString().slice(0, 7);

        return veiculos.map(veiculo => {
            const gastosCombustivel = veiculo.gastos.map(mapGastoCombustivel);
            const consumo = calcularResumoConsumo(gastosCombustivel, mesRef);
            return mapVeiculoResponse(veiculo, {
                gastoTotal: veiculo.gastos.reduce((sum, g) => sum + Number(g.valor), 0),
                consumoMedioTotalKmL: consumo.consumoMedioTotalKmL,
                consumoMedioMesAtualKmL: consumo.consumoMedioMesAtualKmL,
                desempenhoQueda: consumo.desempenhoQueda,
            });
        });
    },

    async buscarVeiculo(id: string) {
        const veiculo = await prisma.veiculo.findUnique({
            where: { id },
            include: {
                gastos: {
                    orderBy: { data: 'desc' }
                }
            }
        });

        if (!veiculo) return null;

        const mesRef = new Date().toISOString().slice(0, 7);
        const consumo = calcularResumoConsumo(veiculo.gastos.map(mapGastoCombustivel), mesRef);

        return mapVeiculoResponse(veiculo, {
            gastoTotal: veiculo.gastos.reduce((sum, g) => sum + Number(g.valor), 0),
            consumoMedioTotalKmL: consumo.consumoMedioTotalKmL,
            consumoMedioMesAtualKmL: consumo.consumoMedioMesAtualKmL,
            desempenhoQueda: consumo.desempenhoQueda,
        });
    },

    async criarVeiculo(data: {
        modelo: string;
        placa: string;
        tipo: string;
        ano: number;
        status?: string;
        kmAtual?: number;
        dataVencimentoIpva?: string;
        dataVencimentoLicenciamento?: string;
    }) {
        return await prisma.veiculo.create({
            data: {
                modelo: data.modelo,
                placa: data.placa,
                tipo: data.tipo,
                ano: data.ano,
                status: data.status,
                kmAtual: data.kmAtual,
                dataVencimentoIpva: parseDataOpcional(data.dataVencimentoIpva),
                dataVencimentoLicenciamento: parseDataOpcional(data.dataVencimentoLicenciamento),
            },
        });
    },

    async atualizarVeiculo(id: string, data: {
        modelo?: string;
        placa?: string;
        tipo?: string;
        ano?: number;
        status?: string;
        kmAtual?: number;
        dataVencimentoIpva?: string | null;
        dataVencimentoLicenciamento?: string | null;
    }) {
        const updateData: Record<string, unknown> = { ...data };
        if (data.dataVencimentoIpva !== undefined) {
            updateData.dataVencimentoIpva =
                data.dataVencimentoIpva ? parseDataOpcional(data.dataVencimentoIpva) : null;
        }
        if (data.dataVencimentoLicenciamento !== undefined) {
            updateData.dataVencimentoLicenciamento =
                data.dataVencimentoLicenciamento
                    ? parseDataOpcional(data.dataVencimentoLicenciamento)
                    : null;
        }
        return await prisma.veiculo.update({
            where: { id },
            data: updateData,
        });
    },

    async deletarVeiculo(id: string) {
        return await prisma.veiculo.delete({
            where: { id }
        });
    },

    async obterConsumoPorVeiculo(veiculoId: string) {
        const veiculo = await prisma.veiculo.findUnique({
            where: { id: veiculoId },
            include: { gastos: { orderBy: { data: 'asc' } } },
        });
        if (!veiculo) return null;
        const mesRef = new Date().toISOString().slice(0, 7);
        return calcularResumoConsumo(veiculo.gastos.map(mapGastoCombustivel), mesRef);
    },

    async obterAlertasIpva(mes?: number, ano?: number) {
        const agora = new Date();
        const mesRef = mes ?? agora.getMonth() + 1;
        const anoRef = ano ?? agora.getFullYear();

        const veiculos = await prisma.veiculo.findMany({
            where: { status: 'Ativo' },
            include: { gastos: { where: { tipo: 'IPVA' } } },
        });

        return veiculos
            .filter((v) => {
                const diasIpva = calcularDiasAteVencimento(v.dataVencimentoIpva);
                if (diasIpva != null && diasIpva <= 30) return true;
                return ipvaVenceNoMes(v.placa, mesRef, anoRef);
            })
            .map((v) => {
                const final = extrairFinalNumericoPlaca(v.placa);
                const mesVenc = final != null ? mesVencimentoIpvaCotaUnica(final) : null;
                return {
                    id: v.id,
                    modelo: v.modelo,
                    placa: v.placa,
                    finalPlaca: final,
                    mesVencimento: mesVenc,
                    mesVencimentoNome: mesVenc ? nomeMesIpva(mesVenc) : null,
                    dataVencimentoIpva: v.dataVencimentoIpva,
                    diasAteVencimentoIpva: calcularDiasAteVencimento(v.dataVencimentoIpva),
                    ipvaPago: ipvaJaPagoNoAno(v.gastos, anoRef),
                };
            });
    },

    async obterMetricasFrota() {
        const veiculos = await prisma.veiculo.findMany({
            where: { status: 'Ativo' },
            include: {
                gastos: {
                    where: {
                        data: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    }
                }
            }
        });

        const totalVeiculos = veiculos.length;
        const gastosMes = veiculos.reduce((sum, v) => 
            sum + v.gastos.reduce((gastoSum, g) => gastoSum + Number(g.valor), 0), 0
        );

        const combustivel = veiculos.reduce((sum, v) => 
            sum + v.gastos
                .filter(g => g.tipo === 'Combustível')
                .reduce((gastoSum, g) => gastoSum + Number(g.valor), 0), 0
        );

        const manutencao = veiculos.reduce((sum, v) => 
            sum + v.gastos
                .filter(g => g.tipo === 'Manutenção')
                .reduce((gastoSum, g) => gastoSum + Number(g.valor), 0), 0
        );

        const alertasIpva = await this.obterAlertasIpva();

        return {
            totalVeiculos,
            gastosMes,
            combustivel,
            manutencao,
            alertasIpva,
        };
    }
};
