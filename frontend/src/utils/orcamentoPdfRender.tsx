import React from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { OrcamentoPDFData, PDFCustomization } from '../types/pdfCustomization';
import OrcamentoPrintable from '../components/PDFCustomization/OrcamentoPrintable';

function pickFolhaTimbradaUrl(customization?: PDFCustomization | null): string | undefined {
  const corners = customization?.design?.corners;
  if (!corners) return undefined;
  if (corners.enabled === false) return undefined;
  if (typeof corners.image === 'string' && corners.image.trim()) return corners.image.trim();
  return undefined;
}

function pickOpacidade(customization?: PDFCustomization | null): number {
  const raw = customization?.watermark?.opacity;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(1, Math.max(0, raw));
  }
  return 0.05;
}

async function tryResolveToDataUrl(url: string | undefined): Promise<string | undefined> {
  const u = (url || '').trim();
  if (!u) return undefined;
  if (u.startsWith('data:')) return u;
  // Só tenta buscar se for mesma origem (ou caminho relativo). Em CORS falhar, devolve original.
  const isHttp = u.startsWith('http://') || u.startsWith('https://');
  if (isHttp) {
    try {
      const parsed = new URL(u, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return u;
      }
    } catch {
      return u;
    }
  }
  try {
    const res = await fetch(u, { credentials: 'include', cache: 'no-cache' });
    if (!res.ok) return u;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao converter folha timbrada para base64'));
      reader.readAsDataURL(blob);
    });
    return dataUrl || u;
  } catch {
    return u;
  }
}

export async function renderOrcamentoPdfBase64(params: {
  orcamentoData: OrcamentoPDFData;
  customization?: PDFCustomization | null;
}): Promise<{ base64: string; filename: string }> {
  // 1) Renderiza o template (inclui PrintRenderer) em um container offscreen.
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
  const folhaTimbradaUrl = await tryResolveToDataUrl(pickFolhaTimbradaUrl(params.customization));
  const opacidade = pickOpacidade(params.customization);

  root.render(
    <div style={{ background: '#fff' }}>
      <OrcamentoPrintable orcamento={params.orcamentoData} folhaTimbradaUrl={folhaTimbradaUrl} opacidade={opacidade} />
    </div>
  );

  // 2) Espera o layout estabilizar e imagens carregarem (timbre).
  await new Promise<void>((r) => setTimeout(() => r(), 120));
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

  // 3) Captura cada página e monta um PDF multipágina (mais confiável que pdf.html em DOM offscreen).
  const pages = Array.from(host.querySelectorAll<HTMLElement>('.pdf-page, .printable-page'));
  if (pages.length === 0) {
    throw new Error('Não foi possível localizar páginas do orçamento para renderização.');
  }

  const pdf = new jsPDF({ format: 'a4', unit: 'pt' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  // Qualidade: capturar em alta resolução + PNG (sem perdas).
  // Atenção: escala alta aumenta o tamanho do PDF e o tempo de geração.
  const QUALITY_SCALE = Math.min(3, Math.max(2, Math.round((window.devicePixelRatio || 1) * 2)));

  for (let i = 0; i < pages.length; i++) {
    const el = pages[i];
    // garantir dimensões medíveis
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      // aguarda mais um tick se o layout ainda não aplicou
      await new Promise<void>((r) => setTimeout(() => r(), 60));
    }
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: QUALITY_SCALE,
      logging: false,
      // garantir captura mesmo fora da viewport
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(el.scrollWidth, 1),
      windowHeight: Math.max(el.scrollHeight, 1),
    });
    const imgData = canvas.toDataURL('image/png');
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  }

  // 4) Exporta em base64 cru (sem prefixo data:...).
  const dataUri = pdf.output('datauristring') as string;
  const idx = dataUri.indexOf('base64,');
  const base64 = idx >= 0 ? dataUri.slice(idx + 'base64,'.length) : dataUri;

  // 5) Cleanup
  try {
    root.unmount();
  } catch {
    // ignore
  }
  document.body.removeChild(host);

  const numero = params.orcamentoData.numeroSequencial ?? params.orcamentoData.numero ?? 'orcamento';
  const filename = `Orcamento-${numero}.pdf`;
  return { base64, filename };
}

