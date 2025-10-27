import { apiService } from './api';

export interface ComparacaoPreco {
  codigo: string;
  descricao: string;
  unidade: string;
  precoAtual: number;
  precoFornecedor: number;
  diferenca: number;
  percentual: number;
  fornecedor: string;
}

export interface HistoricoPreco {
  data: string;
  preco: number;
  fornecedor: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
  avisos: string[];
  preview: ComparacaoPreco[];
}

class ComparacaoPrecosService {
  /**
   * Upload e processamento de arquivo CSV para comparação de preços
   */
  async uploadCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${apiService['baseURL']}/api/comparacao-precos/upload-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
    }

    return await response.json();
  }

  /**
   * Validar estrutura do arquivo CSV
   */
  async validarCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${apiService['baseURL']}/api/comparacao-precos/validate-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao validar arquivo');
    }

    return await response.json();
  }

  /**
   * Buscar histórico de preços de um material
   */
  async buscarHistoricoPrecos(codigo: string) {
    return apiService.get<HistoricoPreco[]>(`/api/comparacao-precos/historico/${codigo}`);
  }

  /**
   * Atualizar preços no banco baseado na comparação
   */
  async atualizarPrecos(atualizacoes: Array<{
    codigo: string;
    novoPreco: number;
    fornecedor: string;
  }>) {
    return apiService.post<{
      atualizados: number;
      erros: string[];
    }>('/api/comparacao-precos/atualizar-precos', { atualizacoes });
  }
}

export const comparacaoPrecosService = new ComparacaoPrecosService();
