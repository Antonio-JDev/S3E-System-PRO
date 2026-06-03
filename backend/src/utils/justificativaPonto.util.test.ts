import {
  aplicarClassificacaoNosMinutos,
  intervaloJustificativaMinutos,
  minutosAbonadosParaHorasTrabalhadas,
  parseClassificacaoJustificativa,
} from './justificativaPonto.util';

describe('justificativaPonto.util', () => {
  describe('parseClassificacaoJustificativa', () => {
    it('retorna ABONAR quando vazio ou desconhecido', () => {
      expect(parseClassificacaoJustificativa(null)).toBe('ABONAR');
      expect(parseClassificacaoJustificativa(undefined)).toBe('ABONAR');
      expect(parseClassificacaoJustificativa('')).toBe('ABONAR');
      expect(parseClassificacaoJustificativa('outro')).toBe('ABONAR');
      expect(parseClassificacaoJustificativa('abonar')).toBe('ABONAR');
    });

    it('reconhece DESCONTAR_BANCO e DESCONTAR_HORAS_DEVIDAS', () => {
      expect(parseClassificacaoJustificativa('DESCONTAR_BANCO')).toBe('DESCONTAR_BANCO');
      expect(parseClassificacaoJustificativa('descontar_banco')).toBe('DESCONTAR_BANCO');
      expect(parseClassificacaoJustificativa('DESCONTAR_HORAS_DEVIDAS')).toBe('DESCONTAR_HORAS_DEVIDAS');
    });
  });

  describe('intervaloJustificativaMinutos', () => {
    it('calcula diferença em minutos entre HH:mm', () => {
      expect(intervaloJustificativaMinutos('12:00', '13:00')).toBe(60);
      expect(intervaloJustificativaMinutos('07:30', '08:00')).toBe(30);
      expect(intervaloJustificativaMinutos('12:00', '12:00')).toBe(0);
    });

    it('retorna 0 quando início e fim são inválidos ou ambos vazios', () => {
      expect(intervaloJustificativaMinutos(null, null)).toBe(0);
      expect(intervaloJustificativaMinutos('12:00', null)).toBe(0);
      expect(intervaloJustificativaMinutos('invalid', 'bad')).toBe(0);
    });

    it('não retorna valor negativo se fim antes do início', () => {
      expect(intervaloJustificativaMinutos('14:00', '12:00')).toBe(0);
    });
  });

  describe('aplicarClassificacaoNosMinutos', () => {
    const baseSaida = {
      bruto: 90,
      campo: 'SAIDA' as const,
      justificativaTipo: 'SAIDA_ANTECIPADA' as const,
      horaInicio: '12:00',
      horaFim: '13:00',
    };

    it('retorna 0 quando bruto é 0', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          ...baseSaida,
          bruto: 0,
          classificacao: 'ABONAR',
        }),
      ).toBe(0);
    });

    it('ABONAR reduz minutos pelo intervalo da justificativa (saída antecipada)', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          ...baseSaida,
          classificacao: 'ABONAR',
        }),
      ).toBe(30);
    });

    it('DESCONTAR_BANCO também reduz na exibição da folha (mesmo efeito que abonar nos minutos)', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          ...baseSaida,
          classificacao: 'DESCONTAR_BANCO',
        }),
      ).toBe(30);
    });

    it('DESCONTAR_HORAS_DEVIDAS mantém o bruto', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          ...baseSaida,
          classificacao: 'DESCONTAR_HORAS_DEVIDAS',
        }),
      ).toBe(90);
    });

    it('não altera quando tipo da justificativa não corresponde ao campo', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          bruto: 45,
          campo: 'ATRASO',
          justificativaTipo: 'SAIDA_ANTECIPADA',
          classificacao: 'ABONAR',
          horaInicio: '12:00',
          horaFim: '13:00',
        }),
      ).toBe(45);
    });

    it('ABONAR em entrada atrasada reduz atraso pelo intervalo', () => {
      expect(
        aplicarClassificacaoNosMinutos({
          bruto: 50,
          campo: 'ATRASO',
          justificativaTipo: 'ENTRADA_ATRASADA',
          classificacao: 'ABONAR',
          horaInicio: '07:30',
          horaFim: '08:00',
        }),
      ).toBe(20);
    });
  });

  describe('minutosAbonadosParaHorasTrabalhadas', () => {
    it('retorna intervalo em minutos só para ABONAR', () => {
      expect(
        minutosAbonadosParaHorasTrabalhadas({
          classificacao: 'ABONAR',
          horaInicio: '12:00',
          horaFim: '13:00',
        }),
      ).toBe(60);
      expect(
        minutosAbonadosParaHorasTrabalhadas({
          classificacao: 'DESCONTAR_BANCO',
          horaInicio: '12:00',
          horaFim: '13:00',
        }),
      ).toBe(0);
      expect(
        minutosAbonadosParaHorasTrabalhadas({
          classificacao: 'DESCONTAR_HORAS_DEVIDAS',
          horaInicio: '12:00',
          horaFim: '13:00',
        }),
      ).toBe(0);
    });
  });
});
