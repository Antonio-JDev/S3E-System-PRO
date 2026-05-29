/**
 * Testes do resolver de folha timbrada (prioridade: storage → template → API).
 * npm test -- letterhead.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PDFCustomization } from '../../types/pdfCustomization';

vi.mock('../../hooks/usePDFCustomization', () => ({
  loadPdfCustomizationFromStorage: vi.fn(),
}));

vi.mock('../../services/pdfCustomizationService', () => ({
  pdfCustomizationService: {
    listTemplates: vi.fn(),
    listFolhasTimbradas: vi.fn(),
  },
}));

vi.mock('../../config/api', () => ({
  getUploadUrl: vi.fn((path: string) => `http://localhost:3001${path}`),
}));

import { loadPdfCustomizationFromStorage } from '../../hooks/usePDFCustomization';
import { pdfCustomizationService } from '../../services/pdfCustomizationService';
import {
  pickFolhaUrlFromCustomization,
  pickOpacidadeFromCustomization,
  tryResolveImageToDataUrl,
  resolveSystemPdfLetterhead,
} from '../letterhead';

const baseCustomization = (): PDFCustomization => ({
  watermark: {
    type: 'none',
    content: '',
    position: 'center',
    opacity: 0.12,
    size: 'medium',
    rotation: 0,
  },
  design: {
    template: 'modern',
    colors: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    corners: {
      enabled: true,
      design: 'custom',
      image: '/uploads/pdf-customization/cornerDesign-test.png',
      opacity: 0.1,
      size: 100,
    },
    typography: {
      fontFamily: 'arial',
      fontSize: 'medium',
    },
    orientation: 'portrait',
    pageSize: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  },
});

describe('letterhead helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pickFolhaUrlFromCustomization retorna URL quando corners habilitado', () => {
    const c = baseCustomization();
    expect(pickFolhaUrlFromCustomization(c)).toBe('/uploads/pdf-customization/cornerDesign-test.png');
  });

  it('pickFolhaUrlFromCustomization retorna undefined quando corners desabilitado', () => {
    const c = baseCustomization();
    c.design.corners.enabled = false;
    expect(pickFolhaUrlFromCustomization(c)).toBeUndefined();
  });

  it('pickOpacidadeFromCustomization limita entre 0 e 1', () => {
    const c = baseCustomization();
    c.watermark.opacity = 2;
    expect(pickOpacidadeFromCustomization(c)).toBe(1);
    c.watermark.opacity = -1;
    expect(pickOpacidadeFromCustomization(c)).toBe(0);
  });

  it('pickOpacidadeFromCustomization usa 0.05 como padrão', () => {
    expect(pickOpacidadeFromCustomization(null)).toBe(0.05);
  });

  it('tryResolveImageToDataUrl mantém data URL sem fetch', async () => {
    const data = 'data:image/png;base64,abc';
    await expect(tryResolveImageToDataUrl(data)).resolves.toBe(data);
  });

  it('tryResolveImageToDataUrl mantém path original quando fetch falha', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const url = '/uploads/pdf-customization/cornerDesign-x.png';
    const result = await tryResolveImageToDataUrl(url);
    expect(result).toBe(url);
  });
});

describe('resolveSystemPdfLetterhead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPdfCustomizationFromStorage).mockReturnValue(null);
    vi.mocked(pdfCustomizationService.listTemplates).mockResolvedValue({
      success: false,
      data: [],
    });
    vi.mocked(pdfCustomizationService.listFolhasTimbradas).mockResolvedValue({
      success: false,
      data: [],
    });
  });

  it('usa folha do localStorage quando presente', async () => {
    const c = baseCustomization();
    vi.mocked(loadPdfCustomizationFromStorage).mockReturnValue(c);

    const resolved = await resolveSystemPdfLetterhead();
    expect(resolved.opacidade).toBe(0.12);
    expect(resolved.folhaTimbradaDataUrl).toContain('/uploads/pdf-customization/cornerDesign-test.png');
    expect(pdfCustomizationService.listTemplates).not.toHaveBeenCalled();
  });

  it('fallback para template do usuário quando storage sem folha', async () => {
    vi.mocked(pdfCustomizationService.listTemplates).mockResolvedValue({
      success: true,
      data: [
        {
          id: 't1',
          name: 'Padrão',
          isDefault: true,
          customization: baseCustomization(),
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        },
      ],
    } as never);

    const resolved = await resolveSystemPdfLetterhead();
    expect(resolved.folhaTimbradaDataUrl).toContain('cornerDesign-test.png');
    expect(resolved.opacidade).toBe(0.12);
  });

  it('fallback para primeira folha da API quando storage e template vazios', async () => {
    vi.mocked(pdfCustomizationService.listFolhasTimbradas).mockResolvedValue({
      success: true,
      data: [
        {
          filename: 'cornerDesign-latest.png',
          url: '/uploads/pdf-customization/cornerDesign-latest.png',
          size: 1000,
          createdAt: '2026-05-01',
        },
      ],
    } as never);

    const resolved = await resolveSystemPdfLetterhead();
    expect(resolved.folhaTimbradaDataUrl).toContain('cornerDesign-latest.png');
    expect(resolved.opacidade).toBe(0.05);
  });

  it('respeita customizationOverride sem ler storage', async () => {
    const override = baseCustomization();
    override.design.corners.image = '/uploads/pdf-customization/override.png';

    const resolved = await resolveSystemPdfLetterhead(override);
    expect(resolved.folhaTimbradaDataUrl).toContain('override.png');
    expect(loadPdfCustomizationFromStorage).not.toHaveBeenCalled();
  });
});
