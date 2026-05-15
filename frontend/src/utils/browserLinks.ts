export function openInNewTab(url: string): void {
  const u = (url || '').trim();
  if (!u) return;
  window.open(u, '_blank', 'noopener,noreferrer');
}

export function downloadInNewTab(params: { url: string; filename?: string }): void {
  const u = (params.url || '').trim();
  if (!u) return;
  const a = document.createElement('a');
  a.href = u;
  if (params.filename) a.download = params.filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

