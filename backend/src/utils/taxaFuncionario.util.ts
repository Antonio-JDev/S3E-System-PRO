import { TipoRecursoApontamento } from '@prisma/client';
import { HORAS_COMERCIAIS_POR_DIA } from './custoEventoCalendario';

export interface DadosTaxaFuncionario {
  salario?: unknown;
  salarioBase?: unknown;
  cargaHorariaMensal?: number | null;
  valorHora?: unknown;
  valorDiaria?: unknown;
  tipoContrato?: string | null;
  valorHoraNormalAutonomo?: unknown;
}

export interface TaxaFuncionarioResolvida {
  valorHora: number;
  valorDiaria: number | null;
  origem: 'SALARIO_CARGA' | 'VALOR_HORA_CADASTRO' | 'DIARIA_AUTONOMO' | 'FALLBACK_OS';
}

function n(v: unknown): number {
  const x = v != null ? Number(v) : 0;
  return Number.isFinite(x) ? x : 0;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Resolve valor hora/diária do funcionário — mesma lógica exibida no RH:
 * CLT: salário base ÷ carga mensal (ou valorHora cadastrado)
 * Autônomo: diária e/ou valorHoraNormalAutonomo (ou diária÷8)
 */
export function resolverTaxaFuncionario(
  funcionario: DadosTaxaFuncionario | null | undefined,
  fallback?: { valorHora?: number | null; valorDiaria?: number | null },
): TaxaFuncionarioResolvida {
  if (!funcionario) {
    return {
      valorHora: n(fallback?.valorHora),
      valorDiaria: fallback?.valorDiaria != null ? n(fallback.valorDiaria) : null,
      origem: 'FALLBACK_OS',
    };
  }

  const tipo = String(funcionario.tipoContrato ?? 'REGISTRADO').toUpperCase();
  const valorHoraCadastro = n(funcionario.valorHora);
  const valorDiaria = n(funcionario.valorDiaria);

  if (tipo === 'AUTONOMO' || tipo === 'AUTONOMO_BANCO_HORAS') {
    const vhNormal = n(funcionario.valorHoraNormalAutonomo);
    const valorHora =
      vhNormal > 0 ? vhNormal : valorDiaria > 0 ? valorDiaria / HORAS_COMERCIAIS_POR_DIA : valorHoraCadastro;
    return {
      valorHora: round2(valorHora),
      valorDiaria: valorDiaria > 0 ? round2(valorDiaria) : null,
      origem: valorDiaria > 0 ? 'DIARIA_AUTONOMO' : valorHora > 0 ? 'VALOR_HORA_CADASTRO' : 'FALLBACK_OS',
    };
  }

  const base = n(funcionario.salarioBase) || n(funcionario.salario);
  const carga = n(funcionario.cargaHorariaMensal) || 220;
  if (base > 0 && carga > 0) {
    return {
      valorHora: round2(base / carga),
      valorDiaria: valorDiaria > 0 ? round2(valorDiaria) : null,
      origem: 'SALARIO_CARGA',
    };
  }

  if (valorHoraCadastro > 0) {
    return {
      valorHora: round2(valorHoraCadastro),
      valorDiaria: valorDiaria > 0 ? round2(valorDiaria) : null,
      origem: 'VALOR_HORA_CADASTRO',
    };
  }

  return {
    valorHora: n(fallback?.valorHora),
    valorDiaria: fallback?.valorDiaria != null ? n(fallback.valorDiaria) : null,
    origem: 'FALLBACK_OS',
  };
}

/** Custo de um item de apontamento F1 com taxa do colaborador (RH). */
export function calcularCustoItemApontamento(
  tipoRecurso: TipoRecursoApontamento,
  quantidade: number,
  taxa: TaxaFuncionarioResolvida,
): number {
  const qtd = n(quantidade);
  if (qtd <= 0) return 0;

  if (tipoRecurso === 'HORA_ENGENHARIA') {
    return round2(qtd * taxa.valorHora);
  }

  // DIARIA_EQUIPE — quantidade em diárias equivalentes (ex.: 1h = 0,125d)
  if (taxa.valorDiaria != null && taxa.valorDiaria > 0) {
    return round2(qtd * taxa.valorDiaria);
  }
  return round2(qtd * HORAS_COMERCIAIS_POR_DIA * taxa.valorHora);
}
