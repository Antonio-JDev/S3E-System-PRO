import { apiService } from './api';

export interface ResultadoComparacao {
  codigo: string;
  descricao: string;
  unidade: string;
  precoAtual: number;
  precoCSV: number;
  diferenca: number;
  percentual: number;
  status: 'igual' | 'maior' | 'menor';
}

export interface HistoricoPreco {
  id: string;
  materialId: string;
  precoAnterior: number;
  precoNovo: number;
  fornecedor?: string;
  dataAtualizacao: string;
  usuario?: string;
}

export interface ValidacaoCSV {
  valido: boolean;
  erros: string[];
  avisos: string[];
  totalLinhas: number;
  linhasValidas: number;
}

class ComparacaoPrecosService {
  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiService['baseURL']}/api/comparacao-precos/upload-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao fazer upload do CSV');
    }

    return response.json();
  }

  async validarCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${apiService['baseURL']}/api/comparacao-precos/validate-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao validar CSV');
    }

    return response.json();
  }

  async buscarHistoricoPrecos(codigo: string) {
    return apiService.get<HistoricoPreco[]>(`/api/comparacao-precos/historico/${codigo}`);
  }

  async atualizarPrecos(data: {
    atualizacoes: {
      materialId: string;
      precoNovo: number;
    }[];
    fornecedor?: string;
  }) {
    return apiService.post<any>('/api/comparacao-precos/atualizar-precos', data);
  }
}

export const comparacaoPrecosService = new ComparacaoPrecosService();
