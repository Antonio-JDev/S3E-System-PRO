/**
 * Épico 1–2 — Disponibilidade profunda de kit (catálogo / OS)
 * Rodar: npm test -- kitDisponibilidade.service.test.ts
 */

jest.mock('./kits.service', () => ({
  KitsService: {
    buscarComposicaoPorId: jest.fn(),
  },
}));

jest.mock('../lib/prisma', () => ({
  prisma: {
    material: { findUnique: jest.fn() },
    projeto: { findUnique: jest.fn() },
    orcamentoItem: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { KitsService } from './kits.service';
import { KitDisponibilidadeService } from './kitDisponibilidade.service';

describe('KitDisponibilidadeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verificarKit', () => {
    it('retorna null quando o kit não existe na composição', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue(null);
      const r = await KitDisponibilidadeService.verificarKit('kit-inexistente');
      expect(r).toBeNull();
    });

    it('marca kit completo quando todos os materiais têm estoque suficiente', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-1',
        nome: 'Quadro QDC',
        items: [
          {
            quantidade: 2,
            materialId: 'mat-a',
            material: { id: 'mat-a', nome: 'Disjuntor', estoque: 10, unidadeMedida: 'UN' },
          },
        ],
        itensFaltantes: [],
      });

      const r = await KitDisponibilidadeService.verificarKit('kit-1', 1);
      expect(r).not.toBeNull();
      expect(r!.completo).toBe(true);
      expect(r!.faltantes).toHaveLength(0);
      expect(r!.itensEstoque).toHaveLength(1);
      expect(r!.itensEstoque[0].possuiEstoque).toBe(true);
    });

    it('marca kit incompleto e lista faltantes quando estoque é insuficiente', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-2',
        nome: 'Kit Teste',
        items: [
          {
            quantidade: 5,
            materialId: 'mat-b',
            material: { id: 'mat-b', nome: 'Cabo', estoque: 2, unidadeMedida: 'M' },
          },
        ],
        itensFaltantes: [],
      });

      const r = await KitDisponibilidadeService.verificarKit('kit-2', 1);
      expect(r!.completo).toBe(false);
      expect(r!.faltantes).toHaveLength(1);
      expect(r!.faltantes[0]).toMatchObject({
        nome: 'Cabo',
        necessario: 5,
        disponivel: 2,
        precisaComprar: true,
      });
    });

    it('inclui banco frio não vinculado em faltantes com precisaVincularBancoFrio', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-3',
        nome: 'Kit BF',
        items: [],
        itensFaltantes: [
          { tipo: 'COTACAO', nome: 'Medidor', quantidade: 1, cotacaoId: 'cot-1' },
        ],
      });

      const r = await KitDisponibilidadeService.verificarKit('kit-3', 2);
      expect(r!.itensBancoFrio).toHaveLength(1);
      expect(r!.faltantes[0].precisaVincularBancoFrio).toBe(true);
      expect(r!.faltantes[0].necessario).toBe(2);
    });

    it('ignora serviços na verificação de faltantes de estoque', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-4',
        nome: 'Kit Serv',
        items: [],
        itensFaltantes: [{ tipo: 'SERVICO', nome: 'Instalação', quantidade: 1 }],
      });

      const r = await KitDisponibilidadeService.verificarKit('kit-4');
      expect(r!.completo).toBe(true);
      expect(r!.itensServicos).toHaveLength(1);
      expect(r!.faltantes).toHaveLength(0);
    });

    it('multiplica quantidade necessária pela quantidade do kit no orçamento', async () => {
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-5',
        nome: 'Kit Qtd',
        items: [
          {
            quantidade: 3,
            materialId: 'mat-c',
            material: { id: 'mat-c', nome: 'Tomada', estoque: 100, unidadeMedida: 'UN' },
          },
        ],
        itensFaltantes: [],
      });

      const r = await KitDisponibilidadeService.verificarKit('kit-5', 2);
      expect(r!.quantidadeKit).toBe(2);
      expect(r!.itensEstoque[0].necessario).toBe(6);
    });
  });

  describe('verificarItemOrcamentoProjeto', () => {
    it('retorna null se projeto não tem orçamento', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({ orcamentoId: null });
      const r = await KitDisponibilidadeService.verificarItemOrcamentoProjeto('p1', 'item-1');
      expect(r).toBeNull();
    });

    it('retorna null se item não é KIT de catálogo', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({ orcamentoId: 'orc-1' });
      (prisma.orcamentoItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        tipo: 'MATERIAL',
        kitId: null,
        quantidade: 1,
      });
      const r = await KitDisponibilidadeService.verificarItemOrcamentoProjeto('p1', 'item-1');
      expect(r).toBeNull();
    });

    it('delega verificarKit com quantidade do item do orçamento', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({ orcamentoId: 'orc-1' });
      (prisma.orcamentoItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-kit',
        tipo: 'KIT',
        kitId: 'kit-os',
        quantidade: 3,
      });
      (KitsService.buscarComposicaoPorId as jest.Mock).mockResolvedValue({
        id: 'kit-os',
        nome: 'Kit OS',
        items: [
          {
            quantidade: 1,
            material: { id: 'm1', nome: 'Parafuso', estoque: 50, unidadeMedida: 'UN' },
          },
        ],
        itensFaltantes: [],
      });

      const r = await KitDisponibilidadeService.verificarItemOrcamentoProjeto('p1', 'item-kit');
      expect(KitsService.buscarComposicaoPorId).toHaveBeenCalledWith('kit-os', 6);
      expect(r!.quantidadeKit).toBe(3);
      expect(r!.completo).toBe(true);
    });
  });
});
