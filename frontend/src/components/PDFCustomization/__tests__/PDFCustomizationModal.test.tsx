/**
 * Testes Unitários para PDFCustomizationModal (drawer lateral)
 *
 * npm test -- PDFCustomizationModal.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PDFCustomizationModal from '../PDFCustomizationModal';
import { OrcamentoPDFData } from '../../../types/pdfCustomization';
import { pdfCustomizationService } from '../../../services/pdfCustomizationService';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../../../services/pdfCustomizationService', () => ({
    pdfCustomizationService: {
        downloadPersonalizedPDF: vi.fn(),
        listFolhasTimbradas: vi.fn(() =>
            Promise.resolve({
                success: true,
                data: [],
            })
        ),
        fetchPreviewPdfBlob: vi.fn(() =>
            Promise.resolve({
                success: true,
                blob: new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' }),
            })
        ),
        generatePreview: vi.fn(() =>
            Promise.resolve({
                success: true,
                data: new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' }),
            })
        ),
        uploadFolhaTimbrada: vi.fn(),
        deleteFolhaTimbrada: vi.fn(),
        saveTemplate: vi.fn(),
        listTemplates: vi.fn(),
        loadTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
    },
}));

const mockOrcamentoData: OrcamentoPDFData = {
    numero: 'B5704E6A',
    numeroSequencial: 123,
    emissao: '16/01/2026',
    validade: '14/02/2026',
    cliente: {
        nome: 'EMPRESA TESTE LTDA',
        email: 'teste@empresa.com',
        cpfCnpj: '12345678000100',
    },
    enderecos: {
        cobranca: 'Rua Teste, 123',
        obra: 'Rua Obra, 456',
    },
    projeto: {
        titulo: 'Projeto Teste',
    },
    items: [
        {
            nome: 'Item Teste',
            quantidade: 10,
            valorUnitario: 100,
            valorTotal: 1000,
        },
    ],
    financeiro: {
        subtotal: 1000,
        desconto: 0,
        impostos: 0,
        valorTotal: 1000,
    },
};

describe('PDFCustomizationModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        orcamentoId: 'test-id-123',
        orcamentoData: mockOrcamentoData,
        onGeneratePDF: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    describe('Renderização', () => {
        it('deve renderizar o drawer quando isOpen é true', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
                expect(screen.getByText('Personalizar PDF')).toBeInTheDocument();
            });
        });

        it('não deve renderizar quando isOpen é false', () => {
            render(<PDFCustomizationModal {...defaultProps} isOpen={false} />);

            expect(screen.queryByText('Personalizar PDF')).not.toBeInTheDocument();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('deve exibir identificação do orçamento', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });

            await waitFor(() => {
                expect(screen.getByText(/Orçamento #123/i)).toBeInTheDocument();
            });
        });

        it('deve exibir a galeria de folhas timbradas', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });

            await waitFor(() => {
                expect(screen.getByText('Folhas Timbradas')).toBeInTheDocument();
                expect(screen.getByText(/Enviar nova folha/i)).toBeInTheDocument();
            });
        });

        it('não deve renderizar abas Design/Pré-visualização', () => {
            render(<PDFCustomizationModal {...defaultProps} />);

            expect(screen.queryByText('🎨 Design')).not.toBeInTheDocument();
            expect(screen.queryByText('👁️ Pré-visualização')).not.toBeInTheDocument();
        });
    });

    describe('Botões do Footer', () => {
        it('deve renderizar ações do footer', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });

            const footer = screen.getByRole('dialog').querySelector('footer');
            expect(footer).toBeTruthy();
            expect(footer).toHaveTextContent('Cancelar');
            expect(footer).toHaveTextContent('Baixar PDF');
            expect(footer).toHaveTextContent('Restaurar Padrão');
            expect(footer?.textContent).toMatch(/Atualizar Preview|Gerando/);
        });

        it('deve baixar o PDF do backend ao clicar em Baixar PDF', async () => {
            vi.mocked(pdfCustomizationService.downloadPersonalizedPDF).mockResolvedValue({
                success: true,
                fileName: 'Orcamento-123.pdf',
            });

            render(<PDFCustomizationModal {...defaultProps} />);
            fireEvent.click(screen.getByText('Baixar PDF'));

            await waitFor(() => {
                expect(pdfCustomizationService.downloadPersonalizedPDF).toHaveBeenCalledWith(
                    'test-id-123',
                    expect.objectContaining({
                        watermark: expect.any(Object),
                        design: expect.any(Object),
                    })
                );
            });
        });

        it('deve chamar onClose ao clicar em Cancelar', () => {
            const onClose = vi.fn();
            render(<PDFCustomizationModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByText('Cancelar'));

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('deve chamar onClose ao clicar no overlay', () => {
            const onClose = vi.fn();
            render(<PDFCustomizationModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByLabelText('Fechar personalização de PDF'));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Preview via blob', () => {
        it('deve solicitar preview pdfmake ao abrir', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });

            await waitFor(() => {
                expect(pdfCustomizationService.fetchPreviewPdfBlob).toHaveBeenCalled();
            });
        });
    });
});
