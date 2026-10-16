import { Prisma, PrismaClient } from '@prisma/client';
import {
  chaveDocumentoFornecedor,
  cnpjArmazenadoCanonico,
  escolherFornecedorCanonico,
} from '../utils/cnpjFornecedor.util';
import {
  listarFornecedoresPorDocumento,
  type DbFornecedor,
  type FornecedorEncontrado,
} from './fornecedorCnpj.service';

export type ResultadoUnificacaoFornecedores = {
  dryRun: boolean;
  gruposAnalisados: number;
  gruposUnidos: number;
  comprasReapontadas: number;
  comprasCnpjAlinhados: number;
  contasReapontadas: number;
  materiaisReapontados: number;
  cotacoesReapontadas: number;
  aliasesAfetados: number;
  fornecedoresRemovidos: number;
  cnpjsNormalizados: number;
};

export type GrupoFornecedorCnpj = {
  chave: string;
  membros: FornecedorEncontrado[];
};

function resultadoVazio(dryRun: boolean): ResultadoUnificacaoFornecedores {
  return {
    dryRun,
    gruposAnalisados: 0,
    gruposUnidos: 0,
    comprasReapontadas: 0,
    comprasCnpjAlinhados: 0,
    contasReapontadas: 0,
    materiaisReapontados: 0,
    cotacoesReapontadas: 0,
    aliasesAfetados: 0,
    fornecedoresRemovidos: 0,
    cnpjsNormalizados: 0,
  };
}

function somar(destino: ResultadoUnificacaoFornecedores, origem: ResultadoUnificacaoFornecedores) {
  destino.gruposAnalisados += origem.gruposAnalisados;
  destino.gruposUnidos += origem.gruposUnidos;
  destino.comprasReapontadas += origem.comprasReapontadas;
  destino.comprasCnpjAlinhados += origem.comprasCnpjAlinhados;
  destino.contasReapontadas += origem.contasReapontadas;
  destino.materiaisReapontados += origem.materiaisReapontados;
  destino.cotacoesReapontadas += origem.cotacoesReapontadas;
  destino.aliasesAfetados += origem.aliasesAfetados;
  destino.fornecedoresRemovidos += origem.fornecedoresRemovidos;
  destino.cnpjsNormalizados += origem.cnpjsNormalizados;
}

export function snapshotCnpjDeveAlinhar(atual: string | null | undefined, chave: string): boolean {
  if (!chave) return false;
  if (!atual) return true;
  if (atual === chave) return false;
  return chaveDocumentoFornecedor(atual) === chave;
}

export function resumirGrupo(grupo: GrupoFornecedorCnpj): ResultadoUnificacaoFornecedores {
  const resumo = resultadoVazio(true);
  const membros = grupo.membros.filter((m) => chaveDocumentoFornecedor(m.cnpj) === grupo.chave);
  if (membros.length === 0) return resumo;

  resumo.gruposAnalisados = 1;
  const canonico = escolherFornecedorCanonico(membros);
  const duplicados = membros.filter((m) => m.id !== canonico.id);
  if (duplicados.length > 0) resumo.gruposUnidos = 1;

  for (const duplicado of duplicados) {
    resumo.comprasReapontadas += duplicado.compras;
    resumo.contasReapontadas += duplicado.contasPagar;
    resumo.materiaisReapontados += duplicado.materiais;
    resumo.cotacoesReapontadas += duplicado.cotacoes;
    resumo.aliasesAfetados += duplicado.aliases;
    resumo.fornecedoresRemovidos += 1;
  }

  if (!cnpjArmazenadoCanonico(canonico.cnpj) || canonico.cnpj !== grupo.chave) {
    resumo.cnpjsNormalizados = 1;
  }
  return resumo;
}

async function reapontarAliases(
  db: DbFornecedor,
  deId: string,
  paraId: string
): Promise<number> {
  const aliases = await db.materialFornecedorAlias.findMany({
    where: { fornecedorId: deId },
  });
  let afetados = 0;
  for (const alias of aliases) {
    const conflito = await db.materialFornecedorAlias.findFirst({
      where: { fornecedorId: paraId, nomeNormalizado: alias.nomeNormalizado },
    });
    if (conflito) {
      const data: Prisma.MaterialFornecedorAliasUpdateInput = {};
      if (!conflito.codigoFornecedor && alias.codigoFornecedor) {
        data.codigoFornecedor = alias.codigoFornecedor;
      }
      if (!conflito.ean && alias.ean) data.ean = alias.ean;
      if (!conflito.ncm && alias.ncm) data.ncm = alias.ncm;
      if (Object.keys(data).length > 0) {
        await db.materialFornecedorAlias.update({ where: { id: conflito.id }, data });
      }
      await db.materialFornecedorAlias.delete({ where: { id: alias.id } });
    } else {
      await db.materialFornecedorAlias.update({
        where: { id: alias.id },
        data: { fornecedorId: paraId },
      });
    }
    afetados += 1;
  }
  return afetados;
}

async function alinharCnpjCompras(
  db: DbFornecedor,
  fornecedorId: string,
  chave: string
): Promise<number> {
  const compras = await db.compra.findMany({
    where: { fornecedorId },
    select: { id: true, fornecedorCNPJ: true },
  });
  let alinhados = 0;
  for (const compra of compras) {
    if (!snapshotCnpjDeveAlinhar(compra.fornecedorCNPJ, chave)) continue;
    await db.compra.update({
      where: { id: compra.id },
      data: { fornecedorCNPJ: chave },
    });
    alinhados += 1;
  }
  return alinhados;
}

export async function executarUnificacaoGrupo(
  db: DbFornecedor,
  grupo: GrupoFornecedorCnpj
): Promise<ResultadoUnificacaoFornecedores> {
  const previsto = resumirGrupo(grupo);
  if (previsto.gruposAnalisados === 0) return resultadoVazio(false);
  if (previsto.gruposUnidos === 0 && previsto.cnpjsNormalizados === 0) {
    const canonico = escolherFornecedorCanonico(grupo.membros);
    const alinhados = await alinharCnpjCompras(db, canonico.id, grupo.chave);
    return { ...resultadoVazio(false), gruposAnalisados: 1, comprasCnpjAlinhados: alinhados };
  }

  const membros = grupo.membros.filter((m) => chaveDocumentoFornecedor(m.cnpj) === grupo.chave);
  const canonico = escolherFornecedorCanonico(membros);
  const duplicados = membros.filter((m) => m.id !== canonico.id);
  const resumo = resultadoVazio(false);
  resumo.gruposAnalisados = 1;
  if (duplicados.length > 0) resumo.gruposUnidos = 1;

  for (const duplicado of duplicados) {
    const compras = await db.compra.updateMany({
      where: { fornecedorId: duplicado.id },
      data: {
        fornecedorId: canonico.id,
        fornecedorCNPJ: grupo.chave,
        fornecedorNome: canonico.nome,
      },
    });
    resumo.comprasReapontadas += compras.count;

    const contas = await db.contaPagar.updateMany({
      where: { fornecedorId: duplicado.id },
      data: { fornecedorId: canonico.id },
    });
    resumo.contasReapontadas += contas.count;

    const materiais = await db.material.updateMany({
      where: { fornecedorId: duplicado.id },
      data: { fornecedorId: canonico.id },
    });
    resumo.materiaisReapontados += materiais.count;

    const cotacoes = await db.cotacao.updateMany({
      where: { fornecedorId: duplicado.id },
      data: { fornecedorId: canonico.id, fornecedorNome: canonico.nome },
    });
    resumo.cotacoesReapontadas += cotacoes.count;

    resumo.aliasesAfetados += await reapontarAliases(db, duplicado.id, canonico.id);
    await db.fornecedor.delete({ where: { id: duplicado.id } });
    resumo.fornecedoresRemovidos += 1;
  }

  if (canonico.cnpj !== grupo.chave) {
    await db.fornecedor.update({
      where: { id: canonico.id },
      data: { cnpj: grupo.chave },
    });
    resumo.cnpjsNormalizados = 1;
  }

  resumo.comprasCnpjAlinhados = await alinharCnpjCompras(db, canonico.id, grupo.chave);
  return resumo;
}

export async function carregarGruposFornecedorCnpj(db: DbFornecedor): Promise<GrupoFornecedorCnpj[]> {
  const todos = await listarTodosFornecedores(db);
  const mapa = new Map<string, FornecedorEncontrado[]>();
  for (const fornecedor of todos) {
    const chave = chaveDocumentoFornecedor(fornecedor.cnpj);
    if (!chave || (chave.length !== 11 && chave.length !== 14)) continue;
    const lista = mapa.get(chave) ?? [];
    lista.push(fornecedor);
    mapa.set(chave, lista);
  }
  return [...mapa.entries()].map(([chave, membros]) => ({ chave, membros }));
}

async function listarTodosFornecedores(db: DbFornecedor): Promise<FornecedorEncontrado[]> {
  const rows = await db.fornecedor.findMany({
    select: {
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
    },
  });
  return rows.map((row) => {
    const compras = row._count.compras;
    const contasPagar = row._count.contasPagar;
    const materiais = row._count.materiais;
    const cotacoes = row._count.cotacoes;
    const aliases = row._count.aliasesMaterial;
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
  });
}

export async function planejarUnificacaoFornecedores(
  db: DbFornecedor
): Promise<ResultadoUnificacaoFornecedores> {
  const grupos = await carregarGruposFornecedorCnpj(db);
  const resumo = resultadoVazio(true);
  for (const grupo of grupos) {
    somar(resumo, resumirGrupo(grupo));
    if (grupo.membros.length === 0) continue;
    const canonico = escolherFornecedorCanonico(grupo.membros);
    const compras = await db.compra.findMany({
      where: { fornecedorId: canonico.id },
      select: { fornecedorCNPJ: true },
    });
    resumo.comprasCnpjAlinhados += compras.filter((c) =>
      snapshotCnpjDeveAlinhar(c.fornecedorCNPJ, grupo.chave)
    ).length;
  }
  return resumo;
}

export async function aplicarUnificacaoFornecedores(
  prisma: PrismaClient,
  opcoes: { dryRun: boolean }
): Promise<ResultadoUnificacaoFornecedores> {
  if (opcoes.dryRun) {
    return planejarUnificacaoFornecedores(prisma);
  }

  return prisma.$transaction(
    async (tx) => {
      const grupos = await carregarGruposFornecedorCnpj(tx);
      const resumo = resultadoVazio(false);
      for (const grupo of grupos) {
        const parcial = resumirGrupo(grupo);
        if (parcial.gruposUnidos === 0 && parcial.cnpjsNormalizados === 0) {
          const canonico = escolherFornecedorCanonico(grupo.membros);
          const alinhados = await alinharCnpjCompras(tx, canonico.id, grupo.chave);
          if (alinhados > 0) {
            somar(resumo, {
              ...resultadoVazio(false),
              gruposAnalisados: 1,
              comprasCnpjAlinhados: alinhados,
            });
          }
          continue;
        }
        somar(resumo, await executarUnificacaoGrupo(tx, grupo));
      }
      return resumo;
    },
    { timeout: 180000, maxWait: 20000 }
  );
}
