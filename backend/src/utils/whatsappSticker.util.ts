import sharp from 'sharp';

/** Tamanho canônico de figurinha WhatsApp (arquivo WebP). */
export const WHATSAPP_STICKER_PX = 512;

export function isStickerMediaType(mediaType: string | null | undefined): boolean {
  return (mediaType || '').toLowerCase().trim() === 'sticker';
}

/** Converte buffer de imagem para WebP 512×512 com transparência (envio e inbound). */
export async function toStickerWebpFromBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .resize(WHATSAPP_STICKER_PX, WHATSAPP_STICKER_PX, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 92 })
    .toBuffer();
}

export const WHATSAPP_STICKER_MIMETYPE = 'image/webp';
export const WHATSAPP_STICKER_FILENAME = 'sticker.webp';
