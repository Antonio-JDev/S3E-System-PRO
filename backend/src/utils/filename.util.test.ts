import {
  repairUtf8Mojibake,
  normalizeUserFilename,
  normalizeStoredMediaFilename,
  buildContentDisposition,
} from './filename.util';

describe('repairUtf8Mojibake', () => {
  it('corrige trecho Latin-1 após emoji', () => {
    expect(repairUtf8Mojibake('📎 Arquivo — 01 - LocalizaÃ§Ã£o.pdf')).toBe('📎 Arquivo — 01 - Localização.pdf');
  });

  it('não altera português correto', () => {
    expect(repairUtf8Mojibake('ação')).toBe('ação');
  });
});

describe('normalizeUserFilename', () => {
  it('NFC + mojibake', () => {
    expect(normalizeUserFilename('01 - Croqui de LocalizaÃ§Ã£o.pdf')).toBe('01 - Croqui de Localização.pdf');
  });
});

describe('normalizeStoredMediaFilename', () => {
  it('retorna undefined para vazio', () => {
    expect(normalizeStoredMediaFilename('')).toBeUndefined();
    expect(normalizeStoredMediaFilename(null)).toBeUndefined();
  });
});

describe('buildContentDisposition', () => {
  it('inclui filename* UTF-8', () => {
    const h = buildContentDisposition('attachment', 'Orçamento nº 1.pdf', 'arquivo.pdf');
    expect(h).toContain("filename*=UTF-8''");
    expect(h).toContain(encodeURIComponent('Orçamento nº 1.pdf'));
    expect(h.startsWith('attachment;')).toBe(true);
  });
});
