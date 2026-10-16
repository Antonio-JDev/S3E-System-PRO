import {
  resolverFornecedorParaAtualizacaoCompra,
  resolverOuCriarFornecedorPorCnpj,
} from './fornecedorCnpj.service';

const contagemVazia = {
  compras: 0,
  contasPagar: 0,
  materiais: 0,
  cotacoes: 0,
  aliasesMaterial: 0,
};

function linha(parcial: {
  id: string;
  nome: string;
  cnpj: string;
  createdAt: Date;
  compras?: number;
}) {
  return {
    id: parcial.id,
    nome: parcial.nome,
    cnpj: parcial.cnpj,
    telefone: null,
    createdAt: parcial.createdAt,
    _count: { ...contagemVazia, compras: parcial.compras ?? 0 },
  };
}

describe('resolverOuCriarFornecedorPorCnpj', () => {
  it('não cria segundo fornecedor quando o CNPJ mascarado já existe só com dígitos', async () => {
    const existente = linha({
      id: 'f-digitos',
      nome: 'ACME',
      cnpj: '12345678000199',
      createdAt: new Date('2020-01-01'),
    });
    const db = {
      fornecedor: {
        findUnique: jest.fn().mockResolvedValue(existente),
        findUniqueOrThrow: jest.fn().mockResolvedValue(existente),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const resultado = await resolverOuCriarFornecedorPorCnpj(db as never, {
      nome: 'Outro nome',
      cnpj: '12.345.678/0001-99',
    });

    expect(resultado.id).toBe('f-digitos');
    expect(db.fornecedor.create).not.toHaveBeenCalled();
    expect(db.fornecedor.update).not.toHaveBeenCalled();
    expect(db.fornecedor.findMany).not.toHaveBeenCalled();
  });

  it('reaproveita o legado mascarado e grava o CNPJ só com dígitos', async () => {
    const mascarado = linha({
      id: 'f-mascara',
      nome: 'Legado',
      cnpj: '12.345.678/0001-99',
      createdAt: new Date('2021-01-01'),
      compras: 3,
    });
    const db = {
      fornecedor: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mascarado]),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ ...mascarado, cnpj: '12345678000199' }),
      },
    };

    const resultado = await resolverOuCriarFornecedorPorCnpj(db as never, {
      nome: 'Legado',
      cnpj: '12.345.678/0001-99',
    });

    expect(db.fornecedor.create).not.toHaveBeenCalled();
    expect(db.fornecedor.update).toHaveBeenCalledWith({
      where: { id: 'f-mascara' },
      data: { cnpj: '12345678000199' },
    });
    expect(resultado.id).toBe('f-mascara');
    expect(resultado.cnpj).toBe('12345678000199');
  });
});

describe('resolverFornecedorParaAtualizacaoCompra', () => {
  it('grava o fornecedorId explícito e o CNPJ normalizado mesmo com os mesmos dígitos', async () => {
    const db = {
      fornecedor: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'f-escolhido',
          nome: 'Duplicata escolhida',
          cnpj: '12.345.678/0001-99',
        }),
        create: jest.fn(),
      },
    };

    const atualizado = await resolverFornecedorParaAtualizacaoCompra(db as never, {
      fornecedorId: 'f-escolhido',
      fornecedorCNPJ: '12.345.678/0001-99',
      fornecedorNome: 'Duplicata escolhida',
    });

    expect(atualizado).toEqual({
      fornecedorId: 'f-escolhido',
      fornecedorCNPJ: '12345678000199',
      fornecedorNome: 'Duplicata escolhida',
    });
    expect(db.fornecedor.create).not.toHaveBeenCalled();
  });

  it('sem id, escolhe o canônico (dígitos, mais vínculos, mais antigo) e não o primeiro da lista', async () => {
    const mascarado = linha({
      id: 'f-mascara',
      nome: 'Mascarado',
      cnpj: '12.345.678/0001-99',
      createdAt: new Date('2019-01-01'),
      compras: 10,
    });
    const digitos = linha({
      id: 'f-digitos',
      nome: 'Canonico',
      cnpj: '12345678000199',
      createdAt: new Date('2022-01-01'),
      compras: 1,
    });
    const db = {
      fornecedor: {
        findUnique: jest.fn().mockImplementation(async ({ where }: { where: { cnpj?: string; id?: string } }) => {
          if (where.cnpj === '12345678000199') return digitos;
          return null;
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(digitos),
        findMany: jest.fn().mockResolvedValue([mascarado, digitos]),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const atualizado = await resolverFornecedorParaAtualizacaoCompra(db as never, {
      fornecedorCNPJ: '12.345.678/0001-99',
      fornecedorNome: 'Nome da nota',
    });

    expect(atualizado.fornecedorId).toBe('f-digitos');
    expect(atualizado.fornecedorCNPJ).toBe('12345678000199');
    expect(atualizado.fornecedorNome).toBe('Nome da nota');
    expect(db.fornecedor.create).not.toHaveBeenCalled();
    expect(db.fornecedor.findMany).not.toHaveBeenCalled();
  });

  it('sem id e sem cadastro só com dígitos, escolhe quem tem mais vínculos', async () => {
    const pouco = linha({
      id: 'f-pouco',
      nome: 'Primeiro da lista',
      cnpj: '12.345.678/0001-99',
      createdAt: new Date('2018-01-01'),
      compras: 1,
    });
    const muito = linha({
      id: 'f-muito',
      nome: 'Mais compras',
      cnpj: '12345678/0001-99',
      createdAt: new Date('2023-01-01'),
      compras: 8,
    });
    const db = {
      fornecedor: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([pouco, muito]),
        create: jest.fn(),
        update: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => ({
          ...(where.id === 'f-muito' ? muito : pouco),
          cnpj: '12345678000199',
        })),
      },
    };

    const atualizado = await resolverFornecedorParaAtualizacaoCompra(db as never, {
      fornecedorCNPJ: '12.345.678/0001-99',
      fornecedorNome: 'Mais compras',
    });

    expect(atualizado.fornecedorId).toBe('f-muito');
    expect(atualizado.fornecedorCNPJ).toBe('12345678000199');
    expect(db.fornecedor.create).not.toHaveBeenCalled();
    expect(db.fornecedor.update).toHaveBeenCalledWith({
      where: { id: 'f-muito' },
      data: { cnpj: '12345678000199' },
    });
  });
});
