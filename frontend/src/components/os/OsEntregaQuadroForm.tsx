import React, { useEffect, useRef } from 'react';
import type { EntregaQuadroMetadados } from '../../utils/osWorkflow.util';
import {
  avaliarChecklistEntregaQuadro,
  marcarRomaneioGerado,
} from '../../utils/osWorkflow.util';
import { imprimirRomaneio, type RomaneioPrintContext } from '../../utils/romaneioQuadroPrint.util';
import { toast } from 'sonner';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function CampoFoto({
  label,
  value,
  onChange,
  disabled,
  compact,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 4 * 1024 * 1024) {
            toast.error('Imagem muito grande (máx. 4 MB)');
            return;
          }
          try {
            onChange(await fileToDataUrl(f));
          } catch {
            toast.error('Não foi possível carregar a imagem');
          }
        }}
        className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-900 dark:file:bg-amber-900/40 dark:file:text-amber-100"
      />
      {value ? (
        <img
          src={value}
          alt={label}
          className={`mt-2 rounded-lg border border-gray-200 dark:border-dark-border object-contain bg-white ${
            compact ? 'max-h-28' : 'max-h-36'
          }`}
        />
      ) : null}
    </div>
  );
}

function AssinaturaCanvas({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value?.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function commit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }

  return (
    <div>
      <label className={labelCls}>Assinatura do cliente *</label>
      <canvas
        ref={canvasRef}
        width={560}
        height={140}
        className="w-full h-28 sm:h-32 border border-dashed border-gray-300 dark:border-dark-border rounded-lg bg-white touch-none cursor-crosshair"
        onPointerDown={(e) => {
          if (disabled) return;
          drawing.current = true;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || disabled) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = pos(e);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          commit();
        }}
      />
      <div className="flex flex-wrap items-center gap-3 mt-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            onChange('');
          }}
          className="text-xs text-gray-600 dark:text-gray-400 underline hover:text-gray-900 dark:hover:text-white"
        >
          Limpar assinatura
        </button>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">ou digite o nome:</span>
        <input
          type="text"
          disabled={disabled}
          value={value && !value.startsWith('data:image') ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome por extenso"
          className={`${inputCls} flex-1 min-w-[10rem] max-w-sm`}
        />
      </div>
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/70 dark:bg-dark-bg/50 p-3 sm:p-4 space-y-3">
      <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-dark-border pb-2">
        {titulo}
      </h4>
      {children}
    </section>
  );
}

export interface OsEntregaQuadroFormProps {
  value: EntregaQuadroMetadados;
  onChange: (next: EntregaQuadroMetadados) => void;
  printContext: RomaneioPrintContext;
  disabled?: boolean;
  produtosSugestao?: Array<{ nome: string; codigo?: string; quantidade?: number }>;
}

export default function OsEntregaQuadroForm({
  value,
  onChange,
  printContext,
  disabled,
  produtosSugestao,
}: OsEntregaQuadroFormProps) {
  const checklist = avaliarChecklistEntregaQuadro(value);
  const rom = value.romaneio || {};

  function patch(partial: Partial<EntregaQuadroMetadados>) {
    onChange({ ...value, ...partial });
  }

  function patchRomaneio(partial: Partial<NonNullable<EntregaQuadroMetadados['romaneio']>>) {
    patch({ romaneio: { ...rom, ...partial } });
  }

  async function handleImprimirRomaneio() {
    try {
      const comProdutos: EntregaQuadroMetadados = {
        ...value,
        romaneio: {
          ...rom,
          produtos:
            rom.produtos && rom.produtos.length
              ? rom.produtos
              : produtosSugestao || [{ nome: printContext.tituloOs }],
        },
      };
      toast.loading('Gerando romaneio PDF…', { id: 'romaneio-pdf' });
      const marcado = marcarRomaneioGerado(comProdutos);
      onChange(marcado);
      await imprimirRomaneio(marcado, printContext);
      toast.success('Use a janela de impressão para imprimir ou salvar o PDF', {
        id: 'romaneio-pdf',
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar romaneio PDF', {
        id: 'romaneio-pdf',
      });
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/20 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4 py-3 border-b border-amber-200/70 dark:border-amber-800/40 bg-amber-100/60 dark:bg-amber-900/20">
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100">
            Entrega do quadro / painel
          </p>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/70 mt-0.5">
            Obrigatório para concluir a OS · frota própria — gere o romaneio antes da saída
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {checklist.ok ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              Checklist completo
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-200/80 text-amber-950 dark:bg-amber-800/50 dark:text-amber-100">
              {checklist.pendencias.length} pendência
              {checklist.pendencias.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={handleImprimirRomaneio}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 whitespace-nowrap"
          >
            Imprimir romaneio
          </button>
        </div>
      </div>

      {/* Pendências em chips (compacto) */}
      {!checklist.ok && checklist.pendencias.length > 0 && (
        <div className="px-3 sm:px-4 py-2.5 flex flex-wrap gap-1.5 border-b border-amber-200/50 dark:border-amber-800/30">
          {checklist.pendencias.map((p) => (
            <span
              key={p}
              className="inline-flex max-w-full items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/80 dark:bg-dark-bg text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 truncate"
              title={p}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Corpo: 1 col mobile · 2 cols tablet+ */}
      <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Coluna esquerda — preparação / romaneio */}
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <Secao titulo="1. Preparação e romaneio">
            <CampoFoto
              label="Foto do produto (montado / a entregar) *"
              value={value.fotoProduto}
              disabled={disabled}
              compact
              onChange={(fotoProduto) => patch({ fotoProduto })}
            />

            <label className="flex items-start gap-2.5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean(value.materiaisConferidos)}
                onChange={(e) => patch({ materiaisConferidos: e.target.checked })}
                className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                <strong>Materiais conferidos</strong> com a aba Materiais da OS (BOM / alocados).
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className={labelCls}>Qtd. volumes</label>
                <input
                  type="number"
                  min={0}
                  disabled={disabled}
                  value={rom.qtdVolumes ?? ''}
                  onChange={(e) =>
                    patchRomaneio({
                      qtdVolumes: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Peso líq. (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={disabled}
                  value={rom.pesoLiquidoKg ?? ''}
                  onChange={(e) =>
                    patchRomaneio({
                      pesoLiquidoKg: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls}>Peso bruto (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={disabled}
                  value={rom.pesoBrutoKg ?? ''}
                  onChange={(e) =>
                    patchRomaneio({
                      pesoBrutoKg: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>Dimensões</label>
                <input
                  type="text"
                  disabled={disabled}
                  value={rom.dimensoes || ''}
                  onChange={(e) => patchRomaneio({ dimensoes: e.target.value })}
                  placeholder="Ex.: 80 × 60 × 30 cm"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Identificação / marcação</label>
                <input
                  type="text"
                  disabled={disabled}
                  value={rom.volumes?.[0]?.identificacao || ''}
                  onChange={(e) =>
                    patchRomaneio({
                      volumes: [
                        {
                          identificacao: e.target.value,
                          marcacao: rom.volumes?.[0]?.marcacao || 'S3E',
                          tipo: rom.volumes?.[0]?.tipo || 'caixa',
                        },
                      ],
                    })
                  }
                  placeholder="Ex.: Caixa 01 / Pallet A"
                  className={inputCls}
                />
              </div>
            </div>
          </Secao>
        </div>

        {/* Coluna direita — recebimento cliente */}
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <Secao titulo="2. Entrega final ao cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nome do cliente / recebedor *</label>
                <input
                  type="text"
                  disabled={disabled}
                  value={value.clienteNome || value.recebedorNome || ''}
                  onChange={(e) =>
                    patch({ clienteNome: e.target.value, recebedorNome: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Telefone *</label>
                <input
                  type="tel"
                  disabled={disabled}
                  value={value.clienteTelefone || ''}
                  onChange={(e) => patch({ clienteTelefone: e.target.value })}
                  placeholder="(47) 99999-0000"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Data da entrega *</label>
                <input
                  type="date"
                  disabled={disabled}
                  value={value.dataEntrega || ''}
                  onChange={(e) => patch({ dataEntrega: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Entregue por</label>
                <input
                  type="text"
                  disabled={disabled}
                  value={value.entregadorNome || ''}
                  onChange={(e) => patch({ entregadorNome: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Local de entrega</label>
                <input
                  type="text"
                  disabled={disabled}
                  value={value.localRecebimento || ''}
                  onChange={(e) => patch({ localRecebimento: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <AssinaturaCanvas
              value={value.assinaturaCliente}
              disabled={disabled}
              onChange={(assinaturaCliente) => patch({ assinaturaCliente })}
            />

            <CampoFoto
              label="Foto do produto entregue *"
              value={value.fotoProdutoEntregue}
              disabled={disabled}
              compact
              onChange={(fotoProdutoEntregue) => patch({ fotoProdutoEntregue })}
            />
          </Secao>
        </div>
      </div>
    </div>
  );
}
