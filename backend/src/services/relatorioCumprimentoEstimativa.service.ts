import { prisma } from '../lib/prisma';
import { calcularMaoDeObraCalendarioOs } from './horasCustoContabil.service';
import {
  calcularResultadoOs,
  calcularTotaisApropriacao,
} from '../utils/apropriacaoOs.util';

export interface LinhaCumprimentoEstimativa {
  projetoId: string;
  numeroOS: string;
  titulo: string;
  clienteNome: string;
  engenheiroResponsavel: string | null;
  status: string;
  diasEstimados: number;
  diasReais: number;
  horasEstimadas: number;
  horasReais: number;
  custoOrcado: number;
  custoRealizado: number;
  lucroPerdaPrazo: number;
  resultadoOs: number;
  cumpriuEstimativa: boolean;
}

function gerarNumeroOS(numeroSequencial?: number | null): string {
  if (numeroSequencial != null && numeroSequencial > 0) {
    return `OS-${String(numeroSequencial).padStart(4, '0')}`;
  }
  return 'OS-????';
}

function calcularLucroPerdaPrazoFromResumo(
  resumo: {
    horasEngenhariaOrcadas: number;
    horasEngenhariaRealizadas: number;
    diariasEquipeOrcadas: number;
    diariasEquipeRealizadas: number;
  },
  valores: { valorHoraEngenharia?: number | null; valorDiariaEquipe?: number | null }
): number {
  const valorHora = Number(valores.valorHoraEngenharia) || 0;
  const valorDiaria = Number(valores.valorDiariaEquipe) || 0;
  const diffHoras =
    (Number(resumo.horasEngenhariaOrcadas) || 0) -
    (Number(resumo.horasEngenhariaRealizadas) || 0);
  const diffDiarias =
    (Number(resumo.diariasEquipeOrcadas) || 0) -
    (Number(resumo.diariasEquipeRealizadas) || 0);
  return Math.round((diffHoras * valorHora + diffDiarias * valorDiaria) * 100) / 100;
}

export async function gerarRelatorioCumprimentoEstimativa(filtros?: {
  status?: ('EXECUCAO' | 'CONCLUIDO')[];
}): Promise<LinhaCumprimentoEstimativa[]> {
  const statusFilter = filtros?.status?.length
    ? filtros.status
    : (['EXECUCAO', 'CONCLUIDO'] as const);

  const projetos = await prisma.projeto.findMany({
    where: { status: { in: [...statusFilter] } },
    include: {
      cliente: { select: { nome: true } },
      responsavel: { select: { name: true } },
      orcamento: { select: { precoVenda: true, numeroSequencial: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (projetos.length === 0) return [];

  const projetoIds = projetos.map((p) => p.id);
  const itensRows = await prisma.apontamentoOsItem.findMany({
    where: { apontamento: { projetoId: { in: projetoIds } } },
    select: {
      tipoRecurso: true,
      quantidade: true,
      apontamento: { select: { projetoId: true } },
    },
  });

  const itensPorProjeto = new Map<string, typeof itensRows>();
  for (const row of itensRows) {
    const pid = row.apontamento.projetoId;
    const list = itensPorProjeto.get(pid) ?? [];
    list.push(row);
    itensPorProjeto.set(pid, list);
  }

  return Promise.all(
    projetos.map(async (projeto) => {
      const itens = (itensPorProjeto.get(projeto.id) ?? []).map((r) => ({
        tipoRecurso: r.tipoRecurso,
        quantidade: r.quantidade,
      }));
      const totais = calcularTotaisApropriacao(itens);
      const calendario = await calcularMaoDeObraCalendarioOs(projeto.id, {
        apenasStatus: 'VALIDO',
      });
      const resumo = calcularResultadoOs(
        {
          horasEngenhariaOrcadas: projeto.horasEngenhariaOrcadas,
          diariasEquipeOrcadas: projeto.diariasEquipeOrcadas,
          valorHoraEngenharia: projeto.valorHoraEngenharia,
          valorDiariaEquipe: projeto.valorDiariaEquipe,
          valorTotal: projeto.valorTotal,
          precoVendaOrcamento: projeto.orcamento?.precoVenda,
        },
        totais,
        {
          custoCalendario: calendario.custoTotal,
          horasEngenharia: calendario.horasEngenharia,
          diariasEquipe: calendario.diariasEquipe,
          linhas: calendario.linhas,
        },
      );

      const lucroPerdaPrazo = calcularLucroPerdaPrazoFromResumo(resumo, {
        valorHoraEngenharia: projeto.valorHoraEngenharia,
        valorDiariaEquipe: projeto.valorDiariaEquipe,
      });

      return {
        projetoId: projeto.id,
        numeroOS: gerarNumeroOS(projeto.orcamento?.numeroSequencial),
        titulo: projeto.titulo,
        clienteNome: projeto.cliente?.nome ?? 'N/A',
        engenheiroResponsavel: projeto.responsavel?.name ?? null,
        status: projeto.status,
        diasEstimados: resumo.diariasEquipeOrcadas,
        diasReais: resumo.diariasEquipeRealizadas,
        horasEstimadas: resumo.horasEngenhariaOrcadas,
        horasReais: resumo.horasEngenhariaRealizadas,
        custoOrcado: resumo.custoOrcado,
        custoRealizado: resumo.custoRealizado,
        lucroPerdaPrazo,
        resultadoOs: resumo.resultado,
        cumpriuEstimativa: !resumo.estouroDiariasEquipe && !resumo.estouroHorasEngenharia,
      };
    }),
  );
}
