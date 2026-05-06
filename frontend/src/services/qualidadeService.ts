import { axiosApiService } from './axiosApi';

export interface InspecaoItem {
  tipo: string;
  nome: string;
  status: 'pendente' | 'aprovado';
  dataAprovacao?: string | null;
  aprovadoPor?: string | null;
}

export interface QualidadeData {
  id: string | null;
  projetoId: string;
  statusVisita: string;
  dataVisita: string | null;
  responsavel: string | null;
  checklist: boolean[];
  observacoes: string | null;
  inspecoes: InspecaoItem[];
  fotos: Array<{ id: string; url: string; nome: string }>;
  createdAt: string | null;
  updatedAt: string | null;
}

export const CHECKLIST_LABELS = [
  'Inspeção do local',
  'Medições realizadas',
  'Fotos documentadas',
  'Condições elétricas verificadas',
  'Requisitos técnicos confirmados',
  'Orçamento validado com cliente'
];

export const TIPOS_INSPECAO = [
  'INSPECAO_INICIAL',
  'APROVACAO_CLIENTE',
  'TESTE_QUALIDADE',
  'VISTORIA_FINAL'
] as const;

export async function getQualidade(projetoId: string): Promise<{ success: boolean; data?: QualidadeData; error?: string }> {
  const res = await axiosApiService.get<{ success: boolean; data: QualidadeData; error?: string }>(
    `/api/projetos/${projetoId}/qualidade`
  );
  return res as any;
}

export async function salvarQualidade(
  projetoId: string,
  payload: {
    statusVisita?: string;
    dataVisita?: string | null;
    responsavel?: string | null;
    checklist?: boolean[];
    observacoes?: string | null;
  }
): Promise<{ success: boolean; data?: QualidadeData; error?: string }> {
  const res = await axiosApiService.put<{ success: boolean; data: QualidadeData; error?: string }>(
    `/api/projetos/${projetoId}/qualidade`,
    payload
  );
  return res as any;
}

export async function aprovarInspecao(
  projetoId: string,
  tipo: string,
  aprovadoPor?: string
): Promise<{ success: boolean; data?: QualidadeData; error?: string }> {
  const res = await axiosApiService.post<{ success: boolean; data: QualidadeData; error?: string }>(
    `/api/projetos/${projetoId}/qualidade/inspecoes/${encodeURIComponent(tipo)}/aprovar`,
    { aprovadoPor: aprovadoPor || undefined }
  );
  return res as any;
}
