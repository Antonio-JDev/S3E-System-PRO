import React from 'react';
import type { OrcamentoPDFData, PDFCustomization } from '../types/pdfCustomization';
import OrcamentoPrintable from '../components/PDFCustomization/OrcamentoPrintable';
import {
  resolveSystemPdfLetterhead,
  type SystemPdfLetterhead,
} from '../pdf/letterhead';
import { renderDomPagesToPdf } from '../pdf/renderDomToPdf';

export async function renderOrcamentoPdfBase64(params: {
  orcamentoData: OrcamentoPDFData;
  customization?: PDFCustomization | null;
  letterheadOverride?: SystemPdfLetterhead;
}): Promise<{ base64: string; filename: string }> {
  const letterhead =
    params.letterheadOverride ??
    (await resolveSystemPdfLetterhead(params.customization ?? undefined));
  const folhaTimbradaUrl = letterhead.folhaTimbradaDataUrl;
  const opacidade = letterhead.opacidade;

  const numero = params.orcamentoData.numeroSequencial ?? params.orcamentoData.numero ?? 'orcamento';
  const filename = `Orcamento-${numero}.pdf`;

  const { base64 } = await renderDomPagesToPdf({
    filename,
    stabilizeMs: 5000,
    render: (root) => {
      root.render(
        <div style={{ background: '#fff' }}>
          <OrcamentoPrintable
            orcamento={params.orcamentoData}
            folhaTimbradaUrl={folhaTimbradaUrl}
            opacidade={opacidade}
          />
        </div>
      );
    },
  });

  return { base64, filename };
}
