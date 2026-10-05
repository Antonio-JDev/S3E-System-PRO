import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { apropriacaoOsService } from '../../services/apropriacaoOsService';
import { eventosCalendarioService } from '../../services/eventosCalendarioService';
import { ordemServicosService } from '../../services/ordemServicosService';
import {
  montarResumoFatiasOs,
  seriesComparativoTempo,
  type ChaveSerieComparativo,
  type FatiasHoras,
  type ResumoFatiasOs,
  type SerieComparativoTempo,
} from '../../utils/fatiasTempoOs';

export interface OsFatiasTempoBarrasProps {
  projetoId: string;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  compacto?: boolean;
  /** Incrementar para buscar de novo as horas depois de um apontamento. */
  atualizacao?: number;
}

const CORES: Record<ChaveSerieComparativo, string> = {
  orcadas: '#818cf8',
  previstas: '#38bdf8',
  executadas: '#34d399',
  faltantes: '#94a3b8',
  excedente: '#fb7185',
};

const LEGENDA: Array<{ chave: ChaveSerieComparativo; nome: string }> = [
  { chave: 'orcadas', nome: 'Orçadas' },
  { chave: 'previstas', nome: 'Previstas (agenda)' },
  { chave: 'executadas', nome: 'Executadas (apontadas)' },
  { chave: 'faltantes', nome: 'Faltantes' },
  { chave: 'excedente', nome: 'Excedente' },
];

function fmtHoras(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function TooltipHoras({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SerieComparativoTempo }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-100 shadow-lg">
      <p className="font-medium">{row.nome}</p>
      <p className="tabular-nums">{fmtHoras(row.horas)} h</p>
    </div>
  );
}

function TickCategoria({
  x = 0,
  y = 0,
  payload,
  fill,
  fundo,
  fontSize,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill: string;
  fundo: string;
  fontSize: number;
}) {
  const texto = String(payload?.value ?? '');
  const largura = Math.ceil(texto.length * fontSize * 0.62) + 14;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-largura} y={-12} width={largura} height={24} rx={6} fill={fundo} />
      <text
        x={-7}
        y={0}
        dy={4}
        textAnchor="end"
        fill={fill}
        fontSize={fontSize}
        fontWeight={600}
      >
        {texto}
      </text>
    </g>
  );
}

function RotuloHoras({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  value,
  fill,
  fundo,
  fontSize,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
  fill: string;
  fundo: string;
  fontSize: number;
}) {
  const texto = `${fmtHoras(Number(value))} h`;
  const px = Number(x) + Number(width) + 8;
  const py = Number(y) + Number(height) / 2;
  const largura = Math.ceil(texto.length * fontSize * 0.62) + 12;
  return (
    <g>
      <rect x={px - 4} y={py - 11} width={largura} height={22} rx={6} fill={fundo} />
      <text x={px + 2} y={py} dy={4} fill={fill} fontSize={fontSize} fontWeight={600}>
        {texto}
      </text>
    </g>
  );
}

function GraficoFatias({
  titulo,
  corTitulo,
  fatias,
  compacto,
}: {
  titulo: string;
  corTitulo: string;
  fatias: FatiasHoras;
  compacto: boolean;
}) {
  const { theme } = useTheme();
  const escuro = theme === 'dark';
  const corTexto = escuro ? '#f8fafc' : '#0f172a';
  const fundoRotulo = escuro ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';
  const series = seriesComparativoTempo(fatias);
  const vazia = fatias.semOrcamento && fatias.efetivadas <= 0 && fatias.previstas <= 0;
  const max = Math.max(...series.map((s) => s.horas), 0);
  const altura = series.length * (compacto ? 38 : 44) + 8;

  return (
    <div className="space-y-2 min-w-0">
      <p className={`text-sm font-semibold ${corTitulo}`}>{titulo}</p>
      {vazia ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 rounded-lg bg-gray-100 dark:bg-dark-bg px-3 py-2">
          Nada orçado, executado ou agendado nesta faixa.
        </p>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/30 px-2 py-2">
          <div style={{ height: altura }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                layout="vertical"
                margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
                barCategoryGap={6}
              >
                <XAxis
                  type="number"
                  domain={max > 0 ? [0, max * 1.05] : [0, 1]}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={compacto ? 92 : 100}
                  tick={(props) => (
                    <TickCategoria
                      {...props}
                      fill={corTexto}
                      fundo={fundoRotulo}
                      fontSize={compacto ? 11 : 12}
                    />
                  )}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={false} content={<TooltipHoras />} />
                <Bar
                  dataKey="horas"
                  radius={[0, 6, 6, 0]}
                  barSize={compacto ? 22 : 24}
                  isAnimationActive={false}
                  background={{ fill: escuro ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}
                >
                  {series.map((item) => (
                    <Cell key={item.chave} fill={CORES[item.chave]} />
                  ))}
                  <LabelList
                    dataKey="horas"
                    content={(props) => (
                      <RotuloHoras
                        x={Number(props.x)}
                        y={Number(props.y)}
                        width={Number(props.width)}
                        height={Number(props.height)}
                        value={props.value as number | string | undefined}
                        fill={corTexto}
                        fundo={fundoRotulo}
                        fontSize={compacto ? 11 : 12}
                      />
                    )}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {fatias.excedente > 0 && (
        <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {fmtHoras(fatias.excedente)} h acima do orçado.
        </p>
      )}
    </div>
  );
}

const OsFatiasTempoBarras: React.FC<OsFatiasTempoBarrasProps> = ({
  projetoId,
  horasEngenhariaOrcadas,
  diariasEquipeOrcadas,
  compacto = false,
  atualizacao = 0,
}) => {
  const [resumo, setResumo] = useState<ResumoFatiasOs | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setResumo(null);
    setErro(null);

    void (async () => {
      let horasEng = horasEngenhariaOrcadas;
      let diarias = diariasEquipeOrcadas;
      if (horasEng == null || diarias == null) {
        const os = await ordemServicosService.buscar(projetoId);
        if (!os.success || !os.data) {
          if (!cancel) setErro('Não foi possível carregar o orçado da OS');
          return;
        }
        horasEng = Number(os.data.horasEngenhariaOrcadas) || 0;
        diarias = Number(os.data.diariasEquipeOrcadas) || 0;
      }

      const [eventosRes, apontamentosRes] = await Promise.all([
        eventosCalendarioService.listarPorProjeto(projetoId),
        apropriacaoOsService.listar(projetoId, 200),
      ]);
      if (cancel) return;
      if (!eventosRes.success || !apontamentosRes.success) {
        setErro('Não foi possível montar as horas da OS');
        return;
      }

      setResumo(
        montarResumoFatiasOs({
          horasEngenhariaOrcadas: horasEng ?? 0,
          diariasEquipeOrcadas: diarias ?? 0,
          eventos: eventosRes.data || [],
          apontamentos: apontamentosRes.data || [],
        }),
      );
    })();

    return () => {
      cancel = true;
    };
  }, [projetoId, horasEngenhariaOrcadas, diariasEquipeOrcadas, atualizacao]);

  const temExcedente = Boolean(
    resumo && (resumo.engenharia.excedente > 0 || resumo.execucao.excedente > 0),
  );

  return (
    <section className={compacto ? 'space-y-3' : 'rounded-xl bg-gray-50 dark:bg-dark-bg/60 px-5 py-4 shadow-sm space-y-4'}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tempo da OS</h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          Comparativo em horas. A previsão da agenda permanece gravada depois de executada.
        </p>
      </div>
      {erro && <p className="text-xs text-rose-600">{erro}</p>}
      {!resumo && !erro && <p className="text-xs text-gray-500">Carregando horas...</p>}
      {resumo && (
        <>
          <div className={compacto ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-5'}>
            <GraficoFatias
              titulo="Engenharia"
              corTitulo="text-indigo-700 dark:text-indigo-300"
              fatias={resumo.engenharia}
              compacto={compacto}
            />
            <GraficoFatias
              titulo="Execução"
              corTitulo="text-amber-700 dark:text-amber-300"
              fatias={resumo.execucao}
              compacto={compacto}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 dark:text-gray-300">
            {LEGENDA.filter((item) => item.chave !== 'excedente' || temExcedente).map((item) => (
              <span key={item.chave}>
                <span
                  className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                  style={{ backgroundColor: CORES[item.chave] }}
                />
                {item.nome}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Faltante = orçado − executado − previsto que ainda não foi executado.
            {' · '}
            <strong>{resumo.diasPrevistos}</strong> dia{resumo.diasPrevistos === 1 ? '' : 's'} previsto{resumo.diasPrevistos === 1 ? '' : 's'} na agenda
            {' · '}
            <strong>{resumo.diasEfetivados}</strong> dia{resumo.diasEfetivados === 1 ? '' : 's'} efetivado{resumo.diasEfetivados === 1 ? '' : 's'} (apontamento ou evento confirmado).
          </p>
        </>
      )}
    </section>
  );
};

export default OsFatiasTempoBarras;
