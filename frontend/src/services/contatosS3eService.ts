import { axiosApiService } from './axiosApi';

const BASE = '/api/contatos-s3e';

export interface ContatoS3eDto {
  id: string;
  numero: string;
  jid: string | null;
  nomeAgenda: string | null;
  pushName: string | null;
  empresa: string | null;
  ultimaInteracao: string | null;
  revisado: boolean;
  origem: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContatosS3eListResponse {
  items: ContatoS3eDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContatosS3eListParams {
  search?: string;
  revisado?: 'todos' | 'sim' | 'nao';
  page?: number;
  pageSize?: number;
  orderBy?: 'recentes' | 'nome' | 'criado';
}

export interface ContatoS3eImportRowInput {
  numero: string;
  nomeAgenda?: string | null;
  empresa?: string | null;
  pushName?: string | null;
}

export interface ContatoS3eImportResult {
  numero_original: string;
  numero?: string;
  ok: boolean;
  reason?: string;
  outcome?: 'created' | 'updated';
}

export interface ContatoS3eImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: ContatoS3eImportResult[];
}

export function listContatosS3e(params: ContatosS3eListParams = {}) {
  return axiosApiService.get<ContatosS3eListResponse>(BASE, {
    search: params.search ?? '',
    revisado: params.revisado ?? 'todos',
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 50,
    orderBy: params.orderBy ?? 'recentes'
  });
}

export function getContatoS3e(id: string) {
  return axiosApiService.get<ContatoS3eDto>(`${BASE}/${encodeURIComponent(id)}`);
}

export function createContatoS3e(body: {
  numero: string;
  nomeAgenda?: string | null;
  empresa?: string | null;
  pushName?: string | null;
}) {
  return axiosApiService.post<ContatoS3eDto>(BASE, body);
}

export function updateContatoS3e(
  id: string,
  patch: Partial<{ nomeAgenda: string | null; empresa: string | null; pushName: string | null; numero: string; revisado: boolean }>
) {
  return axiosApiService.patch<ContatoS3eDto>(`${BASE}/${encodeURIComponent(id)}`, patch);
}

export function deleteContatoS3e(id: string) {
  return axiosApiService.delete<void>(`${BASE}/${encodeURIComponent(id)}`);
}

export function importContatosS3e(body: { rows: ContatoS3eImportRowInput[]; dddPadrao?: string }) {
  return axiosApiService.post<ContatoS3eImportSummary>(`${BASE}/import`, body);
}
