import {
  bucketsGraficoDashboard,
  parsePeriodoDashboard,
  periodoAtualEAnterior,
} from './dashboardPeriodo.util';

const HOJE = new Date(2026, 9, 5, 10, 0, 0);

describe('parsePeriodoDashboard', () => {
  it('aceita os períodos conhecidos e cai em mensal para o resto', () => {
    expect(parsePeriodoDashboard('bimonthly')).toBe('bimonthly');
    expect(parsePeriodoDashboard('quarterly')).toBe('quarterly');
    expect(parsePeriodoDashboard('semester')).toBe('semester');
    expect(parsePeriodoDashboard('annual')).toBe('annual');
    expect(parsePeriodoDashboard('xpto')).toBe('monthly');
    expect(parsePeriodoDashboard(undefined)).toBe('monthly');
  });
});

describe('bucketsGraficoDashboard', () => {
  it('mensal gera os 12 meses do ano atual', () => {
    const b = bucketsGraficoDashboard('monthly', HOJE);
    expect(b).toHaveLength(12);
    expect(b[0].label).toBe('Jan');
    expect(b[11].end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it('bimestral gera 6 fatias de 2 meses', () => {
    const b = bucketsGraficoDashboard('bimonthly', HOJE);
    expect(b.map((x) => x.label)).toEqual(['1º Bim', '2º Bim', '3º Bim', '4º Bim', '5º Bim', '6º Bim']);
    expect(b[0].start).toEqual(new Date(2026, 0, 1));
    expect(b[0].end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it('trimestral gera 4 fatias de 3 meses', () => {
    const b = bucketsGraficoDashboard('quarterly', HOJE);
    expect(b).toHaveLength(4);
    expect(b[3].label).toBe('4º Tri');
    expect(b[3].start).toEqual(new Date(2026, 9, 1));
  });

  it('semestral inclui o ano atual', () => {
    const b = bucketsGraficoDashboard('semester', HOJE);
    expect(b.map((x) => x.label)).toEqual(['1º Sem 2025', '2º Sem 2025', '1º Sem 2026', '2º Sem 2026']);
  });

  it('anual gera os últimos 6 anos', () => {
    const b = bucketsGraficoDashboard('annual', HOJE);
    expect(b.map((x) => x.label)).toEqual(['2021', '2022', '2023', '2024', '2025', '2026']);
  });
});

describe('periodoAtualEAnterior', () => {
  it('trimestral: 4º tri atual e 3º tri anterior', () => {
    const { atual, anterior } = periodoAtualEAnterior('quarterly', HOJE);
    expect(atual.start).toEqual(new Date(2026, 9, 1));
    expect(anterior.start).toEqual(new Date(2026, 6, 1));
    expect(anterior.end).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
  });

  it('bimestral em janeiro volta para o último bimestre do ano anterior', () => {
    const { atual, anterior } = periodoAtualEAnterior('bimonthly', new Date(2026, 0, 15));
    expect(atual.start).toEqual(new Date(2026, 0, 1));
    expect(anterior.start).toEqual(new Date(2025, 10, 1));
    expect(anterior.end).toEqual(new Date(2025, 11, 31, 23, 59, 59, 999));
  });

  it('mensal compara com o mês anterior', () => {
    const { atual, anterior } = periodoAtualEAnterior('monthly', HOJE);
    expect(atual.label).toBe('Out');
    expect(anterior.label).toBe('Set');
  });

  it('anual compara com o ano anterior', () => {
    const { atual, anterior } = periodoAtualEAnterior('annual', HOJE);
    expect(atual.label).toBe('2026');
    expect(anterior.label).toBe('2025');
  });
});
