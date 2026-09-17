/**
 * Impressão do romaneio interno (frota própria) para OS Quadros/Painéis.
 */
import type { EntregaQuadroMetadados } from './osWorkflow.util';

export interface RomaneioPrintContext {
  numeroOs?: string | number | null;
  tituloOs: string;
  clienteNome: string;
  clienteEndereco?: string;
  clienteCidadeEstado?: string;
  clienteTelefone?: string;
  remetente?: {
    nome: string;
    endereco?: string;
    cidadeEstado?: string;
    telefone?: string;
    cnpj?: string;
  };
}

const REMETENTE_PADRAO = {
  nome: 'S3E — Sistemas Elétricos e Engenharia',
  endereco: 'Frota própria (transporte interno)',
  cidadeEstado: 'Santa Catarina',
  telefone: '',
  cnpj: '',
};

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function montarHtmlRomaneio(
  entrega: EntregaQuadroMetadados,
  ctx: RomaneioPrintContext,
): string {
  const rem = { ...REMETENTE_PADRAO, ...(ctx.remetente || {}) };
  const rom = entrega.romaneio || {};
  const produtos =
    rom.produtos && rom.produtos.length
      ? rom.produtos
      : [{ nome: ctx.tituloOs, codigo: ctx.numeroOs ? `OS-${ctx.numeroOs}` : '' }];
  const volumes = rom.volumes || [];
  const qtd = rom.qtdVolumes ?? volumes.length ?? 0;

  const produtosRows = produtos
    .map(
      (p) =>
        `<tr><td>${esc(p.nome)}</td><td>${esc(p.codigo || '—')}</td><td>${esc(String(p.quantidade ?? 1))}</td></tr>`,
    )
    .join('');

  const volumesRows = volumes.length
    ? volumes
        .map(
          (v) =>
            `<tr><td>${esc(v.identificacao)}</td><td>${esc(v.tipo || '—')}</td><td>${esc(v.marcacao || '—')}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="3">Total de volumes: ${esc(String(qtd))}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Romaneio — OS ${esc(String(ctx.numeroOs || ''))}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #64748b; margin-bottom: 18px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
    .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 0 0 6px; }
    .box p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-size: 11px; }
    .meta { display: flex; gap: 24px; margin-top: 8px; }
    .assin { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .linha { border-top: 1px solid #334155; margin-top: 40px; padding-top: 6px; text-align: center; color: #64748b; }
    @media print { .noprint { display: none !important; } }
  </style>
</head>
<body>
  <button class="noprint" onclick="window.print()" style="margin-bottom:12px;padding:8px 14px;cursor:pointer;">Imprimir</button>
  <h1>Romaneio de transporte</h1>
  <p class="sub">Documento interno — frota própria · OS ${esc(String(ctx.numeroOs || '—'))} · ${esc(ctx.tituloOs)}</p>

  <div class="grid">
    <div class="box">
      <h2>Remetente (S3E)</h2>
      <p><strong>${esc(rem.nome)}</strong></p>
      <p>${esc(rem.endereco || '')}</p>
      <p>${esc(rem.cidadeEstado || '')}</p>
      ${rem.telefone ? `<p>Tel.: ${esc(rem.telefone)}</p>` : ''}
      ${rem.cnpj ? `<p>CNPJ: ${esc(rem.cnpj)}</p>` : ''}
    </div>
    <div class="box">
      <h2>Destinatário (cliente)</h2>
      <p><strong>${esc(ctx.clienteNome || entrega.clienteNome || entrega.recebedorNome || '—')}</strong></p>
      <p>${esc(ctx.clienteEndereco || entrega.localRecebimento || '')}</p>
      <p>${esc(ctx.clienteCidadeEstado || '')}</p>
      <p>Tel.: ${esc(ctx.clienteTelefone || entrega.clienteTelefone || '—')}</p>
    </div>
  </div>

  <h2 style="font-size:13px;margin:0 0 6px;">Descrição da carga</h2>
  <table>
    <thead><tr><th>Produto</th><th>Código</th><th>Qtd</th></tr></thead>
    <tbody>${produtosRows}</tbody>
  </table>

  <h2 style="font-size:13px;margin:0 0 6px;">Volumes</h2>
  <table>
    <thead><tr><th>Identificação</th><th>Tipo</th><th>Marcação</th></tr></thead>
    <tbody>${volumesRows}</tbody>
  </table>

  <div class="meta">
    <div><strong>Peso líquido:</strong> ${esc(rom.pesoLiquidoKg != null ? `${rom.pesoLiquidoKg} kg` : '—')}</div>
    <div><strong>Peso bruto:</strong> ${esc(rom.pesoBrutoKg != null ? `${rom.pesoBrutoKg} kg` : '—')}</div>
    <div><strong>Dimensões:</strong> ${esc(rom.dimensoes || '—')}</div>
  </div>

  <div class="assin">
    <div class="linha">Conferência S3E</div>
    <div class="linha">Recebimento / motorista</div>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;
}

export function imprimirRomaneio(
  entrega: EntregaQuadroMetadados,
  ctx: RomaneioPrintContext,
): void {
  const html = montarHtmlRomaneio(entrega, ctx);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) {
    throw new Error('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
