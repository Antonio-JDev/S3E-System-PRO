import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../../services/axiosApi';
import { localYmdFromDate } from '../../utils/date';
import { printPdfBlob } from '../../utils/romaneioQuadroPrint.util';
import type { EntregaQuadroMetadados } from '../../utils/osWorkflow.util';

type UsuarioOpcao = { id: string; nome: string };

type EntregaQuadroResponse = {
  entrega?: EntregaQuadroMetadados | null;
  empresaFiscalInformada?: boolean;
};

function isoParaDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function datetimeLocalParaIso(valor: string): string {
  if (!valor.trim()) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString();
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-white text-sm';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1';

export interface OsRomaneioEntregaCardProps {
  projetoId: string;
  tituloOs: string;
  numeroOs?: string | number | null;
  usuarios: UsuarioOpcao[];
  entregaInicial?: EntregaQuadroMetadados | null;
  onEntregaChange?: (entrega: EntregaQuadroMetadados) => void;
}

export default function OsRomaneioEntregaCard({
  projetoId,
  tituloOs,
  numeroOs,
  usuarios,
  entregaInicial,
  onEntregaChange,
}: OsRomaneioEntregaCardProps) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [empresaFiscalInformada, setEmpresaFiscalInformada] = useState(true);
  const [base, setBase] = useState<EntregaQuadroMetadados>(entregaInicial || {});
  const [produto, setProduto] = useState(entregaInicial?.produto || tituloOs);
  const [volume, setVolume] = useState(entregaInicial?.volume || '1');
  const [dataRomaneio, setDataRomaneio] = useState(
    entregaInicial?.dataRomaneio || localYmdFromDate(new Date()),
  );
  const [responsavelId, setResponsavelId] = useState(entregaInicial?.responsavelEntregaId || '');
  const [responsavelNome, setResponsavelNome] = useState(entregaInicial?.responsavelEntregaNome || '');
  const [recebedorNome, setRecebedorNome] = useState(entregaInicial?.recebedorNome || '');
  const [recebidoEm, setRecebidoEm] = useState(isoParaDatetimeLocal(entregaInicial?.recebidoEm));

  const opcoesResponsavel = useMemo(() => {
    if (!responsavelId || usuarios.some((u) => u.id === responsavelId)) return usuarios;
    return [{ id: responsavelId, nome: responsavelNome || 'Responsável salvo' }, ...usuarios];
  }, [usuarios, responsavelId, responsavelNome]);

  const entregue = Boolean(base.entregue);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      const res = await axiosApiService.get<EntregaQuadroResponse>(
        `/api/projetos/${projetoId}/entrega-quadro`,
      );
      if (!ativo) return;
      if (res.success && res.data) {
        const entrega = res.data.entrega || {};
        aplicarEntrega(entrega, res.data.empresaFiscalInformada !== false);
        onEntregaChange?.(entrega);
      }
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  function aplicarEntrega(entrega: EntregaQuadroMetadados, temEmpresa = empresaFiscalInformada) {
    setBase(entrega);
    setEmpresaFiscalInformada(temEmpresa);
    setProduto(entrega.produto?.trim() || tituloOs);
    setVolume(entrega.volume?.trim() || '1');
    setDataRomaneio(entrega.dataRomaneio || localYmdFromDate(new Date()));
    setResponsavelId(entrega.responsavelEntregaId || '');
    setResponsavelNome(entrega.responsavelEntregaNome || '');
    setRecebedorNome(entrega.recebedorNome || '');
    setRecebidoEm(isoParaDatetimeLocal(entrega.recebidoEm));
  }

  function montarPayload(opcoes?: { recebedor?: string; recebido?: string }): EntregaQuadroMetadados {
    const nomeResponsavel =
      opcoesResponsavel.find((u) => u.id === responsavelId)?.nome || responsavelNome;
    const nomeRecebedor = (opcoes?.recebedor ?? recebedorNome).trim();
    const isoRecebido = datetimeLocalParaIso(opcoes?.recebido ?? recebidoEm);
    return {
      ...base,
      produto: produto.trim() || tituloOs,
      volume: volume.trim() || '1',
      dataRomaneio,
      responsavelEntregaId: responsavelId || undefined,
      responsavelEntregaNome: nomeResponsavel || undefined,
      recebedorNome: nomeRecebedor,
      recebidoEm: isoRecebido,
    };
  }

  async function salvar(payload: EntregaQuadroMetadados): Promise<EntregaQuadroMetadados | null> {
    const res = await axiosApiService.put<EntregaQuadroResponse>(
      `/api/projetos/${projetoId}/entrega-quadro`,
      { entrega: payload },
    );
    if (!res.success || !res.data?.entrega) {
      toast.error(res.error || 'Não foi possível salvar o romaneio');
      return null;
    }
    aplicarEntrega(res.data.entrega, res.data.empresaFiscalInformada !== false);
    onEntregaChange?.(res.data.entrega);
    return res.data.entrega;
  }

  async function handleImprimir() {
    if (!responsavelId) {
      toast.error('Selecione o responsável pela entrega antes de imprimir');
      return;
    }
    setImprimindo(true);
    try {
      const salvo = await salvar(montarPayload());
      if (!salvo) return;
      const blob = await axiosApiService.getBlob(`/api/projetos/${projetoId}/romaneio.pdf`);
      const nome = numeroOs != null && String(numeroOs).trim() ? `Romaneio-OS-${numeroOs}.pdf` : 'Romaneio-OS.pdf';
      printPdfBlob(blob, nome);
      toast.success('Use a janela de impressão para imprimir ou salvar o PDF');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar o romaneio');
    } finally {
      setImprimindo(false);
    }
  }

  async function handleRegistrarRetorno() {
    if (!recebedorNome.trim() || !recebidoEm.trim()) {
      toast.error('Informe o nome de quem recebeu e a data e hora da entrega');
      return;
    }
    setSalvando(true);
    try {
      const salvo = await salvar(montarPayload());
      if (salvo?.entregue) toast.success('Entrega registrada. A OS ficou marcada como Entregue.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/20 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
              Romaneio de entrega
            </h3>
            {entregue ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Entregue
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/80 text-amber-950 dark:bg-amber-800/50 dark:text-amber-100">
                Aguardando retorno
              </span>
            )}
          </div>
          <p className="text-xs text-amber-900/80 dark:text-amber-200/70 mt-1">
            Imprima antes da saída. O nome de quem recebeu é anotado no local e registrado aqui no retorno.
          </p>
        </div>
        <button
          type="button"
          disabled={carregando || imprimindo}
          onClick={() => void handleImprimir()}
          className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
        >
          {imprimindo ? 'Gerando PDF…' : 'Imprimir romaneio'}
        </button>
      </div>

      {!empresaFiscalInformada && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/30 rounded-lg px-3 py-2">
          O orçamento desta OS não tem empresa fiscal selecionada. O PDF sai com o remetente em branco.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Responsável pela entrega</label>
          <select
            value={responsavelId}
            disabled={carregando}
            onChange={(e) => {
              const id = e.target.value;
              setResponsavelId(id);
              setResponsavelNome(opcoesResponsavel.find((u) => u.id === id)?.nome || '');
            }}
            className={inputCls}
          >
            <option value="">Selecione quem vai entregar</option>
            {opcoesResponsavel.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 xl:col-span-2">
          <label className={labelCls}>Produto</label>
          <input
            type="text"
            value={produto}
            disabled={carregando}
            onChange={(e) => setProduto(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Volume</label>
          <input
            type="text"
            value={volume}
            disabled={carregando}
            onChange={(e) => setVolume(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Data</label>
          <input
            type="date"
            value={dataRomaneio}
            disabled={carregando}
            onChange={(e) => setDataRomaneio(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/40 bg-white/70 dark:bg-dark-bg/40 p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
          Registro de retorno
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Quem recebeu</label>
            <input
              type="text"
              value={recebedorNome}
              disabled={carregando}
              onChange={(e) => setRecebedorNome(e.target.value)}
              placeholder="Nome anotado no romaneio"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Data e hora da entrega</label>
            <input
              type="datetime-local"
              value={recebidoEm}
              disabled={carregando}
              onChange={(e) => setRecebidoEm(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={carregando || salvando || !recebedorNome.trim() || !recebidoEm.trim()}
            onClick={() => void handleRegistrarRetorno()}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Registrar recebimento'}
          </button>
        </div>
      </div>
    </section>
  );
}
