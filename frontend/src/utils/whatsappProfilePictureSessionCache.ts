import { canonicalWhatsappChatId } from './whatsappChat';

/** ChatIds que retornaram 404 no proxy de foto nesta sessão do browser. */
const missingProfilePictureChatIds = new Set<string>();

function cacheKey(chatId: string): string {
  return canonicalWhatsappChatId(chatId).trim().toLowerCase();
}

export function isWhatsappProfilePictureMissing(chatId: string): boolean {
  const k = cacheKey(chatId);
  return k ? missingProfilePictureChatIds.has(k) : false;
}

export function markWhatsappProfilePictureMissing(chatId: string): void {
  const k = cacheKey(chatId);
  if (k) missingProfilePictureChatIds.add(k);
}

export function clearWhatsappProfilePictureMissing(chatId: string): void {
  const k = cacheKey(chatId);
  if (k) missingProfilePictureChatIds.delete(k);
}
