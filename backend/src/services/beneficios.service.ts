import { prisma } from '../lib/prisma';

export const BeneficiosService = {
  async listar() {
    return prisma.beneficio.findMany({
      orderBy: { nome: 'asc' },
    });
  },

  async buscar(id: string) {
    return prisma.beneficio.findUnique({
      where: { id },
    });
  },

  async criar(data: { nome: string; valorPadrao: number; ativo?: boolean }) {
    return prisma.beneficio.create({
      data: {
        nome: data.nome,
        valorPadrao: data.valorPadrao,
        ativo: data.ativo ?? true,
      },
    });
  },

  async atualizar(
    id: string,
    data: Partial<{ nome: string; valorPadrao: number; ativo: boolean }>,
  ) {
    return prisma.beneficio.update({
      where: { id },
      data,
    });
  },

  async deletar(id: string) {
    return prisma.beneficio.delete({
      where: { id },
    });
  },
};

