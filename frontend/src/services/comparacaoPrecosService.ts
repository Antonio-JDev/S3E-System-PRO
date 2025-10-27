import { apiService } from './api';

export interface ComparacaoPreco {
  codigoMaterial: string;
  descricao: string;
  precoAtual: number;
  precoFornecedor: number;
  diferenca: number;
  percentualDiferenca: number;
  fornecedor: string;
}

export interface HistoricoPreco {
  data: string;
  preco: number;
  fornecedor: string;
  observacao?: string;
}

export interface ResultadoUploadCSV {
  totalLinhas: number;
  comparacoes: ComparacaoPreco[];
  erros?: string[];
}

export interface ValidacaoCSV {
  valido: boolean;
  erros?: string[];
  avisos?: string[];
}

export interface AtualizarPrecosDto {
  atualizacoes: {
    codigoMaterial: string;
    novoPreco: number;
    fornecedor: string;
  }[];
}

class ComparacaoPrecosService {
  /**
   * Upload e processamento de arquivo CSV
   */
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

  /**
   * Validar estrutura do arquivo CSV
   */
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

  /**
   * Buscar histórico de preços de um material
   */
  async buscarHistoricoPrecos(codigo: string) {
    return apiService.get<HistoricoPreco[]>(`/api/comparacao-precos/historico/${codigo}`);
  }

  /**
   * Atualizar preços no banco baseado na comparação
   */
  async atualizarPrecos(data: AtualizarPrecosDto) {
    return apiService.post('/api/comparacao-precos/atualizar-precos', data);
  }
}

export const comparacaoPrecosService = new ComparacaoPrecosService();
