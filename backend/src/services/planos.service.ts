import { prisma } from '../lib/prisma';

export const PlanosService = {
    // Listar todos os planos
    async listarPlanos(status?: string) {
        const where = status ? { status } : {};
        
        return await prisma.planoEstrategico.findMany({
            where,
            orderBy: [
                { status: 'asc' },
                { prioridade: 'desc' },
                { prazo: 'asc' }
            ]
        });
    },

    // Buscar plano por ID
    async buscarPlano(id: string) {
        return await prisma.planoEstrategico.findUnique({
            where: { id }
        });
    },

    // Criar plano
    async criarPlano(data: {
        titulo: string;
        descricao: string;
        prazo: string;
        responsavel: string;
        prioridade?: string;
        status?: string;
        categoria?: string;
    }) {
        return await prisma.planoEstrategico.create({
            data: {
                ...data,
                prazo: new Date(data.prazo)
            }
        });
    },

    // Atualizar plano
    async atualizarPlano(id: string, data: {
        titulo?: string;
        descricao?: string;
        prazo?: string;
        responsavel?: string;
        prioridade?: string;
        status?: string;
        categoria?: string;
    }) {
        const updateData: any = { ...data };
        if (data.prazo) {
            updateData.prazo = new Date(data.prazo);
        }

        return await prisma.planoEstrategico.update({
            where: { id },
            data: updateData
        });
    },

    // Alternar status do plano (Pendente <-> Concluído)
    async toggleStatus(id: string) {
        const plano = await prisma.planoEstrategico.findUnique({
            where: { id }
        });

        if (!plano) {
            throw new Error('Plano não encontrado');
        }

        const novoStatus = plano.status === 'Concluído' ? 'Pendente' : 'Concluído';

        return await prisma.planoEstrategico.update({
            where: { id },
            data: { status: novoStatus }
        });
    },

    // Deletar plano
    async deletarPlano(id: string) {
        return await prisma.planoEstrategico.delete({
            where: { id }
        });
    },

    // Obter métricas de planos
    async obterMetricas() {
        const planos = await prisma.planoEstrategico.findMany();

        const altaPrioridade = planos.filter(p => p.prioridade === 'Alta' && p.status !== 'Concluído').length;
        const mediaPrioridade = planos.filter(p => p.prioridade === 'Média' && p.status !== 'Concluído').length;
        const concluidos = planos.filter(p => p.status === 'Concluído').length;
        const emAndamento = planos.filter(p => p.status === 'Em Andamento').length;

        return {
            altaPrioridade,
            mediaPrioridade,
            concluidos,
            emAndamento,
            total: planos.length
        };
    }
};

