import { apiService } from './api';

export interface VerificarOrcamentoResponse {
  existe: boolean;
  orcamento?: {
    id: number;
    numero: string;
    cliente: string;
    valorTotal: number;
  };
}

class PdfService {
  /**
   * Gerar PDF de orçamento para download
   */
  async gerarOrcamentoPDFDownload(orcamentoId: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${apiService['baseURL']}/api/pdf/orcamento/${orcamentoId}/download`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }

    return response.blob();
  }

  /**
   * Gerar PDF de orçamento para visualização inline
   */
  async gerarOrcamentoPDFView(orcamentoId: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${apiService['baseURL']}/api/pdf/orcamento/${orcamentoId}/view`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }

    return response.blob();
  }

  /**
   * Gerar PDF de orçamento e retornar URL/data URL
   */
  async gerarOrcamentoPDFURL(orcamentoId: number) {
    return apiService.get<{ url: string; dataUrl: string }>(
      `/api/pdf/orcamento/${orcamentoId}/url`
    );
  }

  /**
   * Verificar se orçamento existe antes de gerar PDF
   */
  async verificarOrcamento(orcamentoId: number) {
    return apiService.get<VerificarOrcamentoResponse>(
      `/api/pdf/orcamento/${orcamentoId}/check`
    );
  }

  /**
   * Fazer download do PDF
   */
  async downloadPDF(orcamentoId: number, nomeArquivo?: string) {
    try {
      const blob = await this.gerarOrcamentoPDFDownload(orcamentoId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || `orcamento_${orcamentoId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download do PDF:', error);
      throw error;
    }
  }

  /**
   * Visualizar PDF em nova aba
   */
  async viewPDF(orcamentoId: number) {
    try {
      const blob = await this.gerarOrcamentoPDFView(orcamentoId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Não revogamos a URL imediatamente para permitir a visualização
      setTimeout(() => window.URL.revokeObjectURL(url), 60000); // Revoga após 1 minuto
    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);
      throw error;
    }
  }
}

export const pdfService = new PdfService();
