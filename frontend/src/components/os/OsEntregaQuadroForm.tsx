import React, { useEffect, useRef } from 'react';
import type { EntregaQuadroMetadados } from '../../utils/osWorkflow.util';
import {
  avaliarChecklistEntregaQuadro,
  marcarRomaneioGerado,
} from '../../utils/osWorkflow.util';
import { imprimirRomaneio, type RomaneioPrintContext } from '../../utils/romaneioQuadroPrint.util';
import { toast } from 'sonner';

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
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
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
          className="mt-2 max-h-36 rounded-lg border border-gray-200 dark:border-dark-border object-contain bg-white"
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
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Assinatura do cliente *
      </label>
      <canvas
        ref={canvasRef}
        width={480}
        height={140}
        className="w-full max-w-md h-28 border border-dashed border-gray-300 dark:border-dark-border rounded-lg bg-white touch-none cursor-crosshair"
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
      <div className="flex gap-2 mt-1">
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
          className="text-xs text-gray-600 underline"
        >
          Limpar assinatura
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">Ou digite o nome como assinatura:</p>
      <input
        type="text"
        disabled={disabled}
        value={value && !value.startsWith('data:image') ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nome por extenso"
        className="mt-1 w-full max-w-md px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
      />
    </div>
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

  function handleImprimirRomaneio() {
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
      imprimirRomaneio(comProdutos, printContext);
      const marcado = marcarRomaneioGerado(comProdutos);
      onChange(marcado);
      toast.success('Romaneio aberto para impressão');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao imprimir romaneio');
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Entrega do quadro / painel
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">
            Obrigatório para concluir a OS. Frota própria — gere o romaneio interno antes da saída.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleImprimirRomaneio}
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
        >
          Imprimir romaneio
        </button>
      </div>

      {!checklist.ok && (
        <ul className="text-xs text-amber-900 dark:text-amber-100 list-disc pl-4 space-y-0.5">
          {checklist.pendencias.map((p) => (
            <li key={p}>Pendente: {p}</li>
          ))}
        </ul>
      )}
      {checklist.ok && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Checklist de entrega completo — OS pode ser concluída (demais regras à parte).
        </p>
      )}

      <CampoFoto
        label="Foto do produto (montado / a entregar) *"
        value={value.fotoProduto}
        disabled={disabled}
        onChange={(fotoProduto) => patch({ fotoProduto })}
      />

      <label className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
        <input
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value.materiaisConferidos)}
          onChange={(e) => patch({ materiaisConferidos: e.target.checked })}
          className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
        <span>
          <strong>Materiais conferidos</strong> com a aba Materiais da OS (BOM / alocados).
          Marque apenas após revisar divergências.
        </span>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Qtd. volumes
          </label>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Peso líquido (kg)
          </label>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Peso bruto (kg)
          </label>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Dimensões (unitárias ou totais)
        </label>
        <input
          type="text"
          disabled={disabled}
          value={rom.dimensoes || ''}
          onChange={(e) => patchRomaneio({ dimensoes: e.target.value })}
          placeholder="Ex.: 80 × 60 × 30 cm"
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Identificação / marcação do volume
        </label>
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
          className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
        />
      </div>

      <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
        Entrega final ao cliente
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Nome do cliente / recebedor *
          </label>
          <input
            type="text"
            disabled={disabled}
            value={value.clienteNome || value.recebedorNome || ''}
            onChange={(e) =>
              patch({ clienteNome: e.target.value, recebedorNome: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Telefone *
          </label>
          <input
            type="tel"
            disabled={disabled}
            value={value.clienteTelefone || ''}
            onChange={(e) => patch({ clienteTelefone: e.target.value })}
            placeholder="(47) 99999-0000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Data da entrega *
          </label>
          <input
            type="date"
            disabled={disabled}
            value={value.dataEntrega || ''}
            onChange={(e) => patch({ dataEntrega: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Entregue por
          </label>
          <input
            type="text"
            disabled={disabled}
            value={value.entregadorNome || ''}
            onChange={(e) => patch({ entregadorNome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Local de entrega
          </label>
          <input
            type="text"
            disabled={disabled}
            value={value.localRecebimento || ''}
            onChange={(e) => patch({ localRecebimento: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
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
        onChange={(fotoProdutoEntregue) => patch({ fotoProdutoEntregue })}
      />
    </div>
  );
}
