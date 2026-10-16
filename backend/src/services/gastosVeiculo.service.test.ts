jest.mock('../lib/prisma', () => ({
    prisma: {
        $transaction: jest.fn(),
        gastoVeiculo: {
            delete: jest.fn(),
        },
    },
}));

import { prisma } from '../lib/prisma';
import { GastosVeiculoService } from './gastosVeiculo.service';

describe('GastosVeiculoService — conta a pagar em cascata', () => {
    const veiculo = { id: 'v1', modelo: 'Gol', placa: 'ABC1D23', kmAtual: 1000 };
    const gastoCriado = {
        id: 'g1',
        veiculoId: 'v1',
        tipo: 'Manutenção',
        descricao: 'Troca de óleo',
        valor: 250,
        data: new Date('2026-10-16T15:00:00.000Z'),
        km: null,
        veiculo,
    };

    let tx: {
        gastoVeiculo: { create: jest.Mock; update: jest.Mock };
        contaPagar: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
        veiculo: { update: jest.Mock };
    };

    beforeEach(() => {
        tx = {
            gastoVeiculo: {
                create: jest.fn().mockResolvedValue(gastoCriado),
                update: jest.fn(),
            },
            contaPagar: {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue({ id: 'cp1' }),
                update: jest.fn(),
            },
            veiculo: { update: jest.fn() },
        };
        (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
    });

    it('cria o gasto e a conta a pagar pendente na mesma transação', async () => {
        await GastosVeiculoService.criarGasto({
            veiculoId: 'v1',
            tipo: 'Manutenção',
            descricao: 'Troca de óleo',
            valor: 250,
            data: '2026-10-16',
        });

        expect(tx.contaPagar.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                tipo: 'FROTA',
                gastoVeiculoId: 'g1',
                valorParcela: 250,
                status: 'Pendente',
                credorNome: 'Gol (ABC1D23)',
            }),
        });
    });

    it('edita a conta vinculada e reabre a baixa', async () => {
        tx.gastoVeiculo.update.mockResolvedValue({ ...gastoCriado, valor: 300 });
        tx.contaPagar.findUnique.mockResolvedValue({
            status: 'Pago',
            dataPagamento: new Date('2026-10-15T12:00:00.000Z'),
        });

        await GastosVeiculoService.atualizarGasto('g1', { valor: 300 });

        expect(tx.contaPagar.update).toHaveBeenCalledWith({
            where: { gastoVeiculoId: 'g1' },
            data: expect.objectContaining({
                valorParcela: 300,
                status: 'Pendente',
                dataPagamento: null,
            }),
        });
        expect(tx.contaPagar.create).not.toHaveBeenCalled();
    });

    it('exclui o gasto e a conta some pelo vínculo', async () => {
        (prisma.gastoVeiculo.delete as jest.Mock).mockResolvedValue({ id: 'g1' });
        await GastosVeiculoService.deletarGasto('g1');
        expect(prisma.gastoVeiculo.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    });
});
