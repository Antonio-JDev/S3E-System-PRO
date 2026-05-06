/**
 * Testes Unitários para pdfCustomizationService
 * 
 * Para rodar os testes:
 * npm test -- pdfCustomizationService.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pdfCustomizationService } from '../pdfCustomizationService';
import { PDFCustomization } from '../../types/pdfCustomization';

// Mock do axiosApiService
vi.mock('../axiosApi', () => ({
    axiosApiService: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

// Mock do fetch global
global.fetch = vi.fn();

describe('pdfCustomizationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('downloadPersonalizedPDF', () => {
        it('deve extrair nome do arquivo do header Content-Disposition', async () => {
            const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
            const mockResponse = {
                ok: true,
                headers: {
                    get: vi.fn((header: string) => {
                        if (header === 'Content-Disposition') {
                            return 'attachment; filename="Orcamento-123 -EMPRESA TESTE.pdf"; filename*=UTF-8\'\'Orcamento-123%20-EMPRESA%20TESTE.pdf';
                        }
                        return null;
                    }),
                },
                blob: vi.fn(() => Promise.resolve(mockBlob)),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            // Mock do URL.createObjectURL
            global.URL.createObjectURL = vi.fn(() => 'blob:url');
            
            // Mock do document.createElement e métodos do link
            const mockClick = vi.fn();
            const mockLink = {
                href: '',
                download: '',
                click: mockClick,
            };
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

            const customization: PDFCustomization = {
                watermark: {
                    type: 'none',
                    content: '',
                    position: 'center',
                    opacity: 0.05,
                    size: 'medium',
                    rotation: 0,
                },
                design: {
                    template: 'modern',
                    colors: {
                        primary: '#6366F1',
                        secondary: '#8B5CF6',
                        accent: '#10B981',
                        background: '#FFFFFF',
                        text: '#1F2937',
                    },
                    corners: {
                        enabled: false,
                        design: 'none',
                        opacity: 0.3,
                        size: 100,
                    },
                    typography: {
                        fontFamily: 'arial',
                        fontSize: 'medium',
                    },
                    orientation: 'portrait',
                    pageSize: 'A4',
                    margins: {
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    },
                },
                content: {
                    showTechnicalDescriptions: true,
                    showImages: true,
                    includeSafetyWarnings: false,
                    showCompanyHeader: true,
                    showCompanyFooter: true,
                    showSignatures: true,
                    showTermsAndConditions: false,
                    showPaymentInfo: true,
                    showItemCodes: true,
                    showItemImages: false,
                },
                metadata: {
                    templateName: 'Padrão',
                    isDefault: true,
                    createdAt: new Date(),
                },
            };

            const result = await pdfCustomizationService.downloadPersonalizedPDF(
                'orcamento-id-123',
                customization
            );

            expect(result.success).toBe(true);
            expect(result.fileName).toContain('Orcamento-123 -EMPRESA TESTE.pdf');
            expect(mockClick).toHaveBeenCalled();
        });

        it('deve usar fallback quando Content-Disposition não estiver presente', async () => {
            const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
            const mockResponse = {
                ok: true,
                headers: {
                    get: vi.fn(() => null),
                },
                blob: vi.fn(() => Promise.resolve(mockBlob)),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            // Mock do URL.createObjectURL
            global.URL.createObjectURL = vi.fn(() => 'blob:url');
            
            // Mock do document.createElement e métodos do link
            const mockClick = vi.fn();
            const mockLink = {
                href: '',
                download: '',
                click: mockClick,
            };
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

            const customization: PDFCustomization = {
                watermark: { type: 'none', content: '', position: 'center', opacity: 0.05, size: 'medium', rotation: 0 },
                design: {
                    template: 'modern',
                    colors: { primary: '#6366F1', secondary: '#8B5CF6', accent: '#10B981', background: '#FFFFFF', text: '#1F2937' },
                    corners: { enabled: false, design: 'none', opacity: 0.3, size: 100 },
                    typography: { fontFamily: 'arial', fontSize: 'medium' },
                    orientation: 'portrait',
                    pageSize: 'A4',
                    margins: { top: 20, right: 20, bottom: 20, left: 20 },
                },
                content: {
                    showTechnicalDescriptions: true,
                    showImages: true,
                    includeSafetyWarnings: false,
                    showCompanyHeader: true,
                    showCompanyFooter: true,
                    showSignatures: true,
                    showTermsAndConditions: false,
                    showPaymentInfo: true,
                    showItemCodes: true,
                    showItemImages: false,
                },
                metadata: {
                    templateName: 'Padrão',
                    isDefault: true,
                    createdAt: new Date(),
                },
            };

            const result = await pdfCustomizationService.downloadPersonalizedPDF(
                'orcamento-id-123',
                customization
            );

            expect(result.success).toBe(true);
            expect(result.fileName).toContain('Orcamento-orcament-Personalizado.pdf');
        });

        it('deve decodificar nome do arquivo quando codificado em UTF-8', async () => {
            const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
            const mockResponse = {
                ok: true,
                headers: {
                    get: vi.fn((header: string) => {
                        if (header === 'Content-Disposition') {
                            return 'attachment; filename*=UTF-8\'\'Orcamento-123%20-EMPRESA%20TESTE%20LTDA.pdf';
                        }
                        return null;
                    }),
                },
                blob: vi.fn(() => Promise.resolve(mockBlob)),
            };

            (global.fetch as any).mockResolvedValue(mockResponse);

            global.URL.createObjectURL = vi.fn(() => 'blob:url');
            
            const mockClick = vi.fn();
            const mockLink = {
                href: '',
                download: '',
                click: mockClick,
            };
            vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

            const customization: PDFCustomization = {
                watermark: { type: 'none', content: '', position: 'center', opacity: 0.05, size: 'medium', rotation: 0 },
                design: {
                    template: 'modern',
                    colors: { primary: '#6366F1', secondary: '#8B5CF6', accent: '#10B981', background: '#FFFFFF', text: '#1F2937' },
                    corners: { enabled: false, design: 'none', opacity: 0.3, size: 100 },
                    typography: { fontFamily: 'arial', fontSize: 'medium' },
                    orientation: 'portrait',
                    pageSize: 'A4',
                    margins: { top: 20, right: 20, bottom: 20, left: 20 },
                },
                content: {
                    showTechnicalDescriptions: true,
                    showImages: true,
                    includeSafetyWarnings: false,
                    showCompanyHeader: true,
                    showCompanyFooter: true,
                    showSignatures: true,
                    showTermsAndConditions: false,
                    showPaymentInfo: true,
                    showItemCodes: true,
                    showItemImages: false,
                },
                metadata: {
                    templateName: 'Padrão',
                    isDefault: true,
                    createdAt: new Date(),
                },
            };

            const result = await pdfCustomizationService.downloadPersonalizedPDF(
                'orcamento-id-123',
                customization
            );

            expect(result.success).toBe(true);
            expect(result.fileName).toBe('Orcamento-123 -EMPRESA TESTE LTDA.pdf');
        });
    });
});
