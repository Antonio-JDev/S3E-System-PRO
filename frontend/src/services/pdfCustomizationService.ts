import { axiosApiService } from './axiosApi';
import {
    PDFCustomization,
    SavedPDFTemplate,
    GeneratePDFRequest,
    GeneratePDFResponse,
    OrcamentoPDFData
} from '../types/pdfCustomization';

class PDFCustomizationService {
    /**
     * Gera PDF personalizado
     */
    async generateCustomPDF(orcamentoData: OrcamentoPDFData, customization: PDFCustomization): Promise<GeneratePDFResponse> {
        try {
            console.log('📄 Gerando PDF personalizado...');
            
            const request: GeneratePDFRequest = {
                orcamentoData,
                customization
            };

            const response = await axiosApiService.post<GeneratePDFResponse>(
                '/api/pdf-customization/generate-custom',
                request,
                {
                    responseType: 'blob' // Para download direto
                }
            );

            if (response.success && response.data) {
                // Criar URL para download
                const blob = new Blob([response.data as any], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const fileName = `Orcamento_${orcamentoData.numero}_${Date.now()}.pdf`;

                // Fazer download
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                return {
                    success: true,
                    fileName
                };
            }

            return {
                success: false,
                error: response.error || 'Erro ao gerar PDF',
                fileName: ''
            };
        } catch (error: any) {
            console.error('Erro ao gerar PDF:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao gerar PDF personalizado',
                fileName: ''
            };
        }
    }

    /**
     * Salva template de personalização
     */
    async saveTemplate(templateName: string, customization: PDFCustomization, description?: string) {
        try {
            const response = await axiosApiService.post<SavedPDFTemplate>('/api/pdf-customization/templates', {
                templateName,
                customization,
                description
            });

            return response;
        } catch (error: any) {
            console.error('Erro ao salvar template:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao salvar template'
            };
        }
    }

    /**
     * Lista todos os templates do usuário
     */
    async listTemplates() {
        try {
            const response = await axiosApiService.get<SavedPDFTemplate[]>('/api/pdf-customization/templates');
            return response;
        } catch (error: any) {
            console.error('Erro ao listar templates:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao carregar templates',
                data: []
            };
        }
    }

    /**
     * Carrega um template específico
     */
    async loadTemplate(templateId: string) {
        try {
            const response = await axiosApiService.get<SavedPDFTemplate>(`/api/pdf-customization/templates/${templateId}`);
            return response;
        } catch (error: any) {
            console.error('Erro ao carregar template:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao carregar template'
            };
        }
    }

    /**
     * Atualiza um template existente
     */
    async updateTemplate(templateId: string, templateName: string, customization: PDFCustomization, description?: string) {
        try {
            const response = await axiosApiService.put<SavedPDFTemplate>(`/api/pdf-customization/templates/${templateId}`, {
                templateName,
                customization,
                description
            });

            return response;
        } catch (error: any) {
            console.error('Erro ao atualizar template:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao atualizar template'
            };
        }
    }

    /**
     * Deleta um template
     */
    async deleteTemplate(templateId: string) {
        try {
            const response = await axiosApiService.delete(`/api/pdf-customization/templates/${templateId}`);
            return response;
        } catch (error: any) {
            console.error('Erro ao deletar template:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao deletar template'
            };
        }
    }

    /**
     * Upload de imagem para marca d'água
     * Converte para base64 para uso no PDF
     */
    async uploadWatermark(imageFile: File) {
        try {
            // Converter para base64 localmente
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });

            return {
                success: true,
                data: {
                    url: base64
                }
            };
        } catch (error: any) {
            console.error('Erro ao processar marca d\'água:', error);
            return {
                success: false,
                error: 'Erro ao processar imagem'
            };
        }
    }

    /**
     * Upload de design de canto customizado
     */
    async uploadCornerDesign(imageFile: File) {
        try {
            const formData = new FormData();
            formData.append('cornerDesign', imageFile);

            const response = await axiosApiService.post<{ url: string; success: boolean }>(
                '/api/pdf-customization/upload-corner-design',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return response;
        } catch (error: any) {
            console.error('Erro ao fazer upload do design de canto:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao fazer upload do design'
            };
        }
    }

    /**
     * Gera preview do PDF (retorna HTML)
     */
    async generatePreview(orcamentoId: string, customization: PDFCustomization) {
        try {
            const formData = new FormData();
            formData.append('opacidade', customization.watermark.opacity.toString());
            
            // Se tiver logo/marca d'água, converter de base64 para blob
            if (customization.watermark.type === 'logo' && customization.watermark.content) {
                try {
                    // Se for base64, converter para blob
                    if (customization.watermark.content.startsWith('data:')) {
                        const response = await fetch(customization.watermark.content);
                        const blob = await response.blob();
                        formData.append('logo', blob, 'logo.png');
                    }
                } catch (err) {
                    console.warn('Não foi possível converter logo:', err);
                }
            }

            // Se tiver folha timbrada (corners), adicionar
            if (customization.design.corners.enabled && customization.design.corners.image) {
                try {
                    let imageUrl = customization.design.corners.image;
                    
                    // Se for URL HTTP, buscar a imagem
                    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/uploads/')) {
                        // Se for URL relativa, construir URL completa
                        if (imageUrl.startsWith('/uploads/')) {
                            const baseUrl = window.location.origin.replace(':8080', ':3001');
                            imageUrl = `${baseUrl}${imageUrl}`;
                        }
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        formData.append('folhaTimbrada', blob, 'folha.png');
                    } else if (imageUrl.startsWith('data:')) {
                        // Se for base64, converter para blob
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        formData.append('folhaTimbrada', blob, 'folha.png');
                    }
                } catch (err) {
                    console.warn('Não foi possível converter folha timbrada:', err);
                }
            }

            const response = await axiosApiService.post<{ html: string; success: boolean }>(
                `/api/orcamentos/${orcamentoId}/pdf/preview-personalizado`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return response;
        } catch (error: any) {
            console.error('Erro ao gerar preview:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao gerar preview'
            };
        }
    }

    /**
     * Lista todas as folhas timbradas já importadas
     */
    async listFolhasTimbradas() {
        try {
            const response = await axiosApiService.get<Array<{
                filename: string;
                url: string;
                size: number;
                createdAt: string;
                modifiedAt: string;
            }>>('/api/pdf-customization/folhas-timbradas');
            return response;
        } catch (error: any) {
            console.error('Erro ao listar folhas timbradas:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao carregar folhas timbradas',
                data: []
            };
        }
    }

    /**
     * Deleta uma folha timbrada
     */
    async deleteFolhaTimbrada(filename: string) {
        try {
            const response = await axiosApiService.delete(`/api/pdf-customization/folhas-timbradas/${filename}`);
            return response;
        } catch (error: any) {
            console.error('Erro ao deletar folha timbrada:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao deletar folha timbrada'
            };
        }
    }

    /**
     * Upload de folha timbrada
     */
    async uploadFolhaTimbrada(file: File) {
        try {
            const formData = new FormData();
            formData.append('cornerDesign', file);
            
            const response = await axiosApiService.post<{ url: string; filename: string }>(
                '/api/pdf-customization/upload-corner-design',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );
            return response;
        } catch (error: any) {
            console.error('Erro ao fazer upload da folha timbrada:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Erro ao fazer upload da folha timbrada',
                data: null
            };
        }
    }

    /**
     * Gera PDF personalizado e abre em nova janela
     */
    async generatePersonalizedPDF(orcamentoId: string, customization: PDFCustomization): Promise<GeneratePDFResponse> {
        try {
            console.log('📄 Gerando PDF personalizado para visualização...');
            
            const formData = new FormData();
            formData.append('opacidade', customization.watermark.opacity.toString());
            
            // Se tiver logo/marca d'água, converter de base64 para blob
            if (customization.watermark.type === 'logo' && customization.watermark.content) {
                try {
                    if (customization.watermark.content.startsWith('data:')) {
                        const response = await fetch(customization.watermark.content);
                        const blob = await response.blob();
                        formData.append('logo', blob, 'logo.png');
                    }
                } catch (err) {
                    console.warn('Não foi possível converter logo:', err);
                }
            }

            // Se tiver folha timbrada (corners), adicionar
            if (customization.design.corners.enabled && customization.design.corners.image) {
                try {
                    let imageUrl = customization.design.corners.image;
                    
                    // Se for URL HTTP, buscar a imagem
                    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/uploads/')) {
                        // Se for URL relativa, construir URL completa
                        if (imageUrl.startsWith('/uploads/')) {
                            const baseUrl = window.location.origin.replace(':8080', ':3001');
                            imageUrl = `${baseUrl}${imageUrl}`;
                        }
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        formData.append('folhaTimbrada', blob, 'folha.png');
                    } else if (imageUrl.startsWith('data:')) {
                        // Se for base64, converter para blob
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        formData.append('folhaTimbrada', blob, 'folha.png');
                    }
                } catch (err) {
                    console.warn('Não foi possível converter folha timbrada:', err);
                }
            }

            // Buscar o HTML ao invés do PDF binário
            const response = await axiosApiService.post(
                `/api/orcamentos/${orcamentoId}/pdf/preview-personalizado`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.success && response.data?.html) {
                // Criar blob com HTML e abrir em nova janela
                const blob = new Blob([response.data.html], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                
                // Abrir em nova janela
                const win = window.open(url, '_blank');
                
                if (win) {
                    // Aguardar carregar e disparar impressão automaticamente
                    win.addEventListener('load', () => {
                        setTimeout(() => {
                            win.print();
                            // Limpar blob URL após uso
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }, 500);
                    });
                    
                    return {
                        success: true,
                        fileName: 'Orcamento_Personalizado.pdf'
                    };
                } else {
                    throw new Error('Popup bloqueado! Permita popups neste site.');
                }
            }

            return {
                success: false,
                error: response.error || 'Erro ao gerar PDF',
                fileName: ''
            };
        } catch (error: any) {
            console.error('Erro ao gerar PDF:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Erro ao gerar PDF personalizado',
                fileName: ''
            };
        }
    }
}

export const pdfCustomizationService = new PDFCustomizationService();
export default pdfCustomizationService;

