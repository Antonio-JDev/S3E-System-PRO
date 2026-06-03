import { TipoServico } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type TipoServicoClassificacao =
  | 'MAO_DE_OBRA'
  | 'MONTAGEM'
  | 'ENGENHARIA'
  | 'PROJETOS'
  | 'ADMINISTRATIVO';

export function getCodigoPrefix(tipoServico: TipoServicoClassificacao): string {
  switch (tipoServico) {
    case 'MAO_DE_OBRA':
      return 'MOB';
    case 'MONTAGEM':
      return 'MONT';
    case 'ENGENHARIA':
    case 'PROJETOS':
      return 'ENG-PRO';
    case 'ADMINISTRATIVO':
      return 'ADM';
    default:
      return 'SERV';
  }
}

/** Escapa caracteres especiais do prefixo para uso em RegExp. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSequentialNumber(codigo: string, prefix: string): number | null {
  const regex = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`, 'i');
  const match = codigo.trim().match(regex);
  if (match?.[1]) {
    const n = parseInt(match[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Calcula o próximo código a partir de códigos existentes (sem count — usa max sufixo).
 */
export function gerarProximoCodigoFromList(
  codigosExistentes: string[],
  tipoServico: TipoServicoClassificacao,
): string {
  const prefix = getCodigoPrefix(tipoServico);
  const numeros = codigosExistentes
    .map((c) => extractSequentialNumber(c, prefix))
    .filter((n): n is number => n !== null);

  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return `${prefix}-${String(proximo).padStart(3, '0')}`;
}

export class ServiceCodeGenerator {
  static async gerarProximoCodigo(
    tipoServico: TipoServicoClassificacao | TipoServico,
  ): Promise<string> {
    const tipo = tipoServico as TipoServicoClassificacao;
    const prefix = getCodigoPrefix(tipo);

    const servicos = await prisma.servico.findMany({
      where: {
        codigo: { startsWith: prefix, mode: 'insensitive' },
      },
      select: { codigo: true },
    });

    return gerarProximoCodigoFromList(
      servicos.map((s) => s.codigo),
      tipo,
    );
  }
}
