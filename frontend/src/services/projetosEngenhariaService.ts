import { axiosApiService } from './axiosApi';
import { ENDPOINTS } from '../config/api';

export interface ProjetoEngenhariaMetadados {
  id: string;
  nomeProjeto: string | null;
  tiposProjeto: string[];
  statusEngenharia: string;
  statusCelesc: string[];
  comentarioEngenharia: string | null;
  prioridade: string;
  responsavelEngenhariaId: string | null;
  atribuidoSetorEngenharia: boolean;
  responsavelEngenharia?: { id: string; nome: string } | null;
}

export interface ProjetoEngenhariaRow {
  projetoId: string;
  titulo: string;
  statusOs: string;
  numeroSequencial: number | null;
  cliente: { id: string; nome: string };
  orcamentoId: string;
  matchAutomatico: boolean;
  progresso: number;
  engenharia: ProjetoEngenhariaMetadados | null;
}

export type ProjetoEngenhariaPatch = Partial<{
  nomeProjeto: string | null;
  tiposProjeto: string[];
  statusEngenharia: string;
  statusCelesc: string[];
  comentarioEngenharia: string | null;
  prioridade: string;
  responsavelEngenhariaId: string | null;
}>;

export interface EngenhariaTarefaResumoRow {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  prazo: string | null;
  dataInicio: string | null;
  projetoId: string;
  numeroSequencial: number | null;
  osTitulo: string;
  clienteNome: string | null;
}

export interface EngenhariaDocumentoReferencia {
  id: string;
  titulo: string;
  categoria: string;
  nome: string;
  nomeArquivo: string;
  url: string;
  tamanho: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface InfoAtribuicaoOs {
  projetoId: string;
  precisaEquipeEngenharia: boolean;
  atribuido: boolean;
  responsavelEngenhariaId: string | null;
  responsavelNome: string | null;
  statusEngenharia: string | null;
}

class ProjetosEngenhariaService {
  private base = `${ENDPOINTS.PROJETOS}/engenharia`;

  async listar() {
    return axiosApiService.get<ProjetoEngenhariaRow[]>(this.base);
  }

  async listarResumoTarefas() {
    return axiosApiService.get<EngenhariaTarefaResumoRow[]>(`${this.base}/resumo-tarefas`);
  }

  async infoAtribuicao(projetoIds: string[]) {
    const ids = projetoIds.filter(Boolean).join(',');
    return axiosApiService.get<InfoAtribuicaoOs[]>(`${this.base}/info-atribuicao`, { ids });
  }

  async atualizarStatusTarefaKanban(
    projetoId: string,
    taskId: string,
    status: 'Em Andamento' | 'Concluído',
  ) {
    const backendStatus = status === 'Em Andamento' ? 'Doing' : 'Done';
    return axiosApiService.put<{ id: string; status: string }>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/tasks/${taskId}`,
      { status: backendStatus },
    );
  }

  async listarDocumentosReferencia() {
    return axiosApiService.get<EngenhariaDocumentoReferencia[]>(`${this.base}/documentos-referencia`);
  }

  async uploadDocumentoReferencia(formData: FormData) {
    return axiosApiService.upload<EngenhariaDocumentoReferencia>(
      `${this.base}/documentos-referencia`,
      formData,
    );
  }

  async deletarDocumentoReferencia(documentoId: string) {
    return axiosApiService.delete(`${this.base}/documentos-referencia/${documentoId}`);
  }

  async obterDocumentoBlob(documentoId: string): Promise<Blob> {
    return axiosApiService.getBlob(`${this.base}/documentos-referencia/${documentoId}/visualizar`);
  }

  async atualizarMetadados(projetoId: string, patch: ProjetoEngenhariaPatch) {
    return axiosApiService.patch<ProjetoEngenhariaRow>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/engenharia`,
      patch,
    );
  }

  async atribuir(projetoId: string, responsavelEngenhariaId?: string | null) {
    return axiosApiService.patch<ProjetoEngenhariaRow>(
      `${ENDPOINTS.PROJETOS}/${projetoId}/engenharia/atribuir`,
      { responsavelEngenhariaId: responsavelEngenhariaId ?? null },
    );
  }
}

export const projetosEngenhariaService = new ProjetosEngenhariaService();
