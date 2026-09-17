/**
 * Lógica pura de ajuste absoluto de inventário (contagem física).
 * quantidadeContada = novo saldo desejado (não delta).
 */

export interface CalculoAjusteAbsoluto {
  estoqueAnterior: number;
  quantidadeContada: number;
  /** Contado − sistema (positivo = sobra física; negativo = falta) */
  diferenca: number;
  /** True quando não há necessidade de movimentação */
  semAlteracao: boolean;
}

export function calcularAjusteAbsoluto(
  estoqueAtual: number,
  quantidadeContada: number
): CalculoAjusteAbsoluto {
  const estoqueAnterior = Number(estoqueAtual) || 0;
  const contada = Number(quantidadeContada);
  const diferenca = contada - estoqueAnterior;
  return {
    estoqueAnterior,
    quantidadeContada: contada,
    diferenca,
    semAlteracao: diferenca === 0,
  };
}

export function validarQuantidadeContada(quantidadeContada: unknown): {
  ok: true;
  valor: number;
} | {
  ok: false;
  message: string;
} {
  if (quantidadeContada === null || quantidadeContada === undefined || quantidadeContada === '') {
    return { ok: false, message: 'quantidadeContada é obrigatória' };
  }
  const valor = typeof quantidadeContada === 'number'
    ? quantidadeContada
    : Number(String(quantidadeContada).replace(',', '.'));

  if (!Number.isFinite(valor)) {
    return { ok: false, message: 'quantidadeContada deve ser um número válido' };
  }
  if (valor < 0) {
    return { ok: false, message: 'quantidadeContada deve ser maior ou igual a zero' };
  }
  return { ok: true, valor };
}

/** Monta observação auditável da contagem física. */
export function montarObservacaoInventario(params: {
  estoqueAnterior: number;
  quantidadeContada: number;
  usuarioNome?: string | null;
  usuarioId?: string | null;
  observacaoUsuario?: string | null;
}): string {
  const partes: string[] = [
    `Contagem física: de ${params.estoqueAnterior} para ${params.quantidadeContada}`,
  ];
  if (params.usuarioNome || params.usuarioId) {
    partes.push(
      `Usuário: ${params.usuarioNome || '—'}${params.usuarioId ? ` (${params.usuarioId})` : ''}`
    );
  }
  if (params.observacaoUsuario?.trim()) {
    partes.push(params.observacaoUsuario.trim());
  }
  return partes.join(' | ');
}
