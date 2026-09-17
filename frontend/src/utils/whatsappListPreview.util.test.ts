import { describe, expect, it } from 'vitest';
import {
  classifyWhatsappListPreview,
  formatWhatsappListTime,
  truncateWhatsappPreview,
} from './whatsappListPreview.util';

describe('formatWhatsappListTime', () => {
  it('mostra horário no mesmo dia', () => {
    const now = new Date('2026-09-17T12:00:00');
    expect(formatWhatsappListTime('2026-09-17T09:56:00', now)).toMatch(/09:56/);
  });

  it('mostra Ontem para o dia anterior', () => {
    const now = new Date('2026-09-17T12:00:00');
    expect(formatWhatsappListTime('2026-09-16T18:40:00', now)).toBe('Ontem');
  });
});

describe('classifyWhatsappListPreview', () => {
  it('detecta áudio', () => {
    expect(classifyWhatsappListPreview('🎤 Áudio')).toEqual({ kind: 'audio', text: 'Áudio' });
  });

  it('mantém texto comum', () => {
    expect(classifyWhatsappListPreview('Bom.... eu vou correr atrás').kind).toBe('text');
  });
});

describe('truncateWhatsappPreview', () => {
  it('trunca com reticências', () => {
    const long = 'a'.repeat(60);
    expect(truncateWhatsappPreview(long, 52).endsWith('…')).toBe(true);
  });
});
