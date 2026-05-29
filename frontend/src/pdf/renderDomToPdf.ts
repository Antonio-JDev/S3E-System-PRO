import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { SystemPdfLetterhead } from './letterhead';

const QUALITY_SCALE = Math.min(3, Math.max(2, Math.round((window.devicePixelRatio || 1) * 2)));

export async function waitForStablePdfPages(host: HTMLElement, maxWaitMs: number): Promise<void> {
  const started = Date.now();
  let lastCount = -1;
  let stableTicks = 0;

  while (Date.now() - started < maxWaitMs) {
    const count = host.querySelectorAll('.pdf-page, .printable-page').length;
    if (count > 0 && count === lastCount) {
      stableTicks += 1;
      if (stableTicks >= 4) return;
    } else {
      stableTicks = 0;
      lastCount = count;
    }
    await new Promise<void>((r) => setTimeout(() => r(), 80));
  }
}

async function waitForImages(host: HTMLElement): Promise<void> {
  const images = host.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = img as HTMLImageElement;
          if (el.complete) return resolve();
          el.onload = () => resolve();
          el.onerror = () => resolve();
        })
    )
  );
}

export type RenderDomToPdfResult = {
  blob: Blob;
  base64: string;
  filename: string;
};

/**
 * Renderiza React em container offscreen, captura `.pdf-page` / `.printable-page` e monta PDF A4.
 */
export async function renderDomPagesToPdf(params: {
  render: (root: Root) => void;
  filename: string;
  stabilizeMs?: number;
}): Promise<RenderDomToPdfResult> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.background = '#fff';
  host.style.opacity = '0';
  host.style.pointerEvents = 'none';
  host.style.transform = 'translateX(-200vw)';
  document.body.appendChild(host);

  const root = createRoot(host);
  params.render(root);

  await new Promise<void>((r) => setTimeout(() => r(), 150));
  await waitForImages(host);
  await waitForStablePdfPages(host, params.stabilizeMs ?? 5000);

  const pages = Array.from(host.querySelectorAll<HTMLElement>('.pdf-page, .printable-page'));
  if (pages.length === 0) {
    try {
      root.unmount();
    } catch {
      // ignore
    }
    document.body.removeChild(host);
    throw new Error('Não foi possível localizar páginas para renderização do PDF.');
  }

  const pdf = new jsPDF({ format: 'a4', unit: 'pt' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      await new Promise<void>((r) => setTimeout(() => r(), 60));
    }
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: QUALITY_SCALE,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(el.scrollWidth, 1),
      windowHeight: Math.max(el.scrollHeight, 1),
    });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  }

  const dataUri = pdf.output('datauristring') as string;
  const idx = dataUri.indexOf('base64,');
  const base64 = idx >= 0 ? dataUri.slice(idx + 'base64,'.length) : dataUri;
  const blob = pdf.output('blob') as Blob;

  try {
    root.unmount();
  } catch {
    // ignore
  }
  document.body.removeChild(host);

  return { blob, base64, filename: params.filename };
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type RenderSystemPdfDocumentParams = {
  /** Um ou mais nós (cada um deve estar dentro de SystemPdfPage ou printable-page). */
  document: React.ReactElement;
  filename: string;
  letterhead?: SystemPdfLetterhead;
  stabilizeMs?: number;
};

export async function renderSystemPdfDocument(
  params: RenderSystemPdfDocumentParams
): Promise<RenderDomToPdfResult> {
  return renderDomPagesToPdf({
    filename: params.filename,
    stabilizeMs: params.stabilizeMs,
    render: (root) => {
      root.render(
        React.createElement('div', { style: { background: '#fff' } }, params.document)
      );
    },
  });
}
