/**
 * Testes do wrapper de PDF de orçamento (delega ao núcleo pdf/).
 * npm test -- orcamentoPdfRender.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { OrcamentoPDFData } from '../../types/pdfCustomization';

vi.mock('../../pdf/letterhead', () => ({
  resolveSystemPdfLetterhead: vi.fn(),
}));

vi.mock('../../pdf/renderDomToPdf', () => ({
  renderDomPagesToPdf: vi.fn(),
}));

vi.mock('../../components/PDFCustomization/OrcamentoPrintable', () => ({
  default: () => null,
}));

import { resolveSystemPdfLetterhead } from '../../pdf/letterhead';
import { renderDomPagesToPdf } from '../../pdf/renderDomToPdf';
import { renderOrcamentoPdfBase64 } from '../orcamentoPdfRender';

const orcamentoMinimo: OrcamentoPDFData = {
  numero: 'ABC',
  numeroSequencial: 42,
  emissao: '01/01/2026',
  validade: '31/01/2026',
  cliente: { nome: 'Cliente', email: '', telefone: '', cpfCnpj: '' },
  enderecos: {},
  projeto: { titulo: 'Projeto' },
  items: [],
  financeiro: { subtotal: 0, desconto: 0, impostos: 0, valorTotal: 0 },
  pagamento: 'À vista',
};

describe('renderOrcamentoPdfBase64', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSystemPdfLetterhead).mockResolvedValue({
      folhaTimbradaDataUrl: 'data:image/png;base64,folha',
      opacidade: 0.05,
    });
    vi.mocked(renderDomPagesToPdf).mockResolvedValue({
      base64: 'cGRmYmFzZTY0',
      blob: new Blob(),
      filename: 'Orcamento-42.pdf',
    });
  });

  it('resolve letterhead e gera PDF com nome Orcamento-{numero}', async () => {
    const result = await renderOrcamentoPdfBase64({ orcamentoData: orcamentoMinimo });

    expect(resolveSystemPdfLetterhead).toHaveBeenCalledWith(undefined);
    expect(renderDomPagesToPdf).toHaveBeenCalled();
    expect(result.filename).toBe('Orcamento-42.pdf');
    expect(result.base64).toBe('cGRmYmFzZTY0');
  });

  it('usa letterheadOverride sem chamar resolveSystemPdfLetterhead', async () => {
    const override = { folhaTimbradaDataUrl: 'data:image/png;base64,custom', opacidade: 0.1 };

    await renderOrcamentoPdfBase64({
      orcamentoData: orcamentoMinimo,
      letterheadOverride: override,
    });

    expect(resolveSystemPdfLetterhead).not.toHaveBeenCalled();
    expect(renderDomPagesToPdf).toHaveBeenCalled();
  });
});
