import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

export type OrcamentoPdfMarcaDaguaConfig = {
  tipo: 'template';
  opacidade: number;
  logoUrl?: string;
  folhaTimbradaUrl?: string;
};

export function resolveUploadPathToDataUrl(raw: string | null | undefined): string | null {
  let value = (raw || '').trim();
  if (!value) return null;
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      value = parsed.pathname;
    } catch {
      return null;
    }
  }
  if (!value.startsWith('/uploads/')) return null;

  const cwd = process.cwd();
  const rel = value.replace(/^\/+/, '');
  const abs = path.join(cwd, rel);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.svg'
            ? 'image/svg+xml'
            : 'application/octet-stream';
  const b64 = fs.readFileSync(abs).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/**
 * Converte o JSON de personalização (mesmo formato salvo em `PDFTemplate.customization`
 * e no `localStorage` do modal) para o objeto consumido por `PDFOrcamentoService`.
 */
export function buildMarcaDaguaFromPdfCustomization(customization: unknown): OrcamentoPdfMarcaDaguaConfig {
  const opacidadeDefault = 0.05;
  if (!customization || typeof customization !== 'object') {
    return { tipo: 'template', opacidade: opacidadeDefault };
  }

  const c = customization as Record<string, unknown>;
  const watermark = (c.watermark as Record<string, unknown>) || {};
  const design = (c.design as Record<string, unknown>) || {};
  const corners = (design.corners as Record<string, unknown>) || {};

  const opacityRaw = typeof watermark.opacity === 'number' ? watermark.opacity : Number.NaN;
  const opacidade = Number.isFinite(opacityRaw) ? Math.min(1, Math.max(0, opacityRaw)) : opacidadeDefault;

  const logoCandidate = typeof watermark.content === 'string' ? watermark.content : null;
  const cornerEnabled = corners.enabled !== false;
  const folhaCandidate =
    cornerEnabled && typeof corners.image === 'string' ? corners.image : null;

  const logoUrl = resolveUploadPathToDataUrl(logoCandidate) ?? undefined;
  const folhaTimbradaUrl = resolveUploadPathToDataUrl(folhaCandidate) ?? undefined;

  return {
    tipo: 'template',
    opacidade,
    ...(logoUrl ? { logoUrl } : {}),
    ...(folhaTimbradaUrl ? { folhaTimbradaUrl } : {})
  };
}

/** Personalização padrão do usuário (template mais recente / marcado como default). */
export async function resolveMarcaDaguaFromUserTemplate(userId: string): Promise<OrcamentoPdfMarcaDaguaConfig> {
  const tpl = await prisma.pDFTemplate.findFirst({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    select: { customization: true }
  });
  if (!tpl?.customization || typeof tpl.customization !== 'object') {
    return { tipo: 'template', opacidade: 0.05 };
  }
  return buildMarcaDaguaFromPdfCustomization(tpl.customization);
}
