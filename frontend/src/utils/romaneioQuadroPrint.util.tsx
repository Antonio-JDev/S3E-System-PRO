/**
 * Romaneio interno (frota própria) — OS Quadros/Painéis.
 * PDF A4 com folha timbrada do sistema (resolveSystemPdfLetterhead + SystemPdfPage).
 */
import React from 'react';
import type { EntregaQuadroMetadados } from './osWorkflow.util';
import {
  SystemPdfPage,
  renderSystemPdfDocument,
  resolveSystemPdfLetterhead,
} from '../pdf';
import { COMPANY_NAME } from '../config/constants';
import { configuracoesService } from '../services/configuracoesService';

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

const REMETENTE_FALLBACK = {
  nome: COMPANY_NAME,
  endereco: 'Frota própria (transporte interno)',
  cidadeEstado: '',
  telefone: '',
  cnpj: '',
};

export type RomaneioProdutoLinha = { nome: string; codigo?: string; quantidade?: number };
export type RomaneioVolumeLinha = { identificacao: string; tipo?: string; marcacao?: string };

/** Nome do arquivo PDF: Romaneio-OS-{numero}.pdf */
export function nomeArquivoRomaneioOs(numeroOs?: string | number | null): string {
  const n = String(numeroOs ?? '')
    .trim()
    .replace(/[^\w.-]+/g, '-');
  return n ? `Romaneio-OS-${n}.pdf` : 'Romaneio-OS.pdf';
}

/** Busca nome da empresa nas configurações do sistema (cadastro). */
export async function resolverRemetenteEmpresa(
  override?: RomaneioPrintContext['remetente'],
): Promise<NonNullable<RomaneioPrintContext['remetente']>> {
  if (override?.nome?.trim()) {
    return { ...REMETENTE_FALLBACK, ...override };
  }
  try {
    const res = await configuracoesService.getConfiguracoes();
    const data = res?.data;
    const nomeConfig = String(data?.nomeEmpresa || '').trim();
    // Preferir nome legal da empresa; ignora branding de produto (ex.: Eng System Pro).
    const nome =
      nomeConfig &&
      !/eng\s*system|system\s*pro/i.test(nomeConfig)
        ? nomeConfig
        : COMPANY_NAME;
    return {
      ...REMETENTE_FALLBACK,
      telefone: String(data?.telefoneContato || '').trim() || REMETENTE_FALLBACK.telefone,
      ...(override || {}),
      nome,
    };
  } catch {
    return { ...REMETENTE_FALLBACK, ...(override || {}) };
  }
}

/** Dados normalizados do romaneio (testável sem DOM/PDF). */
export function montarDadosRomaneio(
  entrega: EntregaQuadroMetadados,
  ctx: RomaneioPrintContext,
) {
  const rem = { ...REMETENTE_FALLBACK, ...(ctx.remetente || {}) };
  const rom = entrega.romaneio || {};
  const produtos: RomaneioProdutoLinha[] =
    rom.produtos && rom.produtos.length
      ? rom.produtos
      : [{ nome: ctx.tituloOs, codigo: ctx.numeroOs ? `OS-${ctx.numeroOs}` : '', quantidade: 1 }];
  const volumes: RomaneioVolumeLinha[] = rom.volumes || [];
  const qtdVolumes = rom.qtdVolumes ?? (volumes.length || 0);

  return {
    rem,
    produtos,
    volumes,
    qtdVolumes,
    pesoLiquidoKg: rom.pesoLiquidoKg,
    pesoBrutoKg: rom.pesoBrutoKg,
    dimensoes: rom.dimensoes || '',
    destinatarioNome:
      ctx.clienteNome || entrega.clienteNome || entrega.recebedorNome || '—',
    destinatarioEndereco: ctx.clienteEndereco || entrega.localRecebimento || '',
    destinatarioCidadeEstado: ctx.clienteCidadeEstado || '',
    destinatarioTelefone: ctx.clienteTelefone || entrega.clienteTelefone || '—',
    numeroOs: ctx.numeroOs,
    tituloOs: ctx.tituloOs,
  };
}

function cell(style?: React.CSSProperties): React.CSSProperties {
  return {
    border: '1px solid #e2e8f0',
    padding: '6px 8px',
    textAlign: 'left',
    fontSize: 10,
    ...style,
  };
}

function RomaneioPdfBody({
  entrega,
  ctx,
}: {
  entrega: EntregaQuadroMetadados;
  ctx: RomaneioPrintContext;
}) {
  const d = montarDadosRomaneio(entrega, ctx);

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", color: '#0f172a', fontSize: 11 }}>
      <h1 style={{ fontSize: 16, margin: '0 0 4px', fontWeight: 700 }}>Romaneio de transporte</h1>
      <p style={{ color: '#64748b', margin: '0 0 14px', fontSize: 10 }}>
        Documento interno — frota própria · OS {String(d.numeroOs ?? '—')} · {d.tituloOs}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px' }}>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#64748b',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Remetente (S3E)
          </div>
          <p style={{ margin: '2px 0', fontWeight: 700 }}>{d.rem.nome}</p>
          {d.rem.endereco ? <p style={{ margin: '2px 0' }}>{d.rem.endereco}</p> : null}
          {d.rem.cidadeEstado ? <p style={{ margin: '2px 0' }}>{d.rem.cidadeEstado}</p> : null}
          {d.rem.telefone ? <p style={{ margin: '2px 0' }}>Tel.: {d.rem.telefone}</p> : null}
          {d.rem.cnpj ? <p style={{ margin: '2px 0' }}>CNPJ: {d.rem.cnpj}</p> : null}
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px' }}>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#64748b',
              marginBottom: 4,
              fontWeight: 600,
            }}
          >
            Destinatário (cliente)
          </div>
          <p style={{ margin: '2px 0', fontWeight: 700 }}>{d.destinatarioNome}</p>
          {d.destinatarioEndereco ? (
            <p style={{ margin: '2px 0' }}>{d.destinatarioEndereco}</p>
          ) : null}
          {d.destinatarioCidadeEstado ? (
            <p style={{ margin: '2px 0' }}>{d.destinatarioCidadeEstado}</p>
          ) : null}
          <p style={{ margin: '2px 0' }}>Tel.: {d.destinatarioTelefone}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 12, margin: '0 0 6px', fontWeight: 700 }}>Descrição da carga</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={cell({ background: '#f1f5f9', fontSize: 9 })}>Produto</th>
            <th style={cell({ background: '#f1f5f9', fontSize: 9 })}>Código</th>
            <th style={cell({ background: '#f1f5f9', fontSize: 9, width: 48 })}>Qtd</th>
          </tr>
        </thead>
        <tbody>
          {d.produtos.map((p, i) => (
            <tr key={`${p.nome}-${i}`}>
              <td style={cell()}>{p.nome}</td>
              <td style={cell()}>{p.codigo || '—'}</td>
              <td style={cell()}>{String(p.quantidade ?? 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 12, margin: '0 0 6px', fontWeight: 700 }}>Volumes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr>
            <th style={cell({ background: '#f1f5f9', fontSize: 9 })}>Identificação</th>
            <th style={cell({ background: '#f1f5f9', fontSize: 9 })}>Tipo</th>
            <th style={cell({ background: '#f1f5f9', fontSize: 9 })}>Marcação</th>
          </tr>
        </thead>
        <tbody>
          {d.volumes.length > 0 ? (
            d.volumes.map((v, i) => (
              <tr key={`${v.identificacao}-${i}`}>
                <td style={cell()}>{v.identificacao}</td>
                <td style={cell()}>{v.tipo || '—'}</td>
                <td style={cell()}>{v.marcacao || '—'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={cell()} colSpan={3}>
                Total de volumes: {String(d.qtdVolumes)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 20, fontSize: 10 }}>
        <div>
          <strong>Peso líquido:</strong>{' '}
          {d.pesoLiquidoKg != null ? `${d.pesoLiquidoKg} kg` : '—'}
        </div>
        <div>
          <strong>Peso bruto:</strong>{' '}
          {d.pesoBrutoKg != null ? `${d.pesoBrutoKg} kg` : '—'}
        </div>
        <div>
          <strong>Dimensões:</strong> {d.dimensoes || '—'}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginTop: 28,
        }}
      >
        <div
          style={{
            borderTop: '1px solid #334155',
            marginTop: 36,
            paddingTop: 6,
            textAlign: 'center',
            color: '#64748b',
            fontSize: 10,
          }}
        >
          Conferência S3E
        </div>
        <div
          style={{
            borderTop: '1px solid #334155',
            marginTop: 36,
            paddingTop: 6,
            textAlign: 'center',
            color: '#64748b',
            fontSize: 10,
          }}
        >
          Recebimento / motorista
        </div>
      </div>
    </div>
  );
}

/**
 * Abre o diálogo nativo de impressão do navegador para o PDF.
 * O usuário escolhe Imprimir ou “Salvar como PDF” (sem aba intermediária).
 * Ajusta document.title temporariamente para o Chrome sugerir o nome do arquivo.
 */
export function printPdfBlob(blob: Blob, filename: string): void {
  const pdfBlob =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const titleBase = filename.replace(/\.pdf$/i, '') || 'Romaneio';

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', titleBase);
  iframe.setAttribute('name', filename);
  // 1px (não 0×0): alguns viewers de PDF não carregam iframe zerado.
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
  iframe.src = url;
  document.body.appendChild(iframe);

  const previousTitle = document.title;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.title = previousTitle;
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {
      // ignore
    }
    URL.revokeObjectURL(url);
  };

  const triggerPrint = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) throw new Error('Falha ao preparar impressão do PDF.');
      document.title = titleBase;
      win.focus();
      const onAfterPrint = () => {
        win.removeEventListener('afterprint', onAfterPrint);
        window.setTimeout(cleanup, 500);
      };
      win.addEventListener('afterprint', onAfterPrint);
      win.print();
    } catch (err) {
      cleanup();
      throw err instanceof Error ? err : new Error('Não foi possível abrir a impressão do PDF.');
    }
    // Fallback se afterprint não disparar (Chrome PDF viewer).
    window.setTimeout(cleanup, 180_000);
  };

  // Chrome às vezes não dispara onload em iframe de PDF — fallback por timer.
  let printed = false;
  const runOnce = () => {
    if (printed) return;
    printed = true;
    triggerPrint();
  };
  iframe.onload = () => window.setTimeout(runOnce, 500);
  window.setTimeout(runOnce, 1500);
}

/**
 * Gera PDF A4 com folha timbrada e abre o modal nativo de impressão.
 * Remetente = nomeEmpresa das configurações · arquivo sugerido = Romaneio-OS-{n}.pdf
 */
export async function imprimirRomaneio(
  entrega: EntregaQuadroMetadados,
  ctx: RomaneioPrintContext,
): Promise<{ blob: Blob; filename: string }> {
  const [letterhead, remetente] = await Promise.all([
    resolveSystemPdfLetterhead(),
    resolverRemetenteEmpresa(ctx.remetente),
  ]);

  const ctxComEmpresa: RomaneioPrintContext = { ...ctx, remetente };
  const filename = nomeArquivoRomaneioOs(ctx.numeroOs);

  const { blob } = await renderSystemPdfDocument({
    filename,
    letterhead,
    stabilizeMs: 4000,
    document: (
      <SystemPdfPage
        folhaTimbradaUrl={letterhead.folhaTimbradaDataUrl}
        opacidade={letterhead.opacidade}
        compact
      >
        <RomaneioPdfBody entrega={entrega} ctx={ctxComEmpresa} />
      </SystemPdfPage>
    ),
  });

  printPdfBlob(blob, filename);
  return { blob, filename };
}

/** @deprecated Preferir montarDadosRomaneio / imprimirRomaneio (PDF). Mantido para compat de testes legados. */
export function montarHtmlRomaneio(
  entrega: EntregaQuadroMetadados,
  ctx: RomaneioPrintContext,
): string {
  const d = montarDadosRomaneio(entrega, ctx);
  const produtos = d.produtos
    .map((p) => `${p.nome}|${p.codigo || '—'}|${p.quantidade ?? 1}`)
    .join(';');
  const volumes =
    d.volumes.length > 0
      ? d.volumes.map((v) => v.identificacao).join(';')
      : `volumes:${d.qtdVolumes}`;
  return [
    'Romaneio de transporte',
    `OS ${d.numeroOs}`,
    d.tituloOs,
    d.rem.nome,
    'S3E',
    d.destinatarioNome,
    produtos,
    volumes,
  ].join('\n');
}
