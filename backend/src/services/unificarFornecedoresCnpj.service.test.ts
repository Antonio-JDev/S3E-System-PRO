import { executarUnificacaoGrupo } from './unificarFornecedoresCnpj.service';
import type { FornecedorEncontrado } from './fornecedorCnpj.service';

function membro(parcial: Partial<FornecedorEncontrado> & Pick<FornecedorEncontrado, 'id' | 'cnpj' | 'nome'>): FornecedorEncontrado {
  return {
    telefone: null,
    createdAt: new Date('2020-01-01'),
    compras: 0,
    contasPagar: 0,
    materiais: 0,
    cotacoes: 0,
    aliases: 0,
    vinculos: 0,
    ...parcial,
  };
}

describe('executarUnificacaoGrupo', () => {
  it('reaponta compras do duplicado para o canônico e grava o CNPJ só com dígitos', async () => {
    const tx = {
      compra: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([{ id: 'c1', fornecedorCNPJ: '12.345.678/0001-99' }]),
        update: jest.fn().mockResolvedValue({}),
      },
      contaPagar: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      material: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      cotacao: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      materialFornecedorAlias: { findMany: jest.fn().mockResolvedValue([]) },
      fornecedor: { delete: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
    };

    const resultado = await executarUnificacaoGrupo(tx as never, {
      chave: '12345678000199',
      membros: [
        membro({
          id: 'f-mascara',
          nome: 'Mascarado',
          cnpj: '12.345.678/0001-99',
          createdAt: new Date('2024-01-01'),
          compras: 2,
          contasPagar: 1,
          vinculos: 3,
        }),
        membro({
          id: 'f-digitos',
          nome: 'Canônico',
          cnpj: '12345678000199',
          createdAt: new Date('2024-06-01'),
          compras: 0,
          vinculos: 0,
        }),
      ],
    });

    expect(tx.compra.updateMany).toHaveBeenCalledWith({
      where: { fornecedorId: 'f-mascara' },
      data: {
        fornecedorId: 'f-digitos',
        fornecedorCNPJ: '12345678000199',
        fornecedorNome: 'Canônico',
      },
    });
    expect(tx.fornecedor.delete).toHaveBeenCalledWith({ where: { id: 'f-mascara' } });
    expect(tx.fornecedor.update).not.toHaveBeenCalled();
    expect(resultado.comprasReapontadas).toBe(2);
    expect(resultado.fornecedoresRemovidos).toBe(1);
    expect(resultado.gruposUnidos).toBe(1);
  });
});
