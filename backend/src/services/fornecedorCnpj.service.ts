import { Prisma, PrismaClient } from '@prisma/client';
import {
  chaveDocumentoFornecedor,
  escolherFornecedorCanonico,
  type FornecedorCanonicoRef,
} from '../utils/cnpjFornecedor.util';

export type DbFornecedor = PrismaClient | Prisma.TransactionClient;

export class FornecedorCnpjError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FornecedorCnpjError';
  }
}

const selectFornecedor = {
  id: true,
  nome: true,
  cnpj: true,
  telefone: true,
  createdAt: true,
  _count: {
    select: {
      compras: true,
      contasPagar: true,
      materiais: true,
      cotacoes: true,
      aliasesMaterial: true,
    },
  },
} as const;

export type FornecedorEncontrado = FornecedorCanonicoRef & {
  nome: string;
  telefone: string | null;
  compras: number;
  contasPagar: number;
  materiais: number;
  cotacoes: number;
  aliases: number;
};

type RowComContagem = {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string | null;
  createdAt: Date;
  _count: {
    compras: number;
    contasPagar: number;
    materiais: number;
    cotacoes: number;
    aliasesMaterial: number;
  };
};

function mapear(row: RowComContagem): FornecedorEncontrado {
  const compras = row._count?.compras ?? 0;
  const contasPagar = row._count?.contasPagar ?? 0;
  const materiais = row._count?.materiais ?? 0;
  const cotacoes = row._count?.cotacoes ?? 0;
  const aliases = row._count?.aliasesMaterial ?? 0;
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj,
    telefone: row.telefone,
    createdAt: row.createdAt,
    compras,
    contasPagar,
    materiais,
    cotacoes,
    aliases,
    vinculos: compras + contasPagar + materiais + cotacoes + aliases,
  };
}

/**
 * findUnique pelo CNPJ só com dígitos. Se não achar, varre registros legados
 * com máscara (ou com zero à esquerda perdido) comparando os dígitos.
 */
export async function listarFornecedoresPorDocumento(
  db: DbFornecedor,
  documento: unknown
): Promise<FornecedorEncontrado[]> {
  const chave = chaveDocumentoFornecedor(documento);
  if (!chave) return [];

  const exato = (await db.fornecedor.findUnique({
    where: { cnpj: chave },
    select: selectFornecedor,
  })) as RowComContagem | null;

  if (exato) return [mapear(exato)];

  const todos = (await db.fornecedor.findMany({
    select: selectFornecedor,
  })) as RowComContagem[];

  return todos
    .filter((row) => chaveDocumentoFornecedor(row.cnpj) === chave)
    .map((row) => mapear(row));
}

export async function buscarFornecedorCanonicoPorCnpj(
  db: DbFornecedor,
  documento: unknown
): Promise<FornecedorEncontrado | null> {
  const matches = await listarFornecedoresPorDocumento(db, documento);
  if (matches.length === 0) return null;
  return escolherFornecedorCanonico(matches);
}

/**
 * Reutiliza o fornecedor já cadastrado (dígitos ou máscara). Não cria outro
 * quando o mesmo CNPJ já existe. Se o legado estiver mascarado e ninguém
 * ocupar a chave só com dígitos, grava o CNPJ normalizado nesse registro.
 */
export async function resolverOuCriarFornecedorPorCnpj(
  db: DbFornecedor,
  params: { nome: string; cnpj: unknown; telefone?: string | null }
) {
  const chave = chaveDocumentoFornecedor(params.cnpj);
  if (!chave || (chave.length !== 11 && chave.length !== 14)) {
    throw new FornecedorCnpjError('CNPJ do fornecedor é obrigatório');
  }

  const matches = await listarFornecedoresPorDocumento(db, chave);
  if (matches.length === 0) {
    return db.fornecedor.create({
      data: {
        nome: params.nome,
        cnpj: chave,
        telefone: params.telefone || null,
      },
    });
  }

  const escolhido = escolherFornecedorCanonico(matches);
  if (escolhido.cnpj === chave) {
    return db.fornecedor.findUniqueOrThrow({ where: { id: escolhido.id } });
  }

  const ocupado = matches.some((item) => item.cnpj === chave);
  if (ocupado) {
    return db.fornecedor.findUniqueOrThrow({ where: { cnpj: chave } });
  }

  return db.fornecedor.update({
    where: { id: escolhido.id },
    data: { cnpj: chave },
  });
}

export async function resolverFornecedorParaAtualizacaoCompra(
  db: DbFornecedor,
  input: {
    fornecedorId?: string | null;
    fornecedorCNPJ?: string | null;
    fornecedorNome?: string | null;
    telefone?: string | null;
  }
): Promise<{ fornecedorId: string; fornecedorCNPJ: string; fornecedorNome: string }> {
  const nomeInformado = String(input.fornecedorNome ?? '').trim();

  if (input.fornecedorId) {
    const fornecedor = await db.fornecedor.findUnique({
      where: { id: input.fornecedorId },
      select: { id: true, nome: true, cnpj: true },
    });
    if (!fornecedor) {
      throw new FornecedorCnpjError('Fornecedor selecionado não encontrado');
    }
    const cnpj =
      chaveDocumentoFornecedor(fornecedor.cnpj) || chaveDocumentoFornecedor(input.fornecedorCNPJ);
    if (!cnpj || (cnpj.length !== 11 && cnpj.length !== 14)) {
      throw new FornecedorCnpjError('Fornecedor sem CNPJ válido');
    }
    return {
      fornecedorId: fornecedor.id,
      fornecedorCNPJ: cnpj,
      fornecedorNome: nomeInformado || fornecedor.nome,
    };
  }

  const chave = chaveDocumentoFornecedor(input.fornecedorCNPJ);
  if (!chave || (chave.length !== 11 && chave.length !== 14)) {
    throw new FornecedorCnpjError('CNPJ do fornecedor é obrigatório');
  }

  const fornecedor = await resolverOuCriarFornecedorPorCnpj(db, {
    nome: nomeInformado || 'Fornecedor',
    cnpj: chave,
    telefone: input.telefone,
  });

  return {
    fornecedorId: fornecedor.id,
    fornecedorCNPJ: chave,
    fornecedorNome: nomeInformado || fornecedor.nome,
  };
}
