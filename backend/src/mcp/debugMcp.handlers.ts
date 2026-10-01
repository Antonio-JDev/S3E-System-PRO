import { prisma } from '../lib/prisma';

const LIMITE_PADRAO_LOGS = 50;
const LIMITE_PADRAO_NFE = 20;
const LIMITE_MAX = 200;
const XML_MAX = 6000;

const ACOES_ERRO = ['ERROR', 'ERRO', 'FALHA', 'FAIL', 'REJEIT', 'EXCEPTION'];
const ACOES_AVISO = ['WARN', 'ALERT', 'AVISO'];

const ACOES_NFE_FALHA = [
  'NFE_EMISSAO_REJEITADA',
  'NFE_CONTINGENCIA_REENVIO_FALHA',
  'NFE_CONTINGENCIA_OFFLINE_ENFILEIRADA',
];

export type NivelLog = 'ERROR' | 'WARN' | 'INFO';

export interface ParamsLogs {
  level?: string;
  limit?: number;
  startDate?: string;
}

export interface ParamsNfe {
  nfeId?: string;
  limit?: number;
}

export interface ParamsSessao {
  userId?: string;
}

function mensagemErro(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'falha desconhecida';
}

function erroBanco(err: unknown): { ok: false; error: string } {
  return { ok: false, error: `Erro ao consultar o banco: ${mensagemErro(err)}` };
}

export function limitarQuantidade(valor: unknown, padrao: number): number {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() ? Number(valor) : padrao;
  if (!Number.isFinite(n)) return padrao;
  return Math.min(LIMITE_MAX, Math.max(1, Math.floor(n)));
}

export function inferirNivel(acao: string | null | undefined, metadata: unknown): NivelLog {
  const meta = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  const explicito = typeof meta.level === 'string' ? meta.level.toUpperCase() : '';
  if (explicito === 'ERROR' || explicito === 'WARN' || explicito === 'INFO') return explicito;
  const texto = (acao || '').toUpperCase();
  if (ACOES_ERRO.some((trecho) => texto.includes(trecho))) return 'ERROR';
  if (ACOES_AVISO.some((trecho) => texto.includes(trecho))) return 'WARN';
  return 'INFO';
}

function clausulaContem(trechos: string[]) {
  return trechos.map((trecho) => ({
    action: { contains: trecho, mode: 'insensitive' as const },
  }));
}

export function montarWhereLogs(level?: NivelLog, startDate?: Date) {
  const porNivel =
    level === 'ERROR'
      ? {
          OR: [
            ...clausulaContem(ACOES_ERRO),
            { metadata: { path: ['level'], equals: 'ERROR' } },
          ],
        }
      : level === 'WARN'
        ? {
            OR: [
              ...clausulaContem(ACOES_AVISO),
              { metadata: { path: ['level'], equals: 'WARN' } },
            ],
          }
        : level === 'INFO'
          ? {
              NOT: {
                OR: [
                  ...clausulaContem([...ACOES_ERRO, ...ACOES_AVISO]),
                  { metadata: { path: ['level'], equals: 'ERROR' } },
                  { metadata: { path: ['level'], equals: 'WARN' } },
                ],
              },
            }
          : {};

  return {
    ...porNivel,
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };
}

function normalizarNivel(level?: string): { ok: true; nivel?: NivelLog } | { ok: false; error: string } {
  if (level == null || String(level).trim() === '') return { ok: true };
  const valor = String(level).trim().toUpperCase();
  if (valor === 'ERROR' || valor === 'WARN' || valor === 'INFO') return { ok: true, nivel: valor };
  return { ok: false, error: 'level deve ser ERROR, WARN ou INFO.' };
}

function cortarTexto(valor: string | null | undefined, max = XML_MAX): { texto?: string; truncado?: boolean } {
  if (!valor) return {};
  if (valor.length <= max) return { texto: valor };
  return { texto: valor.slice(0, max), truncado: true };
}

function semVazios<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(obj)) {
    if (valor === undefined || valor === null || valor === '') continue;
    saida[chave] = valor;
  }
  return saida;
}

function lerCstat(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const meta = metadata as Record<string, unknown>;
  const bruto = meta.status ?? meta.codigoStatus ?? meta.cStat;
  if (typeof bruto === 'number' && Number.isFinite(bruto)) return String(bruto);
  if (typeof bruto === 'string' && /^\d{2,4}$/.test(bruto.trim())) return bruto.trim();
  return undefined;
}

function lerMotivo(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const meta = metadata as Record<string, unknown>;
  const bruto = meta.mensagem ?? meta.xMotivo ?? meta.motivo;
  return typeof bruto === 'string' && bruto.trim() ? bruto.trim() : undefined;
}

function mapearLog(row: any) {
  return semVazios({
    id: row.id,
    nivel: inferirNivel(row.action, row.metadata),
    acao: row.action,
    descricao: row.description,
    entidade: row.entity,
    entidadeId: row.entityId,
    usuarioId: row.userId,
    usuarioNome: row.userName,
    perfil: row.userRole,
    ip: row.ipAddress,
    criadoEm: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    metadata: row.metadata ?? undefined,
  });
}

function mapearEventoNfe(evento: any) {
  return semVazios({
    id: evento.id,
    tipo: evento.tipo,
    descricao: evento.descricao,
    criadoEm: evento.createdAt instanceof Date ? evento.createdAt.toISOString() : evento.createdAt,
    metadata: evento.metadata ?? undefined,
  });
}

function mapearFila(fila: any) {
  const xml = cortarTexto(fila.xmlAssinado);
  return semVazios({
    id: fila.id,
    status: fila.status,
    modo: fila.modo,
    ambiente: fila.ambiente,
    tentativas: fila.tentativas,
    ultimoErro: fila.ultimoErro,
    xmlAssinado: xml.texto,
    xmlTruncado: xml.truncado ? true : undefined,
    atualizadoEm: fila.updatedAt instanceof Date ? fila.updatedAt.toISOString() : fila.updatedAt,
  });
}

function mapearAuditoriaNfe(row: any) {
  return semVazios({
    id: row.id,
    acao: row.action,
    descricao: row.description,
    cStat: lerCstat(row.metadata),
    motivo: lerMotivo(row.metadata),
    criadoEm: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    metadata: row.metadata ?? undefined,
  });
}

function mapearNota(nota: any, auditoria: any[]) {
  const xml = cortarTexto(nota.xmlNFe);
  const rejeicoes = auditoria.filter((item) =>
    ACOES_NFE_FALHA.includes(String(item.action || ''))
  );
  const ultima = rejeicoes[0];
  const cStat = lerCstat(ultima?.metadata);
  const motivo = lerMotivo(ultima?.metadata) || nota.observacoes || undefined;

  return semVazios({
    id: nota.id,
    numero: nota.numero,
    serie: nota.serie,
    status: nota.status,
    ambiente: nota.ambiente,
    chaveAcesso: nota.chaveAcesso,
    tipo: nota.tipo,
    natureza: nota.natureza,
    cfop: nota.cfop,
    valorTotal: nota.valorTotal,
    dataEmissao: nota.dataEmissao instanceof Date ? nota.dataEmissao.toISOString() : nota.dataEmissao,
    observacoes: nota.observacoes,
    cStat,
    motivo,
    xmlNFe: xml.texto,
    xmlTruncado: xml.truncado ? true : undefined,
    venda: nota.venda
      ? semVazios({
          id: nota.venda.id,
          numeroVenda: nota.venda.numeroVenda,
          numeroSequencial: nota.venda.numeroSequencial,
          status: nota.venda.status,
          valorTotal: nota.venda.valorTotal,
          clienteId: nota.venda.clienteId,
        })
      : undefined,
    projeto: nota.projeto
      ? semVazios({
          id: nota.projeto.id,
          titulo: nota.projeto.titulo,
          status: nota.projeto.status,
        })
      : undefined,
    fila: Array.isArray(nota.nfeFila) ? nota.nfeFila.map(mapearFila) : undefined,
    eventos: Array.isArray(nota.nfeEventos) ? nota.nfeEventos.map(mapearEventoNfe) : undefined,
    auditoria: auditoria.map(mapearAuditoriaNfe),
  });
}

function mapearNfse(row: any) {
  const envio = cortarTexto(row.xmlEnvio);
  const resposta = cortarTexto(row.xmlResposta);
  return semVazios({
    id: row.id,
    tipo: 'NFSE',
    numeroNfse: row.numeroNfse,
    numeroLote: row.numeroLote,
    protocolo: row.protocolo,
    situacao: row.situacao,
    ambiente: row.ambiente,
    erro: row.erro,
    tomadorRazaoSocial: row.tomadorRazaoSocial,
    valorTotal: row.valorTotal != null ? String(row.valorTotal) : undefined,
    xmlEnvio: envio.texto,
    xmlEnvioTruncado: envio.truncado ? true : undefined,
    xmlResposta: resposta.texto,
    xmlRespostaTruncado: resposta.truncado ? true : undefined,
    criadoEm: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  });
}

const includeNota = {
  venda: {
    select: {
      id: true,
      numeroVenda: true,
      numeroSequencial: true,
      status: true,
      valorTotal: true,
      clienteId: true,
    },
  },
  projeto: {
    select: { id: true, titulo: true, status: true },
  },
  nfeFila: {
    select: {
      id: true,
      status: true,
      ultimoErro: true,
      tentativas: true,
      modo: true,
      ambiente: true,
      xmlAssinado: true,
      updatedAt: true,
    },
  },
  nfeEventos: {
    orderBy: { createdAt: 'desc' as const },
    take: 30,
  },
};

const whereNotasComFalha = {
  OR: [
    { status: { in: ['Rejeitada', 'Rejeitado', 'Erro', 'Falha', 'FALHA'] } },
    { nfeFila: { some: { status: 'FALHA' } } },
    { nfeEventos: { some: { tipo: 'ERRO' } } },
    { status: 'Pendente', observacoes: { not: null } },
  ],
};

async function auditoriaDasNotas(notas: any[]): Promise<any[]> {
  const ids = notas.map((n) => n.id).filter(Boolean);
  const chaves = notas.map((n) => n.chaveAcesso).filter((c: unknown) => typeof c === 'string' && c);
  if (!ids.length && !chaves.length) return [];
  const or: Record<string, unknown>[] = [];
  if (ids.length) or.push({ entityId: { in: ids } });
  if (chaves.length) or.push({ chainId: { in: chaves } });
  return prisma.auditLog.findMany({
    where: {
      entity: 'NFe',
      OR: or,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

function auditoriaDaNota(nota: any, todas: any[]): any[] {
  return todas.filter((item) => item.entityId === nota.id || (nota.chaveAcesso && item.chainId === nota.chaveAcesso));
}

/**
 * Últimos registros reais de `audit_logs`.
 * O ERP não tem coluna de nível: ERROR/WARN/INFO são derivados da ação e de metadata.level.
 */
export async function getSystemLogs(params: ParamsLogs = {}): Promise<Record<string, unknown>> {
  try {
    const nivelParse = normalizarNivel(params.level);
    if (!nivelParse.ok) return nivelParse;
    const nivel = nivelParse.nivel;

    let startDate: Date | undefined;
    if (params.startDate && String(params.startDate).trim()) {
      const data = new Date(String(params.startDate));
      if (Number.isNaN(data.getTime())) {
        return { ok: false, error: 'startDate inválida. Use uma data ISO-8601.' };
      }
      startDate = data;
    }

    const limit = limitarQuantidade(params.limit, LIMITE_PADRAO_LOGS);
    const where = montarWhereLogs(nivel, startDate);
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logs = rows
      .map(mapearLog)
      .filter((log) => !nivel || log.nivel === nivel);

    return {
      ok: true,
      fonte: 'audit_logs',
      filtro: {
        level: nivel ?? null,
        limit,
        startDate: startDate ? startDate.toISOString() : null,
      },
      total: logs.length,
      logs,
    };
  } catch (err) {
    return erroBanco(err);
  }
}

/**
 * Notas com falha ou rejeição (NF-e e NFS-e) a partir do que o schema realmente guarda.
 */
export async function getFailedNfeDetails(params: ParamsNfe = {}): Promise<Record<string, unknown>> {
  try {
    const nfeId = typeof params.nfeId === 'string' ? params.nfeId.trim() : '';

    if (nfeId) {
      const nota = await prisma.notaFiscal.findFirst({
        where: { OR: [{ id: nfeId }, { chaveAcesso: nfeId }, { numero: nfeId }] },
        include: includeNota,
      });

      if (!nota) {
        const fila = await (prisma as any).nFeFila.findFirst({
          where: { OR: [{ id: nfeId }, { notaFiscalId: nfeId }] },
        });
        const nfse = await prisma.nfse.findFirst({
          where: {
            OR: [{ id: nfeId }, { numeroNfse: nfeId }, { protocolo: nfeId }],
          },
        });
        if (!fila && !nfse) {
          return {
            ok: true,
            encontrada: false,
            nfeId,
            mensagem: 'NF-e não encontrada.',
          };
        }
        return {
          ok: true,
          encontrada: true,
          nfeId,
          notas: [],
          fila: fila ? [mapearFila(fila)] : [],
          nfse: nfse ? [mapearNfse(nfse)] : [],
        };
      }

      const auditoria = await auditoriaDasNotas([nota]);
      return {
        ok: true,
        encontrada: true,
        nfeId,
        notas: [mapearNota(nota, auditoriaDaNota(nota, auditoria))],
      };
    }

    const limit = limitarQuantidade(params.limit, LIMITE_PADRAO_NFE);
    const notas = await prisma.notaFiscal.findMany({
      where: whereNotasComFalha,
      include: includeNota,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    const nfses = await prisma.nfse.findMany({
      where: {
        OR: [{ situacao: { in: ['Erro', 'ERRO', 'Falha'] } }, { erro: { not: null } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    const auditoria = await auditoriaDasNotas(notas);

    return {
      ok: true,
      encontrada: notas.length + nfses.length > 0,
      total: notas.length + nfses.length,
      limite: limit,
      notas: notas.map((nota) => mapearNota(nota, auditoriaDaNota(nota, auditoria))),
      nfse: nfses.map(mapearNfse),
    };
  } catch (err) {
    return erroBanco(err);
  }
}

/**
 * Últimas ações registradas em audit_logs para o usuário informado.
 */
export async function getUserSessionAudit(params: ParamsSessao = {}): Promise<Record<string, unknown>> {
  try {
    const userId = typeof params.userId === 'string' ? params.userId.trim() : '';
    if (!userId) {
      return { ok: false, error: 'Informe o userId do usuário.' };
    }

    const rows = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_PADRAO_LOGS,
    });

    return {
      ok: true,
      userId,
      fonte: 'audit_logs',
      total: rows.length,
      acoes: rows.map(mapearLog),
    };
  } catch (err) {
    return erroBanco(err);
  }
}
