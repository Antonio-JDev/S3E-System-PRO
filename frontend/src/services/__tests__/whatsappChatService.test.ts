import { describe, it, expect, beforeEach, vi } from 'vitest';
import { postWhatsappSendOrcamentoPdf, whatsappCdnImageProxyUrl } from '../whatsappChatService';

const mockPost = vi.fn();

vi.mock('../axiosApi', () => ({
  axiosApiService: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('postWhatsappSendOrcamentoPdf — PDF gerado no backend (Puppeteer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({
      success: true,
      data: { message: { id: 'm1' }, statusUpdated: false, mode: 'manual' },
    });
  });

  it('envia apenas metadados leves (sem pdfBase64 no body)', async () => {
    await postWhatsappSendOrcamentoPdf({
      chatId: '556399494139@c.us',
      orcamentoId: 'orc-uuid-1',
      mode: 'manual',
      pdfCustomization: { watermark: { opacity: 0.05 } },
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/whatsapp/actions/send-orcamento-pdf',
      {
        chatId: '556399494139@c.us',
        orcamentoId: 'orc-uuid-1',
        mode: 'manual',
        pdfCustomization: { watermark: { opacity: 0.05 } },
      },
      expect.objectContaining({ timeout: 120_000 })
    );
    const body = mockPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('pdfBase64');
    expect(body).not.toHaveProperty('pdfFilename');
  });
});

describe('whatsappCdnImageProxyUrl', () => {
  it('encaminha URLs do CDN do WhatsApp pelo media-proxy', () => {
    const url =
      'https://pps.whatsapp.net/v/t61.24694-24/185937948_3013130218956484_4619576195714539860_n.jpg';
    const proxied = whatsappCdnImageProxyUrl(url);
    expect(proxied).toContain('/api/whatsapp/media-proxy?');
    expect(proxied).toContain(encodeURIComponent(url));
  });

  it('mantém URLs locais ou data sem proxy', () => {
    expect(whatsappCdnImageProxyUrl('/uploads/foo.png')).toBe('/uploads/foo.png');
    expect(whatsappCdnImageProxyUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});
