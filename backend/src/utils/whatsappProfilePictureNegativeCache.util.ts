import fs from 'fs';
import path from 'path';

const PROFILE_PIC_DIR = path.join(process.cwd(), 'uploads', 'whatsapp-profile-pics');
const NEGATIVE_CACHE_FILE = path.join(PROFILE_PIC_DIR, '.negative-cache.json');

/** TTL em disco — mais longo que o cache em memória (10 min). */
export const PROFILE_PICTURE_NEGATIVE_DISK_TTL_MS = 6 * 60 * 60 * 1000;

type NegativeEntry = Record<string, number>;

function ensureDir(): void {
  if (!fs.existsSync(PROFILE_PIC_DIR)) {
    fs.mkdirSync(PROFILE_PIC_DIR, { recursive: true });
  }
}

function readNegativeCache(): NegativeEntry {
  try {
    if (!fs.existsSync(NEGATIVE_CACHE_FILE)) return {};
    const raw = fs.readFileSync(NEGATIVE_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as NegativeEntry;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeNegativeCache(data: NegativeEntry): void {
  ensureDir();
  const now = Date.now();
  const pruned: NegativeEntry = {};
  for (const [k, exp] of Object.entries(data)) {
    if (typeof exp === 'number' && exp > now) pruned[k] = exp;
  }
  fs.writeFileSync(NEGATIVE_CACHE_FILE, JSON.stringify(pruned));
}

function normalizeKey(chatId: string): string {
  return chatId.trim().toLowerCase();
}

export function profilePictureNegativeDiskGet(chatId: string): boolean {
  const k = normalizeKey(chatId);
  if (!k) return false;
  const data = readNegativeCache();
  const exp = data[k];
  if (!exp) return false;
  if (Date.now() > exp) {
    delete data[k];
    writeNegativeCache(data);
    return false;
  }
  return true;
}

export function profilePictureNegativeDiskSet(
  chatId: string,
  ttlMs: number = PROFILE_PICTURE_NEGATIVE_DISK_TTL_MS
): void {
  const k = normalizeKey(chatId);
  if (!k) return;
  const data = readNegativeCache();
  data[k] = Date.now() + ttlMs;
  writeNegativeCache(data);
}

export function profilePictureNegativeDiskSetMany(
  chatIds: string[],
  ttlMs: number = PROFILE_PICTURE_NEGATIVE_DISK_TTL_MS
): void {
  const data = readNegativeCache();
  const exp = Date.now() + ttlMs;
  for (const id of chatIds) {
    const k = normalizeKey(id);
    if (k) data[k] = exp;
  }
  writeNegativeCache(data);
}

export function profilePictureNegativeDiskAny(chatIds: string[]): boolean {
  return chatIds.some((id) => profilePictureNegativeDiskGet(id));
}
