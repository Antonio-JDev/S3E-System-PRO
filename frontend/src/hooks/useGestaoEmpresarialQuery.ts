import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  funcionariosService,
  rhService,
  beneficiosService,
  veiculosService,
  planosService,
  despesasFixasService,
} from '../services/gerenciamentoService';
import { axiosApiService } from '../services/axiosApi';
import { biService } from '../services/biService';

export const GESTAO_RH_HUB_QUERY_KEY = ['gestao-empresarial', 'rh', 'hub'] as const;
export const GESTAO_FROTA_HUB_QUERY_KEY = ['gestao-empresarial', 'frota', 'hub'] as const;
export const GESTAO_PLANOS_LISTA_QUERY_KEY = ['gestao-empresarial', 'planos', 'lista'] as const;
export const GESTAO_DESPESAS_HUB_QUERY_KEY = ['gestao-empresarial', 'despesas', 'hub'] as const;
export const GESTAO_ESTOQUE_RH_HUB_QUERY_KEY = ['gestao-empresarial', 'estoque-rh', 'hub'] as const;
export const GESTAO_BI_DASHBOARD_QUERY_KEY = ['gestao-empresarial', 'bi', 'dashboard'] as const;

function asArray(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: any[] }).data;
  }
  return [];
}

function extractData(resp: any): any {
  if (resp == null) return null;
  if (typeof resp === 'object' && 'data' in resp) return resp.data ?? null;
  return resp;
}

export async function fetchGestaoRhHub(mesRef: string) {
  const [funcResp, metricasResp, beneficiosResp, shiftsResp] = await Promise.all([
    funcionariosService.listar(mesRef),
    funcionariosService.obterMetricas(mesRef),
    beneficiosService.listar(),
    rhService.listarWorkShifts(),
  ]);
  return {
    funcionarios: asArray(extractData(funcResp)),
    metricas: extractData(metricasResp) ?? {
      folhaPagamento: 0,
      valesMes: 0,
      custoTotal: 0,
      porFuncionario: [],
    },
    beneficios: asArray(extractData(beneficiosResp)),
    workShifts: asArray(extractData(shiftsResp)),
  };
}

export function useGestaoRhHub(mesRef: string) {
  return useQuery({
    queryKey: [...GESTAO_RH_HUB_QUERY_KEY, mesRef] as const,
    queryFn: () => fetchGestaoRhHub(mesRef),
    enabled: Boolean(mesRef),
  });
}

export function useInvalidateGestaoRhHub() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_RH_HUB_QUERY_KEY });
}

export async function fetchGestaoFrotaHub() {
  const [veicResp, metricasResp] = await Promise.all([
    veiculosService.listar(),
    veiculosService.obterMetricas(),
  ]);
  return {
    veiculos: asArray(extractData(veicResp)),
    metricas: extractData(metricasResp) ?? {
      gastosMes: 0,
      combustivel: 0,
      manutencao: 0,
      totalVeiculos: 0,
    },
  };
}

export function useGestaoFrotaHub() {
  return useQuery({
    queryKey: GESTAO_FROTA_HUB_QUERY_KEY,
    queryFn: fetchGestaoFrotaHub,
  });
}

export function useInvalidateGestaoFrotaHub() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_FROTA_HUB_QUERY_KEY });
}

export async function fetchGestaoPlanosLista() {
  const resp = await planosService.listar();
  return asArray(extractData(resp));
}

export function useGestaoPlanosLista() {
  return useQuery({
    queryKey: GESTAO_PLANOS_LISTA_QUERY_KEY,
    queryFn: fetchGestaoPlanosLista,
  });
}

export function useInvalidateGestaoPlanosLista() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_PLANOS_LISTA_QUERY_KEY });
}

export async function fetchGestaoDespesasFixasHub() {
  const [despResp, metricasResp] = await Promise.all([
    despesasFixasService.listar(),
    despesasFixasService.obterMetricas(),
  ]);
  return {
    despesas: asArray(extractData(despResp)),
    metricas: extractData(metricasResp) ?? {
      totalMensal: 0,
      totalAnual: 0,
      totalDespesas: 0,
      porCategoria: {},
    },
  };
}

export function useGestaoDespesasFixasHub() {
  return useQuery({
    queryKey: GESTAO_DESPESAS_HUB_QUERY_KEY,
    queryFn: fetchGestaoDespesasFixasHub,
  });
}

export function useInvalidateGestaoDespesasFixasHub() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_DESPESAS_HUB_QUERY_KEY });
}

export async function fetchGestaoEstoqueRhHub() {
  const [recursosResp, funcionariosResp, kitsResp] = await Promise.all([
    axiosApiService.get('/api/recursos-humanos'),
    funcionariosService.listar(),
    axiosApiService.get('/api/kits-ferramenta'),
  ]);

  const recursosData = recursosResp?.success ? recursosResp.data : [];
  const funcData = extractData(funcionariosResp);
  const rawKits = kitsResp?.success ? kitsResp.data : [];
  const kitsData = Array.isArray(rawKits)
    ? rawKits
    : Array.isArray((rawKits as any)?.data)
      ? (rawKits as any).data
      : Array.isArray((rawKits as any)?.data?.data)
        ? (rawKits as any).data.data
        : [];

  return {
    recursos: asArray(recursosData),
    funcionarios: asArray(funcData),
    kitsFerramentas: asArray(kitsData).filter((kit: any) => kit?.ativo !== false),
    recursosOk: Boolean(recursosResp?.success),
    kitsOk: Boolean(kitsResp?.success),
    recursosError: recursosResp?.error as string | undefined,
    kitsError: kitsResp?.error as string | undefined,
  };
}

export function useGestaoEstoqueRhHub() {
  return useQuery({
    queryKey: GESTAO_ESTOQUE_RH_HUB_QUERY_KEY,
    queryFn: fetchGestaoEstoqueRhHub,
  });
}

export function useInvalidateGestaoEstoqueRhHub() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_ESTOQUE_RH_HUB_QUERY_KEY });
}

export async function fetchGestaoBiDashboard(dataInicio: string, dataFim: string) {
  const [
    orcamentosStatusResultado,
    orcamentosTipoServicoResultado,
    gastosFornecedorResultado,
    vendasComprasResultado,
    materiaisResultado,
    gastosCartaoResultado,
    metodosResultado,
    evolucaoFaturasResultado,
  ] = await Promise.all([
    biService.getOrcamentosPorStatus(dataInicio, dataFim),
    biService.getOrcamentosPorTipoServicoClassificado(dataInicio, dataFim),
    biService.getGastosFornecedor(dataInicio, dataFim),
    biService.getVendasComprasClassificacao(dataInicio, dataFim),
    biService.getMateriaisMaisCompradosPeriodo(dataInicio, dataFim),
    biService.getGastosCartaoCredito(dataInicio, dataFim),
    biService.getMetodosPagamentoComparativo(dataInicio, dataFim),
    biService.getEvolucaoFaturasCartao(dataInicio, dataFim),
  ]);

  const gastosFornecedorRaw = gastosFornecedorResultado?.data;
  const gastosFornecedor = Array.isArray(gastosFornecedorRaw) ? gastosFornecedorRaw : [];

  return {
    orcamentosPorStatus: orcamentosStatusResultado?.data ?? null,
    orcamentosPorTipoServico: orcamentosTipoServicoResultado?.data ?? null,
    gastosFornecedor,
    vendasCompras: vendasComprasResultado?.success ? vendasComprasResultado.data ?? null : null,
    materiaisPeriodo: materiaisResultado?.success ? materiaisResultado.data ?? null : null,
    gastosCartao: gastosCartaoResultado?.success ? gastosCartaoResultado.data ?? null : null,
    metodosPagamento: metodosResultado?.success ? metodosResultado.data ?? null : null,
    evolucaoFaturas: evolucaoFaturasResultado?.success ? evolucaoFaturasResultado.data ?? null : null,
    errors: {
      orcamentosStatus: orcamentosStatusResultado && !orcamentosStatusResultado.success
        ? orcamentosStatusResultado.error
        : null,
      orcamentosTipoServico:
        orcamentosTipoServicoResultado && !orcamentosTipoServicoResultado.success
          ? orcamentosTipoServicoResultado.error
          : null,
      gastosFornecedor:
        gastosFornecedorResultado && !gastosFornecedorResultado.success
          ? gastosFornecedorResultado.error
          : null,
    },
  };
}

export function useGestaoBiDashboard(dataInicio: string, dataFim: string) {
  return useQuery({
    queryKey: [...GESTAO_BI_DASHBOARD_QUERY_KEY, dataInicio, dataFim] as const,
    queryFn: () => fetchGestaoBiDashboard(dataInicio, dataFim),
    enabled: Boolean(dataInicio && dataFim),
  });
}

export function useInvalidateGestaoBiDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: GESTAO_BI_DASHBOARD_QUERY_KEY });
}
