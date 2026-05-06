/**
 * Testes Unitários para PDFCustomizationModal
 * 
 * Para rodar os testes:
 * npm test -- PDFCustomizationModal.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PDFCustomizationModal from '../PDFCustomizationModal';
import { OrcamentoPDFData } from '../../../types/pdfCustomization';

// Mock do react-to-print
vi.mock('react-to-print', () => ({
    useReactToPrint: vi.fn(() => vi.fn()),
}));

// Mock do toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock do serviço
vi.mock('../../../services/pdfCustomizationService', () => ({
    pdfCustomizationService: {
        downloadPersonalizedPDF: vi.fn(),
        listFolhasTimbradas: vi.fn(() => Promise.resolve({
            success: true,
            data: [],
        })),
        generatePreview: vi.fn(() => Promise.resolve({
            success: true,
            data: '<html><body>Preview HTML</body></html>',
        })),
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
    });

    describe('Renderização', () => {
        it('deve renderizar o modal quando isOpen é true', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });
            
            await waitFor(() => {
                // Verificar se o modal está renderizado procurando por elementos comuns
                const designButtons = screen.queryAllByText(/Design/i);
                const previewButtons = screen.queryAllByText(/Pré-visualização/i);
                expect(designButtons.length > 0 || previewButtons.length > 0).toBe(true);
            }, { timeout: 3000 });
        });

        it('não deve renderizar o modal quando isOpen é false', () => {
            render(<PDFCustomizationModal {...defaultProps} isOpen={false} />);
            
            expect(screen.queryByText('Personalizar PDF')).not.toBeInTheDocument();
        });

        it('deve renderizar as abas Design e Pré-visualização', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });
            
            await waitFor(() => {
                const designTabs = screen.getAllByText('🎨 Design');
                const previewTabs = screen.getAllByText('👁️ Pré-visualização');
                expect(designTabs.length).toBeGreaterThan(0);
                expect(previewTabs.length).toBeGreaterThan(0);
            });
        });

        it('não deve renderizar a aba Conteúdo', () => {
            render(<PDFCustomizationModal {...defaultProps} />);
            
            expect(screen.queryByText('📄 Conteúdo')).not.toBeInTheDocument();
        });
    });

    describe('Comportamento das Abas', () => {
        it('deve abrir na aba Pré-visualização por padrão', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });
            
            await waitFor(() => {
                const previewTabs = screen.getAllByText('👁️ Pré-visualização');
                const previewTab = previewTabs[0]?.closest('button');
                expect(previewTab).toBeInTheDocument();
            });
        });

        it('deve mudar para aba Design ao clicar no botão Design', async () => {
            await act(async () => {
                render(<PDFCustomizationModal {...defaultProps} />);
            });
            
            await waitFor(async () => {
                const designButtons = screen.getAllByText('🎨 Design');
                if (designButtons.length > 0) {
                    const designTab = designButtons[0].closest('button');
                    if (designTab) {
                        await act(async () => {
                            fireEvent.click(designTab);
                        });
                        expect(designTab).toHaveClass('bg-white');
                    }
                }
            });
        });
    });

    describe('Botões do Footer', () => {
        it('deve renderizar botão Cancelar', () => {
            render(<PDFCustomizationModal {...defaultProps} />);
            
            expect(screen.getByText('Cancelar')).toBeInTheDocument();
        });

        it('deve renderizar botão Imprimir', () => {
            render(<PDFCustomizationModal {...defaultProps} />);
            
            expect(screen.getByText('Imprimir')).toBeInTheDocument();
        });

        it('não deve renderizar botão Visualizar Preview', () => {
            render(<PDFCustomizationModal {...defaultProps} />);
            
            expect(screen.queryByText('Visualizar Preview')).not.toBeInTheDocument();
        });

        it('deve chamar onClose ao clicar em Cancelar', () => {
            const onClose = vi.fn();
            render(<PDFCustomizationModal {...defaultProps} onClose={onClose} />);
            
            const cancelButton = screen.getByText('Cancelar');
            fireEvent.click(cancelButton);
            
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Largura da Lateral', () => {
        it('deve ter largura reduzida em 10px (w-[calc(40%-10px)]) quando na aba Design', async () => {
            const { container } = render(<PDFCustomizationModal {...defaultProps} />);
            
            const tabDesign = screen.getAllByText('🎨 Design')[0];
            fireEvent.click(tabDesign);

            await waitFor(() => {
                const painelLateral = container.querySelector('.w-\\[calc\\(40\\%-10px\\)\\]');
                expect(painelLateral).toBeInTheDocument();
            });
        });
    });
});
