/**
 * Runner standalone (tsx) para validar engine A/B/P/D sem Jest instalado.
 * Uso: npx tsx src/services/workshift-rh-evaluation.runner.ts
 */
import {
  aplicarAvaliacaoRhDia,
  parseTratamentoCredito,
  parseTratamentoDebito,
  resolverTratamentosDoBotao,
} from '../utils/avaliacaoPontoRh.util';

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEq(parseTratamentoDebito('A'), 'A', 'parse debito');
assertEq(parseTratamentoCredito('P'), 'P', 'parse credito');

{
  const r = aplicarAvaliacaoRhDia({ minutosAtraso: 30, tratamentoDebito: 'A' });
  assertEq(r.minutosAbonados, 30, 'T1 abonados');
  assertEq(r.minutosBancoDelta, 0, 'T1 banco');
  assertEq(r.minutosDescontarFolha, 0, 'T1 desconto');
  console.log('[Teste 1] OK');
}

{
  const r = aplicarAvaliacaoRhDia({ minutosAtraso: 45, tratamentoDebito: 'B' });
  assertEq(r.minutosBancoDelta, -45, 'T2 banco');
  console.log('[Teste 2] OK');
}

{
  const r = aplicarAvaliacaoRhDia({ minutosExtra: 60, tratamentoCredito: 'B' });
  assertEq(r.minutosBancoDelta, 60, 'T3 banco');
  console.log('[Teste 3] OK');
}

{
  const r = aplicarAvaliacaoRhDia({ minutosExtra: 60, tratamentoCredito: 'P' });
  assertEq(r.minutosPagarFolha, 60, 'T4 pagar');
  assertEq(r.minutosBancoDelta, 0, 'T4 banco');
  console.log('[Teste 4] OK');
}

{
  const r = aplicarAvaliacaoRhDia({
    minutosAtraso: 20,
    minutosHorasDevidas: 10,
    tratamentoDebito: 'D',
  });
  assertEq(r.minutosDescontarFolha, 30, 'T5 desconto');
  console.log('[Teste 5] OK');
}

{
  const r = aplicarAvaliacaoRhDia({ minutosFaltaIntegral: 480, tratamentoDebito: 'D' });
  assertEq(r.minutosDescontarFolha, 480, 'T5b falta');
  console.log('[Teste 5b] OK');
}

{
  const r = resolverTratamentosDoBotao('B', { temDebito: true, temCredito: true });
  assertEq(r.tratamentoDebito, 'B', 'resolver debito');
  assertEq(r.tratamentoCredito, 'B', 'resolver credito');
}

console.log('[Teste 6] coberto em workshift-rh-evaluation.test.ts (Jest + mock Prisma)');
console.log('Todos os cenários da engine A/B/P/D passaram.');
