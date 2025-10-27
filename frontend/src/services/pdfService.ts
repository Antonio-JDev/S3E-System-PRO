import { apiService } from './api';

export interface PDFResponse {
  success: boolean;
  pdfUrl?: string;
  pdfDataUrl?: string;
  message?: string;
}

class PDFService {
  async gerarOrcamentoPDFDownload(id: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiService['baseURL']}/api/pdf/orcamento/${id}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }

    return response.blob();
  }

  async gerarOrcamentoPDFView(id: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiService['baseURL']}/api/pdf/orcamento/${id}/view`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF');
    }

    return response.blob();
  }

  async gerarOrcamentoPDFURL(id: string) {
    return apiService.get<PDFResponse>(`/api/pdf/orcamento/${id}/url`);
  }

  async verificarOrcamento(id: string) {
    return apiService.get<{ exists: boolean; orcamento?: any }>(`/api/pdf/orcamento/${id}/check`);
  }

  downloadPDF(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  viewPDF(blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

export const pdfService = new PDFService();
