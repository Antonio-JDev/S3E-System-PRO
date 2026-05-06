import { prisma } from '../lib/prisma';

export const ValesService = {
    // Listar todos os vales
    async listarVales(funcionarioId?: string) {
        const where = funcionarioId ? { funcionarioId } : {};
        
        return await prisma.vale.findMany({
            where,
            include: {
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                        cargo: true
                    }
                }
            },
            orderBy: { data: 'desc' }
        });
    },

    // Buscar vale por ID
    async buscarVale(id: string) {
        return await prisma.vale.findUnique({
            where: { id },
            include: {
                funcionario: true
            }
        });
    },

    // Criar vale
    async criarVale(data: {
        funcionarioId: string;
        tipo: string;
        valor: number;
        data: string;
        descricao?: string;
    }) {
        return await prisma.vale.create({
            data: {
                ...data,
                data: new Date(data.data)
            },
            include: {
                funcionario: true
            }
        });
    },

    // Atualizar vale
    async atualizarVale(id: string, data: {
        tipo?: string;
        valor?: number;
        data?: string;
        descricao?: string;
    }) {
        const updateData: any = { ...data };
        if (data.data) {
            updateData.data = new Date(data.data);
        }

        return await prisma.vale.update({
            where: { id },
            data: updateData
        });
    },

    // Deletar vale
    async deletarVale(id: string) {
        return await prisma.vale.delete({
            where: { id }
        });
    }
};

