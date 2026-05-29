import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId } from '../utils/whatsappChat.util';
import { fetchWhatsappProviderProfilePictureUrlForChat } from './whatsappProvider.service';
import { persistWhatsappContactCache } from './whatsappChat.service';

const PROFILE_PIC_DIR = path.join(process.cwd(), 'uploads', 'whatsapp-profile-pics');

type ProfilePicMeta = {
  sourceUrl: string;
  contentType: string;
};

function ensureProfilePicDir(): void {
  if (!fs.existsSync(PROFILE_PIC_DIR)) {
    fs.mkdirSync(PROFILE_PIC_DIR, { recursive: true });
  }
}

function profilePicPaths(canonChatId: string): { img: string; meta: string } {
  const hash = createHash('sha256').update(canonChatId).digest('hex').slice(0, 40);
  const base = path.join(PROFILE_PIC_DIR, hash);
  return { img: `${base}.img`, meta: `${base}.meta.json` };
}

async function fetchRemoteImageBytes(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const raw = url.trim();
  if (!raw) return null;

  if (raw.startsWith('data:')) {
    const m = raw.match(/^data:([^;]+);base64,(.+)$/i);
    if (!m) return null;
    return { buffer: Buffer.from(m[2], 'base64'), contentType: m[1] || 'image/jpeg' };
  }

  if (raw.startsWith('/uploads/')) {
    const abs = path.join(process.cwd(), raw.replace(/^\/+/, ''));
    if (!fs.existsSync(abs)) return null;
    const ext = path.extname(abs).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer: fs.readFileSync(abs), contentType };
  }

  try {
    const res = await fetch(raw, { headers: { Accept: 'image/*,*/*' } });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return null;
    return { buffer, contentType: contentType || 'image/jpeg' };
  } catch {
    return null;
  }
}

function readCachedFile(paths: { img: string; meta: string }): {
  buffer: Buffer;
  contentType: string;
  etag: string;
} | null {
  if (!fs.existsSync(paths.img) || !fs.existsSync(paths.meta)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(paths.meta, 'utf8')) as ProfilePicMeta;
    return {
      buffer: fs.readFileSync(paths.img),
      contentType: meta.contentType || 'image/jpeg',
      etag: meta.sourceUrl || 'cached'
    };
  } catch {
    return null;
  }
}

/**
 * Foto de perfil servida pelo backend (sem hotlink no browser → sem 403).
 * Persiste em disco; só baixa de novo quando a URL de origem mudar.
 */
export async function getWhatsappProfilePictureImage(
  chatId: string
): Promise<{ buffer: Buffer; contentType: string; etag: string } | null> {
  const canon = canonicalWhatsappChatId(chatId);
  if (!canon) return null;

  ensureProfilePicDir();
  const paths = profilePicPaths(canon);

  let sourceUrl = await fetchWhatsappProviderProfilePictureUrlForChat(canon);
  if (!sourceUrl) {
    const row = await prisma.whatsappContactCache.findUnique({
      where: { chatId: canon },
      select: { profilePictureUrl: true }
    });
    sourceUrl = row?.profilePictureUrl?.trim() || null;
  }

  if (!sourceUrl) {
    return readCachedFile(paths);
  }

  if (fs.existsSync(paths.img) && fs.existsSync(paths.meta)) {
    try {
      const meta = JSON.parse(fs.readFileSync(paths.meta, 'utf8')) as ProfilePicMeta;
      if (meta.sourceUrl === sourceUrl) {
        return {
          buffer: fs.readFileSync(paths.img),
          contentType: meta.contentType || 'image/jpeg',
          etag: sourceUrl
        };
      }
    } catch {
      // rebaixa abaixo
    }
  }

  const remote = await fetchRemoteImageBytes(sourceUrl);
  if (!remote) {
    return readCachedFile(paths);
  }

  const meta: ProfilePicMeta = { sourceUrl, contentType: remote.contentType };
  fs.writeFileSync(paths.img, remote.buffer);
  fs.writeFileSync(paths.meta, JSON.stringify(meta));

  try {
    const row = await prisma.whatsappContactCache.findUnique({
      where: { chatId: canon },
      select: { displayName: true }
    });
    await persistWhatsappContactCache({
      chatId: canon,
      displayName: row?.displayName ?? null,
      profilePictureUrl: sourceUrl
    });
  } catch {
    // best-effort
  }

  return { buffer: remote.buffer, contentType: remote.contentType, etag: sourceUrl };
}
