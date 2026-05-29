/**
 * Testes do pipeline DOM → PDF (html2canvas + jsPDF).
 * npm test -- renderDomToPdf.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import SystemPdfPage from '../SystemPdfPage';
import {
  waitForStablePdfPages,
  renderDomPagesToPdf,
  downloadPdfBlob,
} from '../renderDomToPdf';

const mockAddImage = vi.fn();
const mockAddPage = vi.fn();
const mockOutput = vi.fn();

vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => 'data:image/png;base64,ZmFrZQ==',
    })
  ),
}));

vi.mock('jspdf', () => ({
  default: class MockJsPDF {
    internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    addImage = mockAddImage;
    addPage = mockAddPage;
    output(type: string) {
      return mockOutput(type);
    }
  },
}));

beforeEach(() => {
  mockOutput.mockImplementation((type: string) => {
    if (type === 'datauristring') return 'data:application/pdf;base64,cGRm';
    if (type === 'blob') return new Blob(['pdf'], { type: 'application/pdf' });
    return '';
  });
});

describe('waitForStablePdfPages', () => {
  it('resolve quando há páveis estáveis no host', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="pdf-page"></div>';
    document.body.appendChild(host);

    const promise = waitForStablePdfPages(host, 2000);
    await promise;
    document.body.removeChild(host);
  });
});

describe('renderDomPagesToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOutput.mockImplementation((type: string) => {
      if (type === 'datauristring') return 'data:application/pdf;base64,cGRm';
      if (type === 'blob') return new Blob(['pdf'], { type: 'application/pdf' });
      return '';
    });
  });

  it('gera blob e base64 a partir de SystemPdfPage', async () => {
    const result = await renderDomPagesToPdf({
      filename: 'teste.pdf',
      stabilizeMs: 500,
      render: (root) => {
        root.render(
          React.createElement(SystemPdfPage, { compact: true }, 'Extrato de caixa')
        );
      },
    });

    expect(result.filename).toBe('teste.pdf');
    expect(result.base64).toBe('cGRm');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(mockAddImage).toHaveBeenCalled();
  });

  it('lança erro quando não há .pdf-page no DOM', async () => {
    await expect(
      renderDomPagesToPdf({
        filename: 'vazio.pdf',
        stabilizeMs: 300,
        render: (root) => {
          root.render(React.createElement('div', null, 'sem página'));
        },
      })
    ).rejects.toThrow(/Não foi possível localizar páginas/);
  });
});

describe('downloadPdfBlob', () => {
  it('cria link de download e revoga URL', () => {
    const blob = new Blob(['x'], { type: 'application/pdf' });
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click, href: '', download: '' } as unknown as HTMLElement);

    downloadPdfBlob(blob, 'arquivo.pdf');

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:mock');
  });
});
