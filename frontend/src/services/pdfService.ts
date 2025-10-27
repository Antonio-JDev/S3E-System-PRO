import { apiService } from './api';

export interface PDFResponse {
  success: boolean;
  url?: string;
  dataUrl?: string;
  message?: string;
}

class PDFService {
  /**
   * Gerar PDF de orçamento para download
   * Retorna o arquivo como blob para download direto
   */
  async gerarOrcamentoPDFDownload(orcamentoId: string): Promise<Blob> {
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao gerar PDF');
    }

    return await response.blob();
  }

  /**
   * Gerar PDF de orçamento para visualização inline
   * Abre em nova aba do navegador
   */
  async gerarOrcamentoPDFView(orcamentoId: string): Promise<Blob> {
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao gerar PDF');
    }

    return await response.blob();
  }

  /**
   * Gerar PDF de orçamento e retornar URL/data URL
   * Útil para preview ou incorporação em iframe
   */
  async gerarOrcamentoPDFURL(orcamentoId: string) {
    return apiService.get<PDFResponse>(`/api/pdf/orcamento/${orcamentoId}/url`);
  }

  /**
   * Verificar se orçamento existe antes de gerar PDF
   */
  async verificarOrcamento(orcamentoId: string) {
    return apiService.get<{
      existe: boolean;
      orcamento?: any;
    }>(`/api/pdf/orcamento/${orcamentoId}/check`);
  }

  /**
   * Helper para fazer download direto do PDF
   */
  async downloadOrcamentoPDF(orcamentoId: string, nomeArquivo?: string) {
    try {
      const blob = await this.gerarOrcamentoPDFDownload(orcamentoId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || `orcamento-${orcamentoId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Helper para abrir PDF em nova aba
   */
  async abrirOrcamentoPDF(orcamentoId: string) {
    try {
      const blob = await this.gerarOrcamentoPDFView(orcamentoId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Não revogar a URL imediatamente para permitir que o PDF seja carregado
      setTimeout(() => window.URL.revokeObjectURL(url), 60000); // 1 minuto
    } catch (error) {
      console.error('Erro ao abrir PDF:', error);
      throw error;
    }
  }
}

export const pdfService = new PDFService();
