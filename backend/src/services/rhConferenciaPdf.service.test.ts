/**
 * Testes do PDF de conferência de ponto com folha timbrada (PDFKit).
 * npm test -- rhConferenciaPdf.service.test.ts
 */

import { TipoContratoFuncionario } from '@prisma/client';
import { gerarBufferPdfConferenciaPonto } from './rhConferenciaPdf.service';
import type { FolhaMesResumo } from './rh.service';

const demonstrativoVazio = {
  horasNormais: { horas: 160, valor: 3000 },
  horasExtrasSegSex50: { horas: 0, valor: 0 },
  horasExtrasSabado50: { horas: 0, valor: 0 },
  horasExtras100: { horas: 0, valor: 0 },
  horasNoturnas20: { horas: 0, valor: 0 },
  totalHorasMes: { horas: 160 },
  descontoAtraso: { horas: 0, valor: 0 },
  descontoSaidaAntecipada: { horas: 0, valor: 0 },
  descontoFalta: { dias: 0, horas: 0, valor: 0 },
  totalDescontosRef: { horas: 0, valor: 0 },
  lancamentosManuais: [],
  totalAPagar: 3000,
};

const folhaMinima: FolhaMesResumo = {
  funcionarioId: 'func-1',
  nome: 'Colaborador Teste',
  tipoContrato: TipoContratoFuncionario.REGISTRADO,
  referencia: { ano: 2026, mes: 5 },
  horas: {
    normais: 160,
    extras50: 0,
    extras100: 0,
    fimDeSemana: 0,
    total: 160,
  },
  valores: {
    salarioBase: 3000,
    valorHoraBase: 18.75,
    valorHorasNormais: 3000,
    valorHorasExtras50: 0,
    valorHorasExtras100: 0,
    valorHorasAutonomo: 0,
    totalBeneficios: 0,
    totalAPagar: 3000,
    totalSemBonusDescontos: 3000,
  },
  resumoPonto: {
    diasFaltados: 0,
    horasTrabalhadas: 160,
  },
  lancamentos: [],
  totaisLancamentos: { subtracoes: 0, acrescimos: 0 },
  demonstrativo: demonstrativoVazio,
  horasNormais: demonstrativoVazio.horasNormais,
  horasExtrasSegSex50: demonstrativoVazio.horasExtrasSegSex50,
  horasExtrasSabado50: demonstrativoVazio.horasExtrasSabado50,
  horasExtras100: demonstrativoVazio.horasExtras100,
  horasNoturnas20: demonstrativoVazio.horasNoturnas20,
  descontoAtraso: demonstrativoVazio.descontoAtraso,
  descontoSaidaAntecipada: demonstrativoVazio.descontoSaidaAntecipada,
  descontoFalta: demonstrativoVazio.descontoFalta,
  totalDescontosRef: demonstrativoVazio.totalDescontosRef,
  lancamentosManuais: demonstrativoVazio.lancamentosManuais,
  totalAPagar: demonstrativoVazio.totalAPagar,
  conferenciaPonto: [
    {
      dia: 2,
      diaSemana: 1,
      diaSemanaLabel: 'Seg',
      ehFimDeSemana: false,
      ehFeriado: false,
      nomeFeriado: null,
      temRegistro: true,
      horasLiquidas: 8,
      entrada: '08:00',
      saida: '17:00',
      batidas: ['08:00', '12:00', '13:00', '17:00'],
      registroPontoId: 'reg-1',
      statusConsistencia: null,
      situacao: 'OK',
      minutosAtraso: 0,
      minutosHorasDevidas: 0,
      minutosExtra20: 0,
      faltaJustificada: false,
    },
  ],
};

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length > 4 && buf.subarray(0, 5).toString() === '%PDF-';
}

describe('gerarBufferPdfConferenciaPonto', () => {
  it('gera PDF válido sem letterhead', async () => {
    const buf = await gerarBufferPdfConferenciaPonto(folhaMinima, null);
    expect(isPdfBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('gera PDF válido com letterhead (imagem de fundo)', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const buf = await gerarBufferPdfConferenciaPonto(folhaMinima, {
      imageBuffer: png1x1,
      opacidade: 0.05,
    });
    expect(isPdfBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('PDF com letterhead tem tamanho maior que sem timbre (mesma folha)', async () => {
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    const [semTimbre, comTimbre] = await Promise.all([
      gerarBufferPdfConferenciaPonto(folhaMinima, null),
      gerarBufferPdfConferenciaPonto(folhaMinima, { imageBuffer: png1x1, opacidade: 0.05 }),
    ]);
    expect(comTimbre.length).toBeGreaterThan(semTimbre.length);
  });
});
