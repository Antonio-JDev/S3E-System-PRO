import sharp from 'sharp';
import {
  isStickerMediaType,
  toStickerWebpFromBuffer,
  WHATSAPP_STICKER_PX
} from './whatsappSticker.util';

describe('whatsappSticker.util', () => {
  it('isStickerMediaType reconhece sticker', () => {
    expect(isStickerMediaType('sticker')).toBe(true);
    expect(isStickerMediaType('IMAGE')).toBe(false);
  });

  it('toStickerWebpFromBuffer gera WebP 512×512', async () => {
    const png = await sharp({
      create: { width: 800, height: 400, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.5 } }
    })
      .png()
      .toBuffer();
    const webp = await toStickerWebpFromBuffer(png);
    const meta = await sharp(webp).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(WHATSAPP_STICKER_PX);
    expect(meta.height).toBe(WHATSAPP_STICKER_PX);
  });
});
