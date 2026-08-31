import { prisma } from '../lib/prisma';
import { calcularCustoDiaFuncionario } from '../utils/custoDiaFuncionario';
import { dataReferenciaDiaCivilUtc, inicioFimMesCivilUtc } from '../utils/datetime-sp.util';
import { jornadaMinutosPorDia } from '../utils/workshift.util';

const DEFAULT_HORAS_JORNADA = 8;

export interface LinhaHorasCustoContabil {
  competencia: string;
  data: string;
  osNumero: string;
  osId: string;
  clienteNome: string;
  funcionarioId: string;
  funcionarioNome: string;
  tipoRecurso: string;
  horas_jornada: number;
  horas_extras: number;
  total_horas: number;
  modoCusto: string;
  valorUnitario: number;
  custoDia: number;
  status: string;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function civilDaysInclusive(inicio: Date, fim: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()));
  const end = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate()));
  for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
    days.push(new Date(t));
  }
  return days.length ? days : [start];
}

function horasJornadaDoShift(shift?: {
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
} | null): number {
  if (!shift) return DEFAULT_HORAS_JORNADA;
  return round2(jornadaMinutosPorDia(shift) / 60);
}

export interface LinhaCustoCalendarioOs {
  eventoId: string;
  data: string;
  funcionarioId: string;
  funcionarioNome: string;
  cargo: string;
  horasJornada: number;
  horasExtras: number;
  totalHoras: number;
  modoCusto: string;
  valorUnitario: number;
  custoDia: number;
  status: string;
}

export interface MaoDeObraCalendarioOs {
  custoTotal: number;
  horasEngenharia: number;
  diariasEquipe: number;
  linhas: LinhaCustoCalendarioOs[];
}

/**
 * Custo de mão de obra na OS a partir de eventos do calendário (taxas do Funcionario).
 * Por padrão só VALIDO entra no realizado; PREVISAO fica de fora do Resultado.
 */
export async function calcularMaoDeObraCalendarioOs(
  projetoId: string,
  opts?: { apenasStatus?: 'VALIDO' | 'PREVISAO' | 'TODOS' },
): Promise<MaoDeObraCalendarioOs> {
  const apenasStatus = opts?.apenasStatus ?? 'VALIDO';

  const eventos = await prisma.eventoCalendario.findMany({
    where: {
      projetoId,
      ...(apenasStatus === 'TODOS' ? {} : { status: apenasStatus }),
    },
    include: {
      equipe: {
        select: {
          id: true,
          nome: true,
          cargo: true,
          valorHora: true,
          valorDiaria: true,
          configuracaoPonto: { include: { workShift: true } },
        },
      },
    },
    orderBy: { dataInicio: 'asc' },
  });

  const funcionarioIds = [...new Set(eventos.flatMap((e) => e.equipe.map((f) => f.id)))];
  const datasRef = eventos.flatMap((e) =>
    civilDaysInclusive(e.dataInicio, e.dataFim).map((d) =>
      dataReferenciaDiaCivilUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
    ),
  );
  const minRef = datasRef.length ? new Date(Math.min(...datasRef.map((d) => d.getTime()))) : null;
  const maxRef = datasRef.length ? new Date(Math.max(...datasRef.map((d) => d.getTime()))) : null;

  const pontos =
    funcionarioIds.length && minRef && maxRef
      ? await prisma.registroPonto.findMany({
          where: {
            funcionarioId: { in: funcionarioIds },
            dataReferencia: { gte: minRef, lte: maxRef },
          },
          select: {
            funcionarioId: true,
            dataReferencia: true,
            horasExtras50: true,
            horasExtras100: true,
            minutosExtra50: true,
            minutosExtra100: true,
          },
        })
      : [];

  const pontoPorChave = new Map(
    pontos.map((p) => [`${p.funcionarioId}|${ymd(p.dataReferencia)}`, p]),
  );

  const linhas: LinhaCustoCalendarioOs[] = [];
  let custoTotal = 0;
  let horasEngenharia = 0;
  let diariasEquipe = 0;

  for (const evento of eventos) {
    for (const funcionario of evento.equipe) {
      const horasJornada = horasJornadaDoShift(funcionario.configuracaoPonto?.workShift ?? null);
      for (const dia of civilDaysInclusive(evento.dataInicio, evento.dataFim)) {
        const data = ymd(dia);
        const ponto = pontoPorChave.get(`${funcionario.id}|${data}`);
        const he50 = ponto
          ? Math.max(Number(ponto.horasExtras50) || 0, (ponto.minutosExtra50 || 0) / 60)
          : 0;
        const he100 = ponto
          ? Math.max(Number(ponto.horasExtras100) || 0, (ponto.minutosExtra100 || 0) / 60)
          : 0;
        const horasExtras = round2(he50 + he100);
        const totalHoras = round2(horasJornada + horasExtras);
        const custo = calcularCustoDiaFuncionario({
          valorDiaria: funcionario.valorDiaria != null ? Number(funcionario.valorDiaria) : null,
          valorHora: funcionario.valorHora != null ? Number(funcionario.valorHora) : null,
          horasJornada,
          horasExtras50: he50,
          horasExtras100: he100,
        });

        linhas.push({
          eventoId: evento.id,
          data,
          funcionarioId: funcionario.id,
          funcionarioNome: funcionario.nome,
          cargo: funcionario.cargo || '',
          horasJornada,
          horasExtras,
          totalHoras,
          modoCusto: custo.modoCusto,
          valorUnitario: custo.valorUnitario,
          custoDia: custo.custoDia,
          status: evento.status,
        });

        custoTotal += custo.custoDia;
        if (custo.modoCusto === 'HORA') {
          horasEngenharia += totalHoras;
        } else {
          // DIARIA ou SEM_TAXA: presença de 1 dia de equipe
          diariasEquipe += 1;
        }
      }
    }
  }

  return {
    custoTotal: round2(custoTotal),
    horasEngenharia: round2(horasEngenharia),
    diariasEquipe: round2(diariasEquipe),
    linhas,
  };
}

export async function gerarLinhasHorasCustoContabil(params: {
  competencia: string;
  projetoId?: string;
}): Promise<LinhaHorasCustoContabil[]> {
  const m = params.competencia.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('Competência inválida. Use YYYY-MM');
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const { inicio, fim } = inicioFimMesCivilUtc(ano, mes);

  const eventos = await prisma.eventoCalendario.findMany({
    where: {
      projetoId: params.projetoId ? params.projetoId : { not: null },
      dataInicio: { lte: fim },
      dataFim: { gte: inicio },
    },
    include: {
      equipe: {
        select: {
          id: true,
          nome: true,
          cargo: true,
          valorHora: true,
          valorDiaria: true,
          configuracaoPonto: { include: { workShift: true } },
        },
      },
      projeto: {
        select: {
          id: true,
          titulo: true,
          status: true,
          cliente: { select: { nome: true } },
          orcamento: { select: { numeroSequencial: true } },
        },
      },
    },
    orderBy: { dataInicio: 'asc' },
  });

  const funcionarioIds = [...new Set(eventos.flatMap((e) => e.equipe.map((f) => f.id)))];
  const pontos = funcionarioIds.length
    ? await prisma.registroPonto.findMany({
        where: {
          funcionarioId: { in: funcionarioIds },
          dataReferencia: { gte: inicio, lte: fim },
        },
        select: {
          funcionarioId: true,
          dataReferencia: true,
          horasExtras50: true,
          horasExtras100: true,
          minutosExtra50: true,
          minutosExtra100: true,
        },
      })
    : [];

  const pontoPorChave = new Map(
    pontos.map((p) => [`${p.funcionarioId}|${ymd(p.dataReferencia)}`, p]),
  );

  const linhas: LinhaHorasCustoContabil[] = [];

  for (const evento of eventos) {
    if (!evento.projeto) continue;
    const osNumero = evento.projeto.orcamento?.numeroSequencial
      ? `OS-${evento.projeto.orcamento.numeroSequencial}`
      : evento.projeto.titulo;
    const clienteNome = evento.projeto.cliente?.nome || '';
    const dias = civilDaysInclusive(evento.dataInicio, evento.dataFim).filter((d) => {
      return d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mes;
    });

    for (const funcionario of evento.equipe) {
      const horasJornada = horasJornadaDoShift(funcionario.configuracaoPonto?.workShift ?? null);
      for (const dia of dias) {
        const data = ymd(dia);
        const ponto = pontoPorChave.get(`${funcionario.id}|${data}`);
        const he50 = ponto
          ? Math.max(Number(ponto.horasExtras50) || 0, (ponto.minutosExtra50 || 0) / 60)
          : 0;
        const he100 = ponto
          ? Math.max(Number(ponto.horasExtras100) || 0, (ponto.minutosExtra100 || 0) / 60)
          : 0;
        const horasExtras = round2(he50 + he100);
        const custo = calcularCustoDiaFuncionario({
          valorDiaria: funcionario.valorDiaria != null ? Number(funcionario.valorDiaria) : null,
          valorHora: funcionario.valorHora != null ? Number(funcionario.valorHora) : null,
          horasJornada,
          horasExtras50: he50,
          horasExtras100: he100,
        });

        linhas.push({
          competencia: params.competencia,
          data,
          osNumero,
          osId: evento.projeto.id,
          clienteNome,
          funcionarioId: funcionario.id,
          funcionarioNome: funcionario.nome,
          tipoRecurso: funcionario.cargo || 'FUNCIONARIO',
          horas_jornada: horasJornada,
          horas_extras: horasExtras,
          total_horas: round2(horasJornada + horasExtras),
          modoCusto: custo.modoCusto,
          valorUnitario: custo.valorUnitario,
          custoDia: custo.custoDia,
          status: evento.status,
        });
      }
    }
  }

  return linhas;
}

const CSV_COLS: (keyof LinhaHorasCustoContabil)[] = [
  'competencia',
  'data',
  'osNumero',
  'osId',
  'clienteNome',
  'funcionarioId',
  'funcionarioNome',
  'tipoRecurso',
  'horas_jornada',
  'horas_extras',
  'total_horas',
  'modoCusto',
  'valorUnitario',
  'custoDia',
  'status',
];

function csvCell(v: string | number): string {
  const s = String(v ?? '');
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function linhasParaCsv(linhas: LinhaHorasCustoContabil[]): string {
  const header = CSV_COLS.join(';');
  const body = linhas.map((l) => CSV_COLS.map((c) => csvCell(l[c])).join(';')).join('\r\n');
  return `\uFEFF${header}\r\n${body}\r\n`;
}

export async function obterAlocacaoPontoOs(projetoId: string, dataYmd?: string) {
  const projeto = await prisma.projeto.findUnique({
    where: { id: projetoId },
    select: { id: true },
  });
  if (!projeto) return null;

  let diaFiltro: Date | null = null;
  if (dataYmd) {
    const m = dataYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error('Data inválida. Use YYYY-MM-DD');
    diaFiltro = dataReferenciaDiaCivilUtc(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  const eventos = await prisma.eventoCalendario.findMany({
    where: {
      projetoId,
      ...(diaFiltro
        ? {
            dataInicio: { lte: new Date(diaFiltro.getTime() + 12 * 3600_000) },
            dataFim: { gte: new Date(diaFiltro.getTime() - 12 * 3600_000) },
          }
        : {}),
    },
    include: {
      equipe: {
        select: {
          id: true,
          nome: true,
          cargo: true,
          valorHora: true,
          valorDiaria: true,
          configuracaoPonto: { include: { workShift: true } },
        },
      },
      veiculos: {
        select: { id: true, modelo: true, placa: true, tipo: true },
      },
    },
    orderBy: { dataInicio: 'asc' },
  });

  const funcionarioIds = [...new Set(eventos.flatMap((e) => e.equipe.map((f) => f.id)))];
  const datasRef = diaFiltro
    ? [diaFiltro]
    : eventos.flatMap((e) => civilDaysInclusive(e.dataInicio, e.dataFim).map((d) =>
        dataReferenciaDiaCivilUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
      ));

  const minRef = datasRef.length
    ? new Date(Math.min(...datasRef.map((d) => d.getTime())))
    : null;
  const maxRef = datasRef.length
    ? new Date(Math.max(...datasRef.map((d) => d.getTime())))
    : null;

  const pontos =
    funcionarioIds.length && minRef && maxRef
      ? await prisma.registroPonto.findMany({
          where: {
            funcionarioId: { in: funcionarioIds },
            dataReferencia: { gte: minRef, lte: maxRef },
          },
          select: {
            funcionarioId: true,
            dataReferencia: true,
            horasNormais: true,
            horasExtras50: true,
            horasExtras100: true,
            minutosExtra50: true,
            minutosExtra100: true,
            entrada: true,
            saida: true,
          },
        })
      : [];

  const pontoPorChave = new Map(
    pontos.map((p) => [`${p.funcionarioId}|${ymd(p.dataReferencia)}`, p]),
  );

  return eventos.map((evento) => ({
    eventoId: evento.id,
    titulo: evento.titulo,
    status: evento.status,
    tipo: evento.tipo,
    dataInicio: evento.dataInicio,
    dataFim: evento.dataFim,
    veiculos: evento.veiculos.map((v) => ({
      id: v.id,
      modelo: v.modelo,
      placa: v.placa,
      tipo: v.tipo,
    })),
    pessoas: evento.equipe.map((f) => {
      const horasJornada = horasJornadaDoShift(f.configuracaoPonto?.workShift ?? null);
      const dias = civilDaysInclusive(evento.dataInicio, evento.dataFim)
        .filter((d) => !diaFiltro || ymd(d) === ymd(diaFiltro))
        .map((d) => {
          const data = ymd(d);
          const ponto = pontoPorChave.get(`${f.id}|${data}`);
          const he50 = ponto
            ? Math.max(Number(ponto.horasExtras50) || 0, (ponto.minutosExtra50 || 0) / 60)
            : 0;
          const he100 = ponto
            ? Math.max(Number(ponto.horasExtras100) || 0, (ponto.minutosExtra100 || 0) / 60)
            : 0;
          return {
            data,
            horasJornada,
            horasExtras: round2(he50 + he100),
            horasExtras50: round2(he50),
            horasExtras100: round2(he100),
            temPonto: Boolean(ponto),
            workShift: f.configuracaoPonto?.workShift
              ? {
                  entrada1: f.configuracaoPonto.workShift.entrada1,
                  saida2: f.configuracaoPonto.workShift.saida2,
                }
              : { entrada1: '07:30', saida2: '17:30' },
          };
        });
      return {
        funcionarioId: f.id,
        nome: f.nome,
        cargo: f.cargo,
        dias,
      };
    }),
  }));
}
