jest.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    projeto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    projetoEngenharia: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    historicoReprovacaoVistoria: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import {
  aprovar,
  entrarNaFilaSeAplicavel,
  protocolar,
  reprovar,
  StatusVistoriaCelesc,
  validarConclusaoVistoriaCelesc,
} from './vistoriaCelesc.service';

describe('vistoriaCelesc.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.projetoEngenharia.findUnique as jest.Mock).mockResolvedValue(null);
  });

  describe('entrarNaFilaSeAplicavel', () => {
    it('define PENDENTE_PROTOCOLO quando exige e OS está APROVADO sem status', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: null,
        status: 'APROVADO',
      });
      (prisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        statusVistoria: StatusVistoriaCelesc.PENDENTE_PROTOCOLO,
      });

      const result = await entrarNaFilaSeAplicavel('p1');

      expect(prisma.projeto.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { statusVistoria: StatusVistoriaCelesc.PENDENTE_PROTOCOLO },
      });
      expect(result?.statusVistoria).toBe(StatusVistoriaCelesc.PENDENTE_PROTOCOLO);
    });

    it('não altera se ainda está em PROPOSTA', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: null,
        status: 'PROPOSTA',
      });

      await entrarNaFilaSeAplicavel('p1');
      expect(prisma.projeto.update).not.toHaveBeenCalled();
    });
  });

  describe('protocolar', () => {
    it('protocola de PENDENTE_PROTOCOLO para AGUARDANDO_CELESC', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.PENDENTE_PROTOCOLO,
      });
      (prisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
        dataProtocoloVistoria: new Date('2026-07-01T12:00:00Z'),
        historicoReprovacoesVistoria: [],
      });

      const result = await protocolar('p1');
      expect(result.statusVistoria).toBe(StatusVistoriaCelesc.AGUARDANDO_CELESC);
    });

    it('rejeita protocolar a partir de AGUARDANDO_CELESC', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      });

      await expect(protocolar('p1')).rejects.toThrow(/PENDENTE_PROTOCOLO ou REPROVADO/);
    });
  });

  describe('reprovar', () => {
    it('cria histórico e marca REPROVADO', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        { id: 'h1' },
        {
          id: 'p1',
          statusVistoria: StatusVistoriaCelesc.REPROVADO,
          dataProtocoloVistoria: new Date('2026-07-01T12:00:00Z'),
          historicoReprovacoesVistoria: [{ id: 'h1' }],
        },
      ]);

      const result = await reprovar('p1', {
        dataReprovacao: '2026-07-10',
        motivos: 'Falta aterramento',
        itensReprovados: ['Aterramento', 'Quadro'],
        criadoPorId: 'u1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.statusVistoria).toBe(StatusVistoriaCelesc.REPROVADO);
      expect(result.qtdReprovacoes).toBe(1);
    });

    it('exige motivos', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      });

      await expect(
        reprovar('p1', {
          dataReprovacao: '2026-07-10',
          motivos: '',
          itensReprovados: [],
        }),
      ).rejects.toThrow(/Motivos/);
    });
  });

  describe('aprovar', () => {
    it('marca VISTORIA_APROVADA', async () => {
      (prisma.projeto.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      });
      (prisma.projeto.update as jest.Mock).mockResolvedValue({
        id: 'p1',
        statusVistoria: StatusVistoriaCelesc.VISTORIA_APROVADA,
        dataProtocoloVistoria: new Date('2026-07-01T12:00:00Z'),
        historicoReprovacoesVistoria: [],
      });

      const result = await aprovar('p1');
      expect(result.statusVistoria).toBe(StatusVistoriaCelesc.VISTORIA_APROVADA);
    });
  });

  describe('validarConclusaoVistoriaCelesc', () => {
    it('bloqueia conclusão sem vistoria aprovada', () => {
      const msg = validarConclusaoVistoriaCelesc({
        exigeVistoriaCelesc: true,
        statusVistoria: StatusVistoriaCelesc.AGUARDANDO_CELESC,
      });
      expect(msg).toMatch(/vistoria CELESC/);
    });

    it('libera quando aprovada ou flag desligada', () => {
      expect(
        validarConclusaoVistoriaCelesc({
          exigeVistoriaCelesc: true,
          statusVistoria: StatusVistoriaCelesc.VISTORIA_APROVADA,
        }),
      ).toBeNull();
      expect(
        validarConclusaoVistoriaCelesc({
          exigeVistoriaCelesc: false,
          statusVistoria: null,
        }),
      ).toBeNull();
    });
  });
});
