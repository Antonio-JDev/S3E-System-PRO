import { getUploadUrl } from '../config/api';
import { loadPdfCustomizationFromStorage } from '../hooks/usePDFCustomization';
import { pdfCustomizationService } from '../services/pdfCustomizationService';
import type { PDFCustomization } from '../types/pdfCustomization';

export type SystemPdfLetterhead = {
  folhaTimbradaDataUrl?: string;
  opacidade: number;
};

export function pickFolhaUrlFromCustomization(customization?: PDFCustomization | null): string | undefined {
  const corners = customization?.design?.corners;
  if (!corners || corners.enabled === false) return undefined;
  const img = corners.image;
  return typeof img === 'string' && img.trim() ? img.trim() : undefined;
}

export function pickOpacidadeFromCustomization(customization?: PDFCustomization | null): number {
  const raw = customization?.watermark?.opacity;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.min(1, Math.max(0, raw));
  }
  return 0.05;
}

/**
 * Folha timbrada customizada (PNG/JPG A4) deve aparecer inteira.
 * A opacidade do modal aplica-se só à marca d'água S3E padrão (texto central).
 */
export function letterheadLayerOpacity(hasCustomFolha: boolean, configuredOpacity: number): number {
  if (hasCustomFolha) return 1;
  return configuredOpacity;
}

/** Converte URL/path da folha em data URL (html2canvas / preview offline). */
export async function tryResolveImageToDataUrl(url: string | undefined): Promise<string | undefined> {
  const u = (url || '').trim();
  if (!u) return undefined;
  if (u.startsWith('data:')) return u;

  let fetchUrl = u;
  if (u.startsWith('/uploads/')) {
    fetchUrl = getUploadUrl(u);
  }

  const isHttp = fetchUrl.startsWith('http://') || fetchUrl.startsWith('https://');
  if (isHttp) {
    try {
      const parsed = new URL(fetchUrl, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return u;
      }
    } catch {
      return u;
    }
  }

  try {
    const res = await fetch(fetchUrl, { credentials: 'include', cache: 'no-cache' });
    if (!res.ok) return u;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao converter imagem para base64'));
      reader.readAsDataURL(blob);
    });
    return dataUrl || u;
  } catch {
    return u;
  }
}

async function folhaFromUserTemplate(): Promise<{ url?: string; opacidade: number }> {
  const res = await pdfCustomizationService.listTemplates();
  if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
    return { opacidade: 0.05 };
  }
  const sorted = [...res.data].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const tpl = sorted[0];
  const url = pickFolhaUrlFromCustomization(tpl.customization);
  return { url, opacidade: pickOpacidadeFromCustomization(tpl.customization) };
}

async function folhaFromServerList(): Promise<string | undefined> {
  const res = await pdfCustomizationService.listFolhasTimbradas();
  if (!res.success || !Array.isArray(res.data) || res.data.length === 0) return undefined;
  const first = res.data[0];
  return getUploadUrl(first.url);
}

/**
 * Resolve folha timbrada padrão do sistema (mesma prioridade do modal de orçamento):
 * localStorage → template do usuário → folha mais recente no servidor.
 */
export async function resolveSystemPdfLetterhead(
  customizationOverride?: PDFCustomization | null
): Promise<SystemPdfLetterhead> {
  const fromStorage = customizationOverride ?? loadPdfCustomizationFromStorage();
  let url = pickFolhaUrlFromCustomization(fromStorage);
  let opacidade = pickOpacidadeFromCustomization(fromStorage);

  if (!url) {
    const fromTpl = await folhaFromUserTemplate();
    url = fromTpl.url;
    if (!pickFolhaUrlFromCustomization(fromStorage)) {
      opacidade = fromTpl.opacidade;
    }
  }

  if (!url) {
    url = await folhaFromServerList();
  }

  const folhaTimbradaDataUrl = url ? await tryResolveImageToDataUrl(url) : undefined;
  return { folhaTimbradaDataUrl, opacidade };
}
