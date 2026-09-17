import { concatChunks } from 'opus-accumulator';

const OGG_MIME = 'audio/ogg; codecs=opus';

function looksLikeOgg(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53;
}

function looksLikeWebm(bytes: Uint8Array): boolean {
  // EBML header
  return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

/**
 * WhatsApp PTT exige Opus em container Ogg.
 * Chrome/Edge gravam Opus em WebM — remuxa sem re-encodar (opus-accumulator).
 */
export async function ensureOggOpusVoiceBlob(input: Blob): Promise<{ blob: Blob; mimeType: string }> {
  const buf = new Uint8Array(await input.arrayBuffer());
  if (!buf.byteLength) {
    throw new Error('Áudio vazio');
  }

  const inputType = (input.type || '').toLowerCase();
  if (looksLikeOgg(buf) || inputType.includes('ogg') || inputType.includes('opus')) {
    return { blob: new Blob([buf], { type: OGG_MIME }), mimeType: OGG_MIME };
  }

  if (looksLikeWebm(buf) || inputType.includes('webm')) {
    try {
      const oggBytes = concatChunks([buf]);
      if (!oggBytes?.byteLength || !looksLikeOgg(oggBytes)) {
        throw new Error('Remux WebM→Ogg falhou');
      }
      return { blob: new Blob([oggBytes], { type: OGG_MIME }), mimeType: OGG_MIME };
    } catch (e) {
      console.warn('[WA] remux webm→ogg falhou', e);
      throw new Error('Não foi possível converter o áudio para o formato do WhatsApp (ogg/opus).');
    }
  }

  // Já é algo tocável; tenta forçar label ogg se o backend exigir PTT
  return { blob: new Blob([buf], { type: input.type || OGG_MIME }), mimeType: input.type || OGG_MIME };
}

export function detectAudioContainerMime(bytes: Uint8Array, fallback = 'audio/ogg'): string {
  if (looksLikeOgg(bytes)) return OGG_MIME;
  if (looksLikeWebm(bytes)) return 'audio/webm;codecs=opus';
  return fallback;
}

/** Extrai picos reais do áudio para o waveform (0..1). */
export async function extractAudioWaveformPeaks(
  data: ArrayBuffer,
  targetBars = 40
): Promise<{ peaks: number[]; durationSec: number }> {
  const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    return { peaks: Array.from({ length: targetBars }, () => 0.25), durationSec: 0 };
  }
  const ctx = new AC();
  try {
    const decoded = await ctx.decodeAudioData(data.slice(0));
    const channel = decoded.getChannelData(0);
    const peaks: number[] = [];
    const block = Math.max(1, Math.floor(channel.length / targetBars));
    for (let i = 0; i < targetBars; i += 1) {
      const start = i * block;
      const end = Math.min(channel.length, start + block);
      let peak = 0;
      for (let j = start; j < end; j += 1) {
        const v = Math.abs(channel[j]);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
    }
    const max = peaks.reduce((a, b) => Math.max(a, b), 0) || 1;
    return {
      peaks: peaks.map((p) => Math.max(0.06, Math.min(1, p / max))),
      durationSec: decoded.duration || 0,
    };
  } catch {
    return { peaks: Array.from({ length: targetBars }, () => 0.2), durationSec: 0 };
  } finally {
    void ctx.close().catch(() => undefined);
  }
}
