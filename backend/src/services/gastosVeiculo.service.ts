import { prisma } from '../lib/prisma';
import { parseDataDiaCivilInput } from '../utils/vencimentoVeiculo.util';
import {
    dadosContaPagarDeGasto,
    patchContaPagarAposEdicaoGasto,
} from '../utils/gastoVeiculoContaPagar.util';

type GastoComVeiculo = {
    id: string;
    tipo: string;
    descricao: string | null;
    valor: { toString(): string } | number | string;
    data: Date;
    km: number | null;
    veiculoId: string;
    veiculo: { id: string; modelo: string; placa: string; kmAtual: number };
};

async function sincronizarKmCombustivel(
    tx: any,
    gasto: { tipo: string; km: number | null; veiculoId: string; veiculo: { kmAtual: number } },
) {
    if (gasto.tipo !== 'Combustível' || gasto.km == null) return;
    const km = Number(gasto.km);
    if (km > gasto.veiculo.kmAtual) {
        await tx.veiculo.update({
            where: { id: gasto.veiculoId },
            data: { kmAtual: km },
        });
    }
}

async function gravarContaDoGasto(tx: any, gasto: GastoComVeiculo) {
    const existente = await tx.contaPagar.findUnique({ where: { gastoVeiculoId: gasto.id } });
    if (!existente) {
        await tx.contaPagar.create({
            data: dadosContaPagarDeGasto(gasto, gasto.veiculo),
        });
        return;
    }
    await tx.contaPagar.update({
        where: { gastoVeiculoId: gasto.id },
        data: patchContaPagarAposEdicaoGasto(existente, gasto, gasto.veiculo),
    });
}

export const GastosVeiculoService = {
    async listarGastos(veiculoId?: string) {
        const where = veiculoId ? { veiculoId } : {};
        
        return await prisma.gastoVeiculo.findMany({
            where,
            include: {
                veiculo: {
                    select: {
                        id: true,
                        modelo: true,
                        placa: true
                    }
                }
            },
            orderBy: { data: 'desc' }
        });
    },

    async buscarGasto(id: string) {
        return await prisma.gastoVeiculo.findUnique({
            where: { id },
            include: {
                veiculo: true
            }
        });
    },

    async criarGasto(data: {
        veiculoId: string;
        tipo: string;
        descricao?: string;
        valor: number;
        data: string;
        km?: number;
        litros?: number;
        obraId?: string;
        responsavel?: string;
    }) {
        const gasto = await prisma.$transaction(async (tx) => {
            const criado = await tx.gastoVeiculo.create({
                data: {
                    ...data,
                    data: parseDataDiaCivilInput(data.data) ?? new Date(),
                    litros: data.litros != null ? data.litros : undefined,
                },
                include: {
                    veiculo: true
                }
            });

            await gravarContaDoGasto(tx, criado);
            await sincronizarKmCombustivel(tx, criado);
            return criado;
        });

        return gasto;
    },

    async atualizarGasto(id: string, data: {
        tipo?: string;
        descricao?: string;
        valor?: number;
        data?: string;
        km?: number;
        litros?: number;
        obraId?: string;
        responsavel?: string;
    }) {
        const updateData: Record<string, unknown> = { ...data };
        if (data.data) {
            updateData.data = parseDataDiaCivilInput(data.data);
        }
        if (data.litros !== undefined) {
            updateData.litros = data.litros;
        }

        const gasto = await prisma.$transaction(async (tx) => {
            const atualizado = await tx.gastoVeiculo.update({
                where: { id },
                data: updateData,
                include: { veiculo: true },
            });
            await gravarContaDoGasto(tx, atualizado);
            await sincronizarKmCombustivel(tx, atualizado);
            return atualizado;
        });

        return gasto;
    },

    async deletarGasto(id: string) {
        return await prisma.gastoVeiculo.delete({
            where: { id }
        });
    }
};
