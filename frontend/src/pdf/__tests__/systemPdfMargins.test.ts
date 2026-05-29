import { describe, it, expect } from 'vitest';
import { effectiveLetterheadOpacity, LETTERHEAD_OPACITY_REPORT_MIN } from '../systemPdfMargins';

describe('effectiveLetterheadOpacity', () => {
  it('aplica piso mínimo para relatórios', () => {
    expect(effectiveLetterheadOpacity(0.05)).toBe(LETTERHEAD_OPACITY_REPORT_MIN);
    expect(effectiveLetterheadOpacity(0.5)).toBe(0.5);
  });

  it('limita em 1', () => {
    expect(effectiveLetterheadOpacity(2)).toBe(1);
  });
});
