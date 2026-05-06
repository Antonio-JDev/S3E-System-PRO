import * as XLSX from 'xlsx';
import {
  extrairAnoMesDoSheet,
  parsePresencaXlsBuffer,
  splitBatidasCelula,
  extrairBatidasDaCelula,
} from './ponto-import.parser';

describe('ponto-import.parser', () => {
  it('splitBatidasCelula interpreta quebras de linha e HH:mm', () => {
    expect(splitBatidasCelula('08:19\n12:36\n15:38')).toEqual(['08:19', '12:36', '15:38']);
  });

  it('extrairAnoMesDoSheet lê YYYY/MM/DD nas primeiras linhas', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['', 'DATA DE PR 2026/03/01 ~ 03/31( eng )'],
    ]);
    ws['!ref'] = 'A1:B1';
    expect(extrairAnoMesDoSheet(ws)).toEqual({ ano: 2026, mes: 3 });
  });

  it('parsePresencaXlsBuffer extrai bloco mínimo (xlsx em buffer)', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['', 'DATA DE PR 2026/03/01 ~ 03/31'],
      [],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [
        'Namero I:99',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'NOME : teste import',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'DEPARTAME EXECUCAO',
      ],
      ['08:00\n12:00\n13:00\n18:00', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    ws['!ref'] = 'A1:W5';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro de Presenca');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const r = parsePresencaXlsBuffer(buf);
    expect(r.ano).toBe(2026);
    expect(r.mes).toBe(3);
    expect(r.colaboradores).toHaveLength(1);
    expect(r.colaboradores[0].codigoRelogio).toBe(99);
    expect(r.colaboradores[0].dias[0]).toEqual({
      dia: 1,
      batidas: ['08:00', '12:00', '13:00', '18:00'],
    });
  });

  it('parsePresencaXlsBuffer aceita Namero/NOME em células separadas (export real do relógio)', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['', 'DATA DE PR 2026/03/01 ~ 03/31'],
      [],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      [
        'Namero I：',
        '',
        '4',
        '',
        '',
        '',
        '',
        '',
        'NOME :',
        '',
        'jorge',
      ],
      ['08:00\n12:00', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    ws['!ref'] = 'A1:L5';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro de Presenca');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const r = parsePresencaXlsBuffer(buf);
    expect(r.colaboradores).toHaveLength(1);
    expect(r.colaboradores[0].codigoRelogio).toBe(4);
    expect(r.colaboradores[0].nomeRelogio).toBe('jorge');
    expect(r.colaboradores[0].dias[0]).toEqual({ dia: 1, batidas: ['08:00', '12:00'] });
  });

  it('extrairBatidasDaCelula aceita fração do dia (Excel)', () => {
    const ws = XLSX.utils.aoa_to_sheet([[0.34375]]);
    ws['!ref'] = 'A1';
    const bat = extrairBatidasDaCelula(ws, 0, 0);
    expect(bat.length).toBe(1);
    expect(bat[0]).toMatch(/^\d{2}:\d{2}$/);
  });
});
