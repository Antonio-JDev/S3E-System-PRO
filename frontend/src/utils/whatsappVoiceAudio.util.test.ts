import { describe, expect, it } from 'vitest';
import { detectAudioContainerMime } from './whatsappVoiceAudio.util';

describe('whatsappVoiceAudio.util', () => {
  it('detecta Ogg pelo magic OggS', () => {
    const bytes = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0]);
    expect(detectAudioContainerMime(bytes)).toContain('ogg');
  });

  it('detecta WebM pelo magic EBML', () => {
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
    expect(detectAudioContainerMime(bytes)).toContain('webm');
  });
});
