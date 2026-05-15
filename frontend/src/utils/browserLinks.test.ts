import { describe, expect, it, vi } from 'vitest';
import { downloadInNewTab, openInNewTab } from './browserLinks';

describe('browserLinks', () => {
  it('openInNewTab chama window.open com noopener/noreferrer', () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null as any);
    openInNewTab('https://example.com/doc.pdf');
    expect(spy).toHaveBeenCalledWith('https://example.com/doc.pdf', '_blank', 'noopener,noreferrer');
    spy.mockRestore();
  });

  it('downloadInNewTab cria <a> com target _blank e (opcional) download', () => {
    const createSpy = vi.spyOn(document, 'createElement');
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    downloadInNewTab({ url: 'https://example.com/file.pdf', filename: 'file.pdf' });

    const a = createSpy.mock.results[0]?.value as HTMLAnchorElement;
    expect(a.tagName.toLowerCase()).toBe('a');
    expect(a.href).toContain('https://example.com/file.pdf');
    expect(a.download).toBe('file.pdf');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');

    expect(appendSpy).toHaveBeenCalled();
    createSpy.mockRestore();
    appendSpy.mockRestore();
  });
});

