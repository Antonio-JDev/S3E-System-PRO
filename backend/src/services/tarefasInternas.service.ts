import { Prisma, StatusTarefaInterna } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface TarefaInternaKanbanData {
  BACKLOG: TarefaInternaKanbanItem[];
  A_FAZER: TarefaInternaKanbanItem[];
  ANDAMENTO: TarefaInternaKanbanItem[];
  CONCLUIDO: TarefaInternaKanbanItem[];
}

export interface TarefaInternaKanbanItem {
  id: string;
  titulo: string;
  motivo?: string | null;
  descricao?: string | null;
  prioridade: string;
  progresso: number;
  coluna: StatusTarefaInterna;
  userId?: string | null;
  userName?: string | null;
  userIds?: string[];
  userNames?: string[];
  totalItens: number;
  itensConcluidos: number;
  /** Prazo calculado (derivado de itens ou default). */
  prazo: Date;
  /** Indica se existe prazo explícito nos itens. */
  prazoDefinido: boolean;
  criadoPorId?: string | null;
  criadoPorName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TarefaInternaStats {
  total: number;
  planejamento: number; // BACKLOG + A_FAZER
  andamento: number;   // ANDAMENTO
  concluidas: number;  // CONCLUIDO
}

export interface TarefasInternasUsuarioReportRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalAtribuidas: number;
  concluidas: number;
  concluidasPercent: number;
  avgHorasConclusaoTarefa: number;
  itensConcluidos: number;
  avgHorasConclusaoItem: number;
}

export interface TarefasInternasUsuarioReportDetalhes {
  userId: string;
  name: string;
  email: string;
  role: string;
  period: { start: string; end: string };
  tarefas: Array<{
    id: string;
    titulo: string;
    coluna: StatusTarefaInterna;
    createdAt: string;
    updatedAt: string;
    horasConclusao: number | null;
    itensTotal: number;
    itensConcluidos: number;
  }>;
  itens: Array<{
    id: string;
    tarefaInternaId: string;
    tarefaTitulo: string;
    titulo: string;
    concluido: boolean;
    createdAt: string;
    updatedAt: string;
    dataInicio: string | null;
    dataPrevisaoFim: string | null;
    horasConclusao: number | null;
  }>;
}

export interface CreateTarefaInternaData {
  titulo: string;
  motivo?: string;
  descricao?: string;
  prioridade?: string;
  progresso?: number;
  coluna?: StatusTarefaInterna;
  userId?: string;
  userIds?: string[];
  /** Legado: aceito no payload, mas hoje é derivado dos itens. */
  prazo?: Date;
  criadoPorId?: string;
}

export interface UpdateTarefaInternaData {
  titulo?: string;
  motivo?: string | null;
  descricao?: string | null;
  prioridade?: string;
  progresso?: number;
  coluna?: StatusTarefaInterna;
  userId?: string | null;
  userIds?: string[];
  prazo?: Date | null;
}

export interface CreateTarefaInternaItemData {
  titulo: string;
  descricao?: string;
  dataInicio?: Date;
  dataPrevisaoFim?: Date;
  observacoes?: string;
}

export interface UpdateTarefaInternaItemData {
  titulo?: string;
  descricao?: string | null;
  dataInicio?: Date | null;
  dataPrevisaoFim?: Date | null;
  observacoes?: string | null;
  concluido?: boolean;
}

function recalcProgresso(itens: { concluido: boolean }[]): number {
  if (itens.length === 0) return 0;
  const concluidos = itens.filter(i => i.concluido).length;
  return Math.round((concluidos / itens.length) * 100);
}

function toJsonUserIds(ids: string[]): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return ids.length ? (ids as Prisma.InputJsonValue) : Prisma.DbNull;
}

export class TarefasInternasService {
  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  async getKanban(): Promise<TarefaInternaKanbanData> {
    const tasks = await prisma.tarefaInterna.findMany({
      include: {
        user: { select: { id: true, name: true } },
        criadoPor: { select: { id: true, name: true } },
        itens: { select: { id: true, concluido: true, dataPrevisaoFim: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const kanbanData: TarefaInternaKanbanData = {
      BACKLOG: [],
      A_FAZER: [],
      ANDAMENTO: [],
      CONCLUIDO: []
    };

    const userIdsArr = (raw: unknown): string[] => {
      if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
      return [];
    };

    tasks.forEach(task => {
      const totalItens = task.itens.length;
      const itensConcluidos = task.itens.filter(i => i.concluido).length;
      const ids = userIdsArr(task.userIds).length ? userIdsArr(task.userIds) : (task.userId ? [task.userId] : []);
      const prazos = task.itens
        .map(i => i.dataPrevisaoFim)
        .filter((d): d is Date => d instanceof Date);
      const prazoCalculado = prazos.length
        ? new Date(Math.max(...prazos.map(d => d.getTime())))
        : this.addDays(task.createdAt, 1);
      const prazoDefinido = prazos.length > 0;
      const item: TarefaInternaKanbanItem = {
        id: task.id,
        titulo: task.titulo,
        motivo: task.motivo,
        descricao: task.descricao,
        prioridade: task.prioridade,
        progresso: task.progresso,
        coluna: task.coluna,
        userId: task.userId,
        userName: task.user?.name ?? null,
        userIds: ids,
        userNames: ids.length ? [] : [], // preenchido pelo front ou por lookup se necessário
        totalItens,
        itensConcluidos,
        prazo: prazoCalculado,
        prazoDefinido,
        criadoPorId: task.criadoPorId,
        criadoPorName: task.criadoPor?.name ?? null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
      kanbanData[task.coluna].push(item);
    });

    return kanbanData;
  }

  async getStats(): Promise<TarefaInternaStats> {
    const [total, backlog, aFazer, andamento, concluido] = await Promise.all([
      prisma.tarefaInterna.count(),
      prisma.tarefaInterna.count({ where: { coluna: 'BACKLOG' } }),
      prisma.tarefaInterna.count({ where: { coluna: 'A_FAZER' } }),
      prisma.tarefaInterna.count({ where: { coluna: 'ANDAMENTO' } }),
      prisma.tarefaInterna.count({ where: { coluna: 'CONCLUIDO' } })
    ]);
    return {
      total,
      planejamento: backlog + aFazer,
      andamento,
      concluidas: concluido
    };
  }

  private toStartOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  private toEndOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  private safeHoursDiff(a: Date, b: Date): number {
    return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
  }

  private extractUserIds(task: { userId: string | null; userIds: unknown }): string[] {
    const merged = new Set<string>();
    if (task.userId) merged.add(String(task.userId));
    if (Array.isArray(task.userIds)) {
      for (const v of task.userIds) if (v) merged.add(String(v));
    }
    return Array.from(merged);
  }

  async getRelatorioUsuarios(params: { start?: string; end?: string }): Promise<{ period: { start: string; end: string }; data: TarefasInternasUsuarioReportRow[] }> {
    const now = new Date();
    const startDate = params.start ? this.toStartOfDay(new Date(params.start)) : this.toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const endDate = params.end ? this.toEndOfDay(new Date(params.end)) : this.toEndOfDay(now);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Datas inválidas. Use start/end no formato YYYY-MM-DD.');
    }

    const [users, tasks] = await Promise.all([
      prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, email: true, role: true } }),
      prisma.tarefaInterna.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { itens: true }
      })
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const metrics: Record<string, {
      userId: string;
      name: string;
      email: string;
      role: string;
      totalAtribuidas: number;
      concluidas: number;
      somaHorasConclusaoTarefa: number;
      concluidasComTempo: number;
      itensConcluidos: number;
      somaHorasConclusaoItem: number;
      itensConcluidosComTempo: number;
    }> = {};

    const ensure = (uid: string) => {
      const u = userMap.get(uid);
      if (!u) return null;
      if (!metrics[uid]) {
        metrics[uid] = {
          userId: uid,
          name: u.name,
          email: u.email,
          role: u.role,
          totalAtribuidas: 0,
          concluidas: 0,
          somaHorasConclusaoTarefa: 0,
          concluidasComTempo: 0,
          itensConcluidos: 0,
          somaHorasConclusaoItem: 0,
          itensConcluidosComTempo: 0
        };
      }
      return metrics[uid];
    };

    for (const t of tasks) {
      const assigned = this.extractUserIds({ userId: t.userId ?? null, userIds: t.userIds as any });
      if (!assigned.length) continue;

      const tarefaConcluida = t.coluna === 'CONCLUIDO';
      const horasTarefa = tarefaConcluida ? this.safeHoursDiff(new Date(t.updatedAt), new Date(t.createdAt)) : null;

      const itens = Array.isArray((t as any).itens) ? ((t as any).itens as any[]) : [];
      const itensConcluidos = itens.filter(i => i.concluido).length;

      // tempo de conclusão por item: updatedAt - (dataInicio || createdAt)
      const itensConcluidosComTempo = itens
        .filter(i => i.concluido)
        .map(i => {
          const base = i.dataInicio ? new Date(i.dataInicio) : new Date(i.createdAt);
          const horas = this.safeHoursDiff(new Date(i.updatedAt), base);
          return Number.isFinite(horas) && horas >= 0 ? horas : null;
        })
        .filter((h): h is number => typeof h === 'number');

      for (const uid of assigned) {
        const m = ensure(uid);
        if (!m) continue;
        m.totalAtribuidas += 1;
        if (tarefaConcluida) {
          m.concluidas += 1;
          if (horasTarefa != null && Number.isFinite(horasTarefa) && horasTarefa >= 0) {
            m.concluidasComTempo += 1;
            m.somaHorasConclusaoTarefa += horasTarefa;
          }
        }
        m.itensConcluidos += itensConcluidos;
        if (itensConcluidosComTempo.length) {
          m.itensConcluidosComTempo += itensConcluidosComTempo.length;
          m.somaHorasConclusaoItem += itensConcluidosComTempo.reduce((a, b) => a + b, 0);
        }
      }
    }

    const data: TarefasInternasUsuarioReportRow[] = Object.values(metrics).map(m => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      totalAtribuidas: m.totalAtribuidas,
      concluidas: m.concluidas,
      concluidasPercent: m.totalAtribuidas ? (m.concluidas / m.totalAtribuidas) * 100 : 0,
      avgHorasConclusaoTarefa: m.concluidasComTempo ? (m.somaHorasConclusaoTarefa / m.concluidasComTempo) : 0,
      itensConcluidos: m.itensConcluidos,
      avgHorasConclusaoItem: m.itensConcluidosComTempo ? (m.somaHorasConclusaoItem / m.itensConcluidosComTempo) : 0
    })).sort((a, b) => (b.concluidasPercent - a.concluidasPercent) || (b.concluidas - a.concluidas));

    return { period: { start: startDate.toISOString(), end: endDate.toISOString() }, data };
  }

  async getRelatorioUsuarioDetalhes(userId: string, params: { start?: string; end?: string }): Promise<TarefasInternasUsuarioReportDetalhes> {
    const now = new Date();
    const startDate = params.start ? this.toStartOfDay(new Date(params.start)) : this.toStartOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const endDate = params.end ? this.toEndOfDay(new Date(params.end)) : this.toEndOfDay(now);
    if (!userId) throw new Error('userId é obrigatório');
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Datas inválidas. Use start/end no formato YYYY-MM-DD.');
    }

    const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true } });
    if (!u) throw new Error('Usuário não encontrado');

    const tasks = await prisma.tarefaInterna.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: { itens: true }
    });

    const mine = tasks.filter(t => this.extractUserIds({ userId: t.userId ?? null, userIds: t.userIds as any }).some(id => String(id) === String(userId)));

    const tarefas = mine.map(t => {
      const tarefaConcluida = t.coluna === 'CONCLUIDO';
      const horasConclusao = tarefaConcluida ? this.safeHoursDiff(new Date(t.updatedAt), new Date(t.createdAt)) : null;
      const itens = Array.isArray((t as any).itens) ? ((t as any).itens as any[]) : [];
      return {
        id: t.id,
        titulo: t.titulo,
        coluna: t.coluna,
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString(),
        horasConclusao: horasConclusao != null && Number.isFinite(horasConclusao) && horasConclusao >= 0 ? horasConclusao : null,
        itensTotal: itens.length,
        itensConcluidos: itens.filter(i => i.concluido).length
      };
    });

    const itens = mine.flatMap(t => {
      const itensArr = Array.isArray((t as any).itens) ? ((t as any).itens as any[]) : [];
      return itensArr.map(i => {
        const base = i.dataInicio ? new Date(i.dataInicio) : new Date(i.createdAt);
        const horas = i.concluido ? this.safeHoursDiff(new Date(i.updatedAt), base) : null;
        return {
          id: i.id,
          tarefaInternaId: t.id,
          tarefaTitulo: t.titulo,
          titulo: i.titulo,
          concluido: Boolean(i.concluido),
          createdAt: new Date(i.createdAt).toISOString(),
          updatedAt: new Date(i.updatedAt).toISOString(),
          dataInicio: i.dataInicio ? new Date(i.dataInicio).toISOString() : null,
          dataPrevisaoFim: i.dataPrevisaoFim ? new Date(i.dataPrevisaoFim).toISOString() : null,
          horasConclusao: horas != null && Number.isFinite(horas) && horas >= 0 ? horas : null
        };
      });
    });

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      tarefas: tarefas.sort((a, b) => (b.horasConclusao ?? -1) - (a.horasConclusao ?? -1)),
      itens: itens.sort((a, b) => (b.horasConclusao ?? -1) - (a.horasConclusao ?? -1))
    };
  }

  async create(data: CreateTarefaInternaData) {
    const progresso = data.progresso != null ? Math.min(100, Math.max(0, data.progresso)) : 0;
    const coluna = data.coluna ?? 'BACKLOG';
    const prioridade = data.prioridade ?? 'MEDIA';
    const ids = Array.isArray(data.userIds) ? data.userIds.filter(Boolean) : [];
    const primeiro = ids[0] || data.userId || null;
    const prazo = data.prazo ? new Date(data.prazo) : this.addDays(new Date(), 1);
    const prazoDefinido = Boolean(data.prazo);
    const task = await prisma.tarefaInterna.create({
      data: {
        titulo: data.titulo,
        motivo: data.motivo,
        descricao: data.descricao,
        prioridade,
        progresso,
        coluna,
        userId: primeiro,
        userIds: toJsonUserIds(ids),
        prazo,
        prazoDefinido,
        criadoPorId: data.criadoPorId || null
      },
      include: {
        user: { select: { id: true, name: true } },
        criadoPor: { select: { id: true, name: true } }
      }
    });
    for (const uid of ids) {
      try {
        const { notificarAtribuicaoTarefaInterna } = await import('./notificacoes.service');
        await notificarAtribuicaoTarefaInterna(uid, task.id, task.titulo);
      } catch (err) {
        console.error('Erro ao notificar atribuição de tarefa interna:', err);
      }
    }
    return task;
  }

  async update(id: string, data: UpdateTarefaInternaData) {
    const task = await prisma.tarefaInterna.findUnique({
      where: { id },
      include: { itens: true }
    });
    if (!task) return null;
    const progresso = data.progresso != null ? Math.min(100, Math.max(0, data.progresso)) : recalcProgresso(task.itens);
    const ids = data.userIds !== undefined
      ? (Array.isArray(data.userIds) ? data.userIds.filter(Boolean) : [])
      : undefined;
    const primeiro = ids !== undefined ? (ids[0] || null) : (data.userId !== undefined ? (data.userId || null) : task.userId);
    const updatePayload: Record<string, unknown> = {
      ...(data.titulo != null && { titulo: data.titulo }),
      ...(data.motivo !== undefined && { motivo: data.motivo }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.prioridade != null && { prioridade: data.prioridade }),
      progresso,
      ...(data.coluna != null && { coluna: data.coluna }),
      ...(data.prazo !== undefined && {
        prazo: data.prazo ? new Date(data.prazo) : this.addDays(new Date(), 1),
        prazoDefinido: Boolean(data.prazo)
      }),
      userId: primeiro,
      ...(ids !== undefined && { userIds: toJsonUserIds(ids) })
    };
    if (data.userId !== undefined && ids === undefined) {
      updatePayload.userIds = data.userId ? ([data.userId] as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    const updated = await prisma.tarefaInterna.update({
      where: { id },
      data: updatePayload,
      include: { user: { select: { id: true, name: true } }, itens: true }
    });
    const notificarIds = ids ?? (updated.userId ? [updated.userId] : []);
    for (const uid of notificarIds) {
      try {
        const { notificarAtribuicaoTarefaInterna } = await import('./notificacoes.service');
        await notificarAtribuicaoTarefaInterna(uid, id, updated.titulo);
      } catch (err) {
        console.error('Erro ao notificar atribuição de tarefa interna:', err);
      }
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await prisma.tarefaInterna.delete({ where: { id } });
    return true;
  }

  async updateStatus(id: string, coluna: StatusTarefaInterna) {
    const task = await prisma.tarefaInterna.update({
      where: { id },
      data: { coluna },
      include: { user: { select: { id: true, name: true } }, itens: true }
    });
    return task;
  }

  async getById(id: string) {
    const task = await prisma.tarefaInterna.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        criadoPor: { select: { id: true, name: true, email: true } },
        itens: { orderBy: { createdAt: 'asc' } }
      }
    });
    return task;
  }

  async createItem(tarefaInternaId: string, data: CreateTarefaInternaItemData) {
    const now = new Date();
    const dataPrevisaoFim = data.dataPrevisaoFim ? new Date(data.dataPrevisaoFim) : this.addDays(now, 1);
    const item = await prisma.tarefaInternaItem.create({
      data: {
        tarefaInternaId,
        titulo: data.titulo,
        descricao: data.descricao,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataPrevisaoFim,
        observacoes: data.observacoes
      }
    });
    await this.recalculateProgress(tarefaInternaId);
    return item;
  }

  async updateItem(tarefaInternaId: string, itemId: string, data: UpdateTarefaInternaItemData) {
    const patch: Record<string, unknown> = {
      ...(data.titulo != null && { titulo: data.titulo }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.dataInicio !== undefined && { dataInicio: data.dataInicio ? new Date(data.dataInicio) : null }),
      ...(data.dataPrevisaoFim !== undefined && {
        dataPrevisaoFim: data.dataPrevisaoFim ? new Date(data.dataPrevisaoFim) : this.addDays(new Date(), 1)
      }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      ...(data.concluido !== undefined && { concluido: data.concluido })
    };
    const item = await prisma.tarefaInternaItem.update({
      where: { id: itemId, tarefaInternaId },
      data: patch
    });
    await this.recalculateProgress(tarefaInternaId);
    return item;
  }

  async deleteItem(tarefaInternaId: string, itemId: string): Promise<boolean> {
    await prisma.tarefaInternaItem.delete({
      where: { id: itemId, tarefaInternaId }
    });
    await this.recalculateProgress(tarefaInternaId);
    return true;
  }

  async recalculateProgress(tarefaInternaId: string): Promise<void> {
    const itens = await prisma.tarefaInternaItem.findMany({
      where: { tarefaInternaId },
      select: { concluido: true }
    });
    const progresso = recalcProgresso(itens);
    await prisma.tarefaInterna.update({
      where: { id: tarefaInternaId },
      data: { progresso }
    });
  }
}

export default new TarefasInternasService();
