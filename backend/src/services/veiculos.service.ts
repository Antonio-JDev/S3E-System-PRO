import { prisma } from '../lib/prisma';

export const VeiculosService = {
    // Listar todos os veículos
    async listarVeiculos() {
        const veiculos = await prisma.veiculo.findMany({
            include: {
                gastos: {
                    orderBy: { data: 'desc' }
                }
            },
            orderBy: { modelo: 'asc' }
        });

        // Calcular gasto total de cada veículo
        return veiculos.map(veiculo => ({
            ...veiculo,
            gastoTotal: veiculo.gastos.reduce((sum, g) => sum + Number(g.valor), 0)
        }));
    },

    // Buscar veículo por ID
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

        return {
            ...veiculo,
            gastoTotal: veiculo.gastos.reduce((sum, g) => sum + Number(g.valor), 0)
        };
    },

    // Criar veículo
    async criarVeiculo(data: {
        modelo: string;
        placa: string;
        tipo: string;
        ano: number;
        status?: string;
        kmAtual?: number;
    }) {
        return await prisma.veiculo.create({
            data
        });
    },

    // Atualizar veículo
    async atualizarVeiculo(id: string, data: {
        modelo?: string;
        placa?: string;
        tipo?: string;
        ano?: number;
        status?: string;
        kmAtual?: number;
    }) {
        return await prisma.veiculo.update({
            where: { id },
            data
        });
    },

    // Deletar veículo
    async deletarVeiculo(id: string) {
        return await prisma.veiculo.delete({
            where: { id }
        });
    },

    // Obter métricas de frota
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

        return {
            totalVeiculos,
            gastosMes,
            combustivel,
            manutencao
        };
    }
};

