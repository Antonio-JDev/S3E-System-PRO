import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import {
  buildMarcaDaguaFromPdfCustomization,
  resolveMarcaDaguaFromUserTemplate,
  resolveUploadPathToDataUrl,
  type OrcamentoPdfMarcaDaguaConfig
} from '../utils/orcamentoPdfPersonalization.util';

export type FolhaTimbradaFile = {
  filename: string;
  url: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
};

export type ResolvedLetterhead = {
  opacidade: number;
  /** data URL para HTML inline */
  folhaTimbradaDataUrl?: string;
  /** Caminho absoluto no disco (PDFKit) */
  absolutePath?: string;
};

export function getPdfCustomizationUploadDir(): string {
  return path.join(process.cwd(), 'uploads', 'pdf-customization');
}

export function uploadsRelativeToAbsolute(relativeUrl: string): string | null {
  const raw = (relativeUrl || '').trim();
  if (!raw) return null;
  let rel = raw;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      rel = new URL(raw).pathname;
    } catch {
      return null;
    }
  }
  if (!rel.startsWith('/uploads/')) return null;
  const abs = path.join(process.cwd(), rel.replace(/^\/+/, ''));
  return fs.existsSync(abs) ? abs : null;
}

export function listFolhasTimbradasFiles(): FolhaTimbradaFile[] {
  const uploadDir = getPdfCustomizationUploadDir();
  if (!fs.existsSync(uploadDir)) return [];

  return fs
    .readdirSync(uploadDir)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext) && file.startsWith('cornerDesign-');
    })
    .map((file) => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        url: `/uploads/pdf-customization/${file}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function configFromCustomizationJson(customization: unknown): OrcamentoPdfMarcaDaguaConfig {
  if (!customization || typeof customization !== 'object') {
    return { tipo: 'template', opacidade: 0.05 };
  }
  return buildMarcaDaguaFromPdfCustomization(customization);
}

function enrichWithAbsolutePath(resolved: OrcamentoPdfMarcaDaguaConfig): ResolvedLetterhead {
  const folhaTimbradaDataUrl = resolved.folhaTimbradaUrl;
  let absolutePath: string | undefined;

  if (folhaTimbradaDataUrl?.startsWith('data:')) {
    const files = listFolhasTimbradasFiles();
    if (files[0]) {
      absolutePath = uploadsRelativeToAbsolute(files[0].url) ?? undefined;
    }
  } else {
    const rel =
      typeof resolved.folhaTimbradaUrl === 'string' && resolved.folhaTimbradaUrl.includes('/uploads/')
        ? resolved.folhaTimbradaUrl.replace(/^https?:\/\/[^/]+/, '')
        : null;
    if (rel) {
      absolutePath = uploadsRelativeToAbsolute(rel) ?? undefined;
    }
  }

  return {
    opacidade: resolved.opacidade,
    folhaTimbradaDataUrl,
    absolutePath
  };
}

/**
 * Mesma prioridade do frontend: customization explícita → template do usuário → folha mais recente.
 */
export async function resolveLetterheadForUser(
  userId: string | null | undefined,
  customizationJson?: unknown
): Promise<ResolvedLetterhead> {
  let config = customizationJson != null ? configFromCustomizationJson(customizationJson) : null;

  if (!config?.folhaTimbradaUrl && userId) {
    config = await resolveMarcaDaguaFromUserTemplate(userId);
  }

  if (!config?.folhaTimbradaUrl) {
    const files = listFolhasTimbradasFiles();
    if (files.length > 0) {
      const dataUrl = resolveUploadPathToDataUrl(files[0].url);
      config = {
        tipo: 'template',
        opacidade: config?.opacidade ?? 0.05,
        ...(dataUrl ? { folhaTimbradaUrl: dataUrl } : {})
      };
    }
  }

  if (!config) {
    return { opacidade: 0.05 };
  }

  const enriched = enrichWithAbsolutePath(config);
  if (!enriched.absolutePath && !enriched.folhaTimbradaDataUrl) {
    const files = listFolhasTimbradasFiles();
    if (files[0]) {
      enriched.absolutePath = uploadsRelativeToAbsolute(files[0].url) ?? undefined;
      if (!enriched.folhaTimbradaDataUrl) {
        enriched.folhaTimbradaDataUrl = resolveUploadPathToDataUrl(files[0].url) ?? undefined;
      }
    }
  }

  return enriched;
}

/** Buffer da imagem para PDFKit (a partir do caminho absoluto). */
export function readLetterheadImageBuffer(letterhead: ResolvedLetterhead): Buffer | null {
  if (letterhead.absolutePath && fs.existsSync(letterhead.absolutePath)) {
    return fs.readFileSync(letterhead.absolutePath);
  }
  const dataUrl = letterhead.folhaTimbradaDataUrl;
  if (dataUrl?.startsWith('data:')) {
    const m = /^data:image\/\w+;base64,(.+)$/i.exec(dataUrl);
    if (m?.[1]) {
      return Buffer.from(m[1], 'base64');
    }
  }
  return null;
}
