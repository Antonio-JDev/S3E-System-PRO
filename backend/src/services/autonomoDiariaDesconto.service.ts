import {
  LancamentoFolhaCategoria,
  TipoContratoFuncionario,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  dataReferenciaDiaCivilUtc,
  diaSemanaCivil,
  ehFeriado,
  inicioFimMesCivilUtc,
} from '../utils/datetime-sp.util';
import { ContasPagarService } from './contasPagar.service';

/** Prefixo em `descricao` para remover/recriar lançamentos gerados pela importação do ponto. */
export const LANCAMENTO_AUTO_DIARIA_PREFIX = '[ponto-import] Falta diária';

/**
 * Dias do mês (1..N) em que aplica desconto de diária: seg–sex, não feriado, após admissão, sem registro de ponto.
 */
export function diasUteisSemRegistroPonto(params: {
  ano: number;
  mes: number;
  dataAdmissao: Date;
  diasComRegistro: Set<number>;
}): number[] {
  const { ano, mes, dataAdmissao, diasComRegistro } = params;
  const maxDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const admRef = dataReferenciaDiaCivilUtc(
    dataAdmissao.getUTCFullYear(),
    dataAdmissao.getUTCMonth() + 1,
    dataAdmissao.getUTCDate(),
  ).getTime();

  const out: number[] = [];
  for (let dia = 1; dia <= maxDia; dia++) {
    const dow = diaSemanaCivil(ano, mes, dia);
    if (dow < 1 || dow > 5) continue;
    if (ehFeriado(ano, mes, dia)) continue;
    const dRef = dataReferenciaDiaCivilUtc(ano, mes, dia).getTime();
    if (dRef < admRef) continue;
    if (diasComRegistro.has(dia)) continue;
    out.push(dia);
  }
  return out;
}

/**
 * Remove lançamentos automáticos anteriores e recria um `FALTA` por dia útil sem batida (valor = diária).
 * Chamado após importar o XLS do ponto, para cada colaborador presente no arquivo.
 */
export async function sincronizarDescontosDiariaFaltaAposImportPonto(
  ano: number,
  mes: number,
  funcionarioIds: Iterable<string>,
): Promise<{ funcionariosProcessados: number; lancamentosCriados: number }> {
  const ids = [...new Set(funcionarioIds)];
  let lancamentosCriados = 0;
  let funcionariosProcessados = 0;

  for (const funcionarioId of ids) {
    const func = await prisma.funcionario.findUnique({
      where: { id: funcionarioId },
      select: {
        id: true,
        tipoContrato: true,
        descontoDiariaSemBatidaAutonomo: true,
        valorDiaria: true,
        dataAdmissao: true,
      },
    });
    if (!func) continue;
    if (func.tipoContrato !== TipoContratoFuncionario.AUTONOMO) continue;
    if (!func.descontoDiariaSemBatidaAutonomo) continue;

    const valorDiaria = Number(func.valorDiaria ?? 0);
    if (!Number.isFinite(valorDiaria) || valorDiaria <= 0) continue;

    const { inicio, fim } = inicioFimMesCivilUtc(ano, mes);
    const registros = await prisma.registroPonto.findMany({
      where: {
        funcionarioId,
        dataReferencia: { gte: inicio, lte: fim },
      },
      select: { dataReferencia: true },
    });
    const diasComRegistro = new Set<number>();
    for (const r of registros) {
      diasComRegistro.add(r.dataReferencia.getUTCDate());
    }

    const diasDesconto = diasUteisSemRegistroPonto({
      ano,
      mes,
      dataAdmissao: func.dataAdmissao,
      diasComRegistro,
    });

    await prisma.lancamentoFolha.deleteMany({
      where: {
        funcionarioId,
        referenciaAno: ano,
        referenciaMes: mes,
        categoria: LancamentoFolhaCategoria.FALTA,
        descricao: { startsWith: LANCAMENTO_AUTO_DIARIA_PREFIX },
      },
    });

    if (diasDesconto.length > 0) {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      await prisma.lancamentoFolha.createMany({
        data: diasDesconto.map((dia) => ({
          funcionarioId,
          referenciaAno: ano,
          referenciaMes: mes,
          categoria: LancamentoFolhaCategoria.FALTA,
          valor: valorDiaria,
          descricao: `${LANCAMENTO_AUTO_DIARIA_PREFIX} — ${pad2(dia)}/${pad2(mes)}/${ano} (sem batida)`,
        })),
      });
      lancamentosCriados += diasDesconto.length;
    }

    funcionariosProcessados++;
    try {
      await ContasPagarService.sincronizarValorParcelaRHPelaFolha(funcionarioId, ano, mes);
    } catch {
      /* ignore */
    }
  }

  return { funcionariosProcessados, lancamentosCriados };
}
