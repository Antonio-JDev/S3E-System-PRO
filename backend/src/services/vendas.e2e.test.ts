/**
 * Teste de integração (DB) do fluxo:
 * Orçamento aprovado → gerar Pedido de Venda → gerar Contas a Receber
 *
 * Valida que:
 * - venda.valorTotal == soma(contaReceber.valorParcela) (entrada + parcelas)
 * - quando há itens vendaDiretaFornecedor, eles NÃO entram em venda.valorTotal nem em contas a receber
 *
 * Requisitos:
 * - `DATABASE_URL` apontando para um Postgres acessível
 * - migrations aplicadas no banco de teste
 */
jest.mock('./estoque.service', () => ({
  EstoqueService: {
    processarBaixaOrcamento: jest.fn().mockResolvedValue({ success: true }),
    verificarDisponibilidadeOrcamento: jest.fn().mockResolvedValue({ disponivel: true }),
  },
}));

import { prisma } from '../lib/prisma';
import { VendasService } from './vendas.service';

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sum(vals: Array<number | null | undefined>): number {
  return round2(
    vals.reduce<number>((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0)
  );
}

function hasDatabaseUrl(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;
}

describe('E2E Vendas/Contas a Receber (DB)', () => {
  beforeAll(async () => {
    if (!hasDatabaseUrl()) return;
    await prisma.$connect();
  });

  afterAll(async () => {
    if (!hasDatabaseUrl()) return;
    await prisma.$disconnect();
  });

  it('deve bater PV x Contas a Receber (sem venda direta)', async () => {
    if (!hasDatabaseUrl()) {
      return;
    }

    const now = Date.now();
    const cpfCnpj = `999999${String(now).slice(-8)}`.padEnd(11, '0').slice(0, 11);

    const cliente = await prisma.cliente.create({
      data: {
        nome: `Cliente Teste ${now}`,
        cpfCnpj,
        tipo: 'PF',
        ativo: true,
      },
    });

    const orcamento = await prisma.orcamento.create({
      data: {
        clienteId: cliente.id,
        titulo: `Orçamento Teste ${now}`,
        validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Aprovado',
        bdi: 0,
        custoTotal: 100,
        precoVenda: 200,
      },
    });

    await prisma.orcamentoItem.create({
      data: {
        orcamentoId: orcamento.id,
        tipo: 'MATERIAL',
        quantidade: 1,
        custoUnit: 100,
        precoUnit: 200,
        subtotal: 200,
      },
    });

    try {
      const res = await VendasService.realizarVenda({
        orcamentoId: orcamento.id,
        clienteId: cliente.id,
        valorTotal: 200,
        formaPagamento: 'Parcelado',
        parcelas: 2,
        valorEntrada: 50,
      });

      const venda = await prisma.venda.findUnique({
        where: { id: res.venda.id },
        include: { contasReceber: true },
      });

      expect(venda).toBeTruthy();
      expect(venda?.orcamentoId).toBe(orcamento.id);
      expect(venda?.clienteId).toBe(cliente.id);

      const totalPV = round2(venda?.valorTotal || 0);
      const totalCR = sum((venda?.contasReceber || []).map((c) => c.valorParcela));

      expect(totalPV).toBe(200);
      expect(totalCR).toBe(200);
    } finally {
      // limpeza (ordem por FK)
      const vendaRow = await prisma.venda.findUnique({ where: { orcamentoId: orcamento.id } });
      if (vendaRow) {
        await prisma.contaReceber.deleteMany({ where: { vendaId: vendaRow.id } });
        await prisma.venda.delete({ where: { id: vendaRow.id } });
      }
      await prisma.orcamentoItem.deleteMany({ where: { orcamentoId: orcamento.id } });
      await prisma.orcamento.delete({ where: { id: orcamento.id } });
      await prisma.cliente.delete({ where: { id: cliente.id } });
    }
  }, 120_000);

  it('deve excluir vendaDiretaFornecedor do PV/Contas a Receber', async () => {
    if (!hasDatabaseUrl()) {
      return;
    }

    const now = Date.now();
    const cpfCnpj = `888888${String(now).slice(-8)}`.padEnd(11, '0').slice(0, 11);

    const cliente = await prisma.cliente.create({
      data: {
        nome: `Cliente Teste VD ${now}`,
        cpfCnpj,
        tipo: 'PF',
        ativo: true,
      },
    });

    // preço de venda do orçamento inclui tudo (inclusive venda direta)
    const precoVendaOrcamento = 1000;
    const vendaDiretaSubtotal = 300;
    const esperadoPV = round2(precoVendaOrcamento - vendaDiretaSubtotal);

    const orcamento = await prisma.orcamento.create({
      data: {
        clienteId: cliente.id,
        titulo: `Orçamento VD ${now}`,
        validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Aprovado',
        bdi: 0,
        custoTotal: 400,
        precoVenda: precoVendaOrcamento,
      },
    });

    // item normal (entra no PV)
    await prisma.orcamentoItem.create({
      data: {
        orcamentoId: orcamento.id,
        tipo: 'MATERIAL',
        quantidade: 1,
        custoUnit: 100,
        precoUnit: 700,
        subtotal: 700,
        vendaDiretaFornecedor: false,
      } as any,
    });

    // item venda direta (não entra no PV/financeiro)
    await prisma.orcamentoItem.create({
      data: {
        orcamentoId: orcamento.id,
        tipo: 'MATERIAL',
        quantidade: 1,
        custoUnit: 0,
        precoUnit: vendaDiretaSubtotal,
        subtotal: vendaDiretaSubtotal,
        vendaDiretaFornecedor: true,
      } as any,
    });

    try {
      const res = await VendasService.realizarVenda({
        orcamentoId: orcamento.id,
        clienteId: cliente.id,
        valorTotal: precoVendaOrcamento,
        formaPagamento: 'À vista',
        parcelas: 1,
        valorEntrada: 0,
      });

      const venda = await prisma.venda.findUnique({
        where: { id: res.venda.id },
        include: { contasReceber: true },
      });

      expect(venda).toBeTruthy();

      const totalPV = round2(venda?.valorTotal || 0);
      const totalCR = sum((venda?.contasReceber || []).map((c) => c.valorParcela));

      expect(totalPV).toBe(esperadoPV);
      expect(totalCR).toBe(esperadoPV);
    } finally {
      const vendaRow = await prisma.venda.findUnique({ where: { orcamentoId: orcamento.id } });
      if (vendaRow) {
        await prisma.contaReceber.deleteMany({ where: { vendaId: vendaRow.id } });
        await prisma.venda.delete({ where: { id: vendaRow.id } });
      }
      await prisma.orcamentoItem.deleteMany({ where: { orcamentoId: orcamento.id } });
      await prisma.orcamento.delete({ where: { id: orcamento.id } });
      await prisma.cliente.delete({ where: { id: cliente.id } });
    }
  }, 120_000);
});

