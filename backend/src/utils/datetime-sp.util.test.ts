import {
  dataHoraEmBrasilia,
  dataReferenciaDiaCivilUtc,
  diaSemanaCivil,
  ehFimDeSemanaCivil,
  ehFeriado,
  ehDomingoOuFeriado,
  formatHoraBrasilia,
} from './datetime-sp.util';

describe('datetime-sp.util', () => {
  describe('dataReferenciaDiaCivilUtc', () => {
    it('usa meio-dia UTC (mesmo dia civil em qualquer host)', () => {
      const d = dataReferenciaDiaCivilUtc(2026, 3, 15);
      expect(d.toISOString()).toBe('2026-03-15T12:00:00.000Z');
    });
  });

  describe('dataHoraEmBrasilia', () => {
    it('aplica -03:00 nas batidas', () => {
      const d = dataHoraEmBrasilia(2026, 3, 15, '08:30');
      expect(d.toISOString()).toBe('2026-03-15T11:30:00.000Z');
    });

    it('converte 00:00 corretamente', () => {
      const d = dataHoraEmBrasilia(2026, 3, 15, '00:00');
      expect(d.toISOString()).toBe('2026-03-15T03:00:00.000Z');
    });
  });

  describe('diaSemanaCivil e ehFimDeSemanaCivil', () => {
    it('dia civil domingo/sábado independente do TZ do processo', () => {
      expect(diaSemanaCivil(2026, 3, 15)).toBe(0); // Domingo
      expect(ehFimDeSemanaCivil(2026, 3, 15)).toBe(true);
      expect(ehFimDeSemanaCivil(2026, 3, 18)).toBe(false); // Quarta
    });

    it('identifica sábado corretamente', () => {
      expect(diaSemanaCivil(2026, 3, 14)).toBe(6); // Sábado
      expect(ehFimDeSemanaCivil(2026, 3, 14)).toBe(true);
    });
  });

  describe('ehFeriado', () => {
    it('01/01 é feriado nacional (Confraternização Universal)', () => {
      expect(ehFeriado(2026, 1, 1)).toBe(true);
    });

    it('21/04 é feriado nacional (Tiradentes)', () => {
      expect(ehFeriado(2026, 4, 21)).toBe(true);
    });

    it('01/05 é feriado nacional (Dia do Trabalho)', () => {
      expect(ehFeriado(2026, 5, 1)).toBe(true);
    });

    it('07/09 é feriado nacional (Independência)', () => {
      expect(ehFeriado(2026, 9, 7)).toBe(true);
    });

    it('12/10 é feriado nacional (Nossa Senhora Aparecida)', () => {
      expect(ehFeriado(2026, 10, 12)).toBe(true);
    });

    it('02/11 é feriado nacional (Finados)', () => {
      expect(ehFeriado(2026, 11, 2)).toBe(true);
    });

    it('15/11 é feriado nacional (Proclamação da República)', () => {
      expect(ehFeriado(2026, 11, 15)).toBe(true);
    });

    it('25/12 é feriado nacional (Natal)', () => {
      expect(ehFeriado(2026, 12, 25)).toBe(true);
    });

    it('15/06 é feriado municipal (Aniversário de Itajaí)', () => {
      expect(ehFeriado(2026, 6, 15)).toBe(true);
      expect(ehFeriado(2026, 6, 11)).toBe(false);
    });

    it('dia comum não é feriado', () => {
      expect(ehFeriado(2026, 3, 10)).toBe(false);
      expect(ehFeriado(2026, 7, 15)).toBe(false);
    });

    it('Carnaval 2026 é feriado móvel (17/02/2026)', () => {
      // Páscoa 2026 = 05/04, Carnaval = Páscoa - 47 dias = 17/02
      expect(ehFeriado(2026, 2, 17)).toBe(true);
    });

    it('Sexta-feira Santa 2026 é feriado móvel (03/04/2026)', () => {
      // Páscoa 2026 = 05/04, Sexta Santa = Páscoa - 2 dias = 03/04
      expect(ehFeriado(2026, 4, 3)).toBe(true);
    });

    it('Corpus Christi 2026 é feriado móvel (04/06/2026)', () => {
      // Páscoa 2026 = 05/04, Corpus Christi = Páscoa + 60 dias = 04/06
      expect(ehFeriado(2026, 6, 4)).toBe(true);
    });
  });

  describe('ehDomingoOuFeriado', () => {
    it('domingo é true', () => {
      // 01/03/2026 é domingo
      expect(ehDomingoOuFeriado(2026, 3, 1)).toBe(true);
    });

    it('feriado em dia de semana é true', () => {
      // 21/04/2026 é terça-feira (Tiradentes)
      expect(ehDomingoOuFeriado(2026, 4, 21)).toBe(true);
    });

    it('sábado comum é false (não é domingo nem feriado)', () => {
      // 14/03/2026 é sábado comum
      expect(ehDomingoOuFeriado(2026, 3, 14)).toBe(false);
    });

    it('dia útil comum é false', () => {
      expect(ehDomingoOuFeriado(2026, 3, 10)).toBe(false);
    });
  });

  describe('formatHoraBrasilia', () => {
    it('converte UTC para hora de Brasília', () => {
      // 11:00 UTC = 08:00 BR (UTC - 3h)
      const d = new Date('2026-03-05T11:00:00.000Z');
      expect(formatHoraBrasilia(d)).toBe('08:00');
    });

    it('converte 14:30 UTC para 11:30 BR', () => {
      const d = new Date('2026-03-05T14:30:00.000Z');
      expect(formatHoraBrasilia(d)).toBe('11:30');
    });

    it('converte 03:00 UTC para 00:00 BR (meia-noite)', () => {
      const d = new Date('2026-03-05T03:00:00.000Z');
      expect(formatHoraBrasilia(d)).toBe('00:00');
    });

    it('converte 23:15 UTC para 20:15 BR', () => {
      const d = new Date('2026-03-05T23:15:00.000Z');
      expect(formatHoraBrasilia(d)).toBe('20:15');
    });

    it('retorna null para entrada null', () => {
      expect(formatHoraBrasilia(null)).toBeNull();
    });

    it('retorna null para entrada undefined', () => {
      expect(formatHoraBrasilia(undefined)).toBeNull();
    });

    it('funciona com Date criado por dataHoraEmBrasilia', () => {
      // dataHoraEmBrasilia(2026, 3, 5, '08:30') cria 11:30 UTC
      const d = dataHoraEmBrasilia(2026, 3, 5, '08:30');
      expect(formatHoraBrasilia(d)).toBe('08:30');
    });
  });
});
