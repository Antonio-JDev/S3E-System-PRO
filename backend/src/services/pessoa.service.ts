import { FuncaoPessoa } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CriarPessoaDTO {
  nome: string;
  email?: string;
  funcao: FuncaoPessoa;
  disponivel?: boolean;
}

export interface AtualizarPessoaDTO {
  nome?: string;
  email?: string;
  funcao?: FuncaoPessoa;
  disponivel?: boolean;
  ativo?: boolean;
}

export class PessoaService {
  async criarPessoa(data: CriarPessoaDTO) {
    return prisma.pessoa.create({ data });
  }

  async listarPessoas(filtros?: { funcao?: FuncaoPessoa; disponivel?: boolean; ativo?: boolean; busca?: string }) {
    const where: any = {};
    if (filtros?.funcao) where.funcao = filtros.funcao;
    if (typeof filtros?.disponivel === 'boolean') where.disponivel = filtros.disponivel;
    if (typeof filtros?.ativo === 'boolean') where.ativo = filtros.ativo;
    if (filtros?.busca) {
      where.OR = [
        { nome: { contains: filtros.busca, mode: 'insensitive' } },
        { email: { contains: filtros.busca, mode: 'insensitive' } },
      ];
    }
    return prisma.pessoa.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async atualizarPessoa(id: string, data: AtualizarPessoaDTO) {
    return prisma.pessoa.update({ where: { id }, data });
  }

  async excluirPessoa(id: string) {
    // Soft delete: marcar inativo e indisponível
    return prisma.pessoa.update({ where: { id }, data: { ativo: false, disponivel: false } });
  }

  /** Pessoas não presentes em nenhuma equipe ativa (Equipe.ativa = true). */
  async listarPessoasDisponiveisParaEquipe() {
    const equipesAtivas = await prisma.equipe.findMany({ where: { ativa: true }, select: { membros: true } });
    const membrosOcupados = new Set<string>();
    for (const e of equipesAtivas) {
      for (const m of e.membros) membrosOcupados.add(m);
    }
    return prisma.pessoa.findMany({
      where: {
        ativo: true,
        disponivel: true,
        id: { notIn: Array.from(membrosOcupados) }
      },
      orderBy: { nome: 'asc' }
    });
  }
}

export const pessoaService = new PessoaService();


