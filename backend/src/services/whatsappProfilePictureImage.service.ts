import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { prisma } from '../lib/prisma';
import { canonicalWhatsappChatId } from '../utils/whatsappChat.util';
import {
  profilePictureNegativeDiskAny,
  profilePictureNegativeDiskSetMany
} from '../utils/whatsappProfilePictureNegativeCache.util';
import { fetchWhatsappProviderProfilePictureUrlForChat } from './whatsappProvider.service';
import { persistWhatsappContactCache } from './whatsappChat.service';
import {
  expandedStorageChatIdVariants,
  loadWhatsappChatIdentities
} from './whatsappIdentity.service';

const PROFILE_PIC_DIR = path.join(process.cwd(), 'uploads', 'whatsapp-profile-pics');

/** Após este tempo, revalida URL na EvoGo mesmo com arquivo em disco. */
const PROFILE_PIC_DISK_TTL_MS = 2 * 60 * 60 * 1000;

type ProfilePicMeta = {
  sourceUrl: string;
  contentType: string;
  savedAt?: number;
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
  sourceUrl: string;
  ageMs: number;
} | null {
  if (!fs.existsSync(paths.img) || !fs.existsSync(paths.meta)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(paths.meta, 'utf8')) as ProfilePicMeta;
    const mtime = fs.statSync(paths.img).mtimeMs;
    const savedAt = typeof meta.savedAt === 'number' ? meta.savedAt : mtime;
    return {
      buffer: fs.readFileSync(paths.img),
      contentType: meta.contentType || 'image/jpeg',
      etag: meta.sourceUrl || 'cached',
      sourceUrl: meta.sourceUrl || '',
      ageMs: Date.now() - savedAt,
    };
  } catch {
    return null;
  }
}

function readCachedFileForVariants(chatIds: string[]): {
  buffer: Buffer;
  contentType: string;
  etag: string;
  sourceUrl: string;
  ageMs: number;
} | null {
  for (const id of chatIds) {
    const hit = readCachedFile(profilePicPaths(id));
    if (hit) return hit;
  }
  return null;
}

function writeCachedFileForVariants(
  chatIds: string[],
  buffer: Buffer,
  meta: ProfilePicMeta
): void {
  ensureProfilePicDir();
  const withTs: ProfilePicMeta = { ...meta, savedAt: Date.now() };
  for (const id of chatIds) {
    const paths = profilePicPaths(id);
    fs.writeFileSync(paths.img, buffer);
    fs.writeFileSync(paths.meta, JSON.stringify(withTs));
  }
}

/**
 * Foto de perfil servida pelo backend (sem hotlink no browser → sem 403).
 * Persiste em disco; revalida URL na EvoGo após TTL ou com `refresh`.
 * Replica cache entre variantes LID↔PN do mesmo contato.
 */
export async function getWhatsappProfilePictureImage(
  chatId: string,
  opts?: { refresh?: boolean }
): Promise<{ buffer: Buffer; contentType: string; etag: string } | null> {
  const canon = canonicalWhatsappChatId(chatId);
  if (!canon) return null;

  ensureProfilePicDir();
  const identities = await loadWhatsappChatIdentities();
  const variants = expandedStorageChatIdVariants(canon, identities);
  const variantKeys = variants.map((v) => canonicalWhatsappChatId(v)).filter(Boolean);
  const refresh = opts?.refresh === true;

  const diskHit = readCachedFileForVariants(variantKeys);
  const diskFresh = Boolean(diskHit && diskHit.ageMs < PROFILE_PIC_DISK_TTL_MS);

  let dbUrl: string | null = null;
  try {
    const row = await prisma.whatsappContactCache.findUnique({
      where: { chatId: canon },
      select: { profilePictureUrl: true },
    });
    dbUrl = row?.profilePictureUrl?.trim() || null;
  } catch {
    dbUrl = null;
  }

  // Disco fresco e URL ainda igual à do banco → serve sem bater na EvoGo.
  if (
    diskHit &&
    diskFresh &&
    !refresh &&
    (!dbUrl || !diskHit.sourceUrl || dbUrl === diskHit.sourceUrl)
  ) {
    return {
      buffer: diskHit.buffer,
      contentType: diskHit.contentType,
      etag: diskHit.etag,
    };
  }

  if (!refresh && profilePictureNegativeDiskAny(variantKeys) && !diskHit) {
    return null;
  }

  // Revalida URL no provedor quando o disco envelheceu ou o caller pediu refresh.
  // Se o contact-meta já gravou URL nova no banco, usa ela sem novo IQ na EvoGo.
  const urlChanged = Boolean(dbUrl && diskHit?.sourceUrl && dbUrl !== diskHit.sourceUrl);
  let sourceUrl: string | null = null;
  if (urlChanged && dbUrl && !refresh) {
    sourceUrl = dbUrl;
  } else {
    sourceUrl = await fetchWhatsappProviderProfilePictureUrlForChat(canon, {
      forceRefresh: refresh || !diskFresh,
    });
  }

  if (!sourceUrl) {
    for (const v of variantKeys) {
      if (v === canon) continue;
      const row = await prisma.whatsappContactCache.findUnique({
        where: { chatId: v },
        select: { profilePictureUrl: true },
      });
      const u = row?.profilePictureUrl?.trim();
      if (u) {
        sourceUrl = u;
        break;
      }
    }
  }
  if (!sourceUrl) {
    sourceUrl = dbUrl;
  }

  if (!sourceUrl) {
    if (diskHit) {
      // Mantém a última foto conhecida se o provedor falhou agora.
      return {
        buffer: diskHit.buffer,
        contentType: diskHit.contentType,
        etag: diskHit.etag,
      };
    }
    profilePictureNegativeDiskSetMany(variantKeys);
    return null;
  }

  // Mesma URL de origem e já temos bytes → só renova o savedAt no meta.
  if (diskHit && diskHit.sourceUrl === sourceUrl) {
    writeCachedFileForVariants(variantKeys, diskHit.buffer, {
      sourceUrl,
      contentType: diskHit.contentType,
    });
    return {
      buffer: diskHit.buffer,
      contentType: diskHit.contentType,
      etag: sourceUrl,
    };
  }

  const remote = await fetchRemoteImageBytes(sourceUrl);
  if (!remote) {
    if (!diskHit) {
      profilePictureNegativeDiskSetMany(variantKeys);
    }
    if (diskHit) {
      return {
        buffer: diskHit.buffer,
        contentType: diskHit.contentType,
        etag: diskHit.etag,
      };
    }
    return null;
  }

  const meta: ProfilePicMeta = { sourceUrl, contentType: remote.contentType };
  writeCachedFileForVariants(variantKeys, remote.buffer, meta);

  try {
    const row = await prisma.whatsappContactCache.findUnique({
      where: { chatId: canon },
      select: { displayName: true },
    });
    await persistWhatsappContactCache({
      chatId: canon,
      displayName: row?.displayName ?? null,
      profilePictureUrl: sourceUrl,
    });
  } catch {
    // best-effort
  }

  return { buffer: remote.buffer, contentType: remote.contentType, etag: sourceUrl };
}
