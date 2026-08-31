import { prisma } from '../lib/prisma';

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
        const gasto = await prisma.gastoVeiculo.create({
            data: {
                ...data,
                data: new Date(data.data),
                litros: data.litros != null ? data.litros : undefined,
            },
            include: {
                veiculo: true
            }
        });

        if (data.tipo === 'Combustível' && data.km != null) {
            const veiculo = await prisma.veiculo.findUnique({ where: { id: data.veiculoId } });
            if (veiculo && data.km > veiculo.kmAtual) {
                await prisma.veiculo.update({
                    where: { id: data.veiculoId },
                    data: { kmAtual: data.km },
                });
            }
        }

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
            updateData.data = new Date(data.data);
        }
        if (data.litros !== undefined) {
            updateData.litros = data.litros;
        }

        const gasto = await prisma.gastoVeiculo.update({
            where: { id },
            data: updateData,
            include: { veiculo: true },
        });

        if (gasto.tipo === 'Combustível' && gasto.km != null) {
            const km = Number(gasto.km);
            if (km > gasto.veiculo.kmAtual) {
                await prisma.veiculo.update({
                    where: { id: gasto.veiculoId },
                    data: { kmAtual: km },
                });
            }
        }

        return gasto;
    },

    async deletarGasto(id: string) {
        return await prisma.gastoVeiculo.delete({
            where: { id }
        });
    }
};
