import { prisma } from '../lib/prisma';

export const GastosVeiculoService = {
    // Listar todos os gastos
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

    // Buscar gasto por ID
    async buscarGasto(id: string) {
        return await prisma.gastoVeiculo.findUnique({
            where: { id },
            include: {
                veiculo: true
            }
        });
    },

    // Criar gasto
    async criarGasto(data: {
        veiculoId: string;
        tipo: string;
        descricao?: string;
        valor: number;
        data: string;
        km?: number;
        obraId?: string;
        responsavel?: string;
    }) {
        return await prisma.gastoVeiculo.create({
            data: {
                ...data,
                data: new Date(data.data)
            },
            include: {
                veiculo: true
            }
        });
    },

    // Atualizar gasto
    async atualizarGasto(id: string, data: {
        tipo?: string;
        descricao?: string;
        valor?: number;
        data?: string;
        km?: number;
        obraId?: string;
        responsavel?: string;
    }) {
        const updateData: any = { ...data };
        if (data.data) {
            updateData.data = new Date(data.data);
        }

        return await prisma.gastoVeiculo.update({
            where: { id },
            data: updateData
        });
    },

    // Deletar gasto
    async deletarGasto(id: string) {
        return await prisma.gastoVeiculo.delete({
            where: { id }
        });
    }
};

