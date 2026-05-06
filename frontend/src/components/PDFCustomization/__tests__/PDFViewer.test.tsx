/**
 * Testes Unitários para PDFViewer
 * 
 * Para rodar os testes:
 * npm test -- PDFViewer.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PDFViewer from '../PDFViewer';
import { OrcamentoPDFData } from '../../../types/pdfCustomization';

// Mock do OrcamentoPrintable
vi.mock('../OrcamentoPrintable', () => ({
    default: ({ ref, ...props }: any) => (
        <div ref={ref} data-testid="orcamento-printable" {...props}>
            Mock OrcamentoPrintable
        </div>
    ),
}));

const mockOrcamentoData: OrcamentoPDFData = {
    numero: 'B5704E6A',
    numeroSequencial: 123,
    emissao: '16/01/2026',
    validade: '14/02/2026',
    cliente: {
        nome: 'EMPRESA TESTE LTDA',
    },
    items: [],
    financeiro: {
        subtotal: 1000,
        desconto: 0,
        impostos: 0,
        valorTotal: 1000,
    },
};

const mockPrintableRef = {
    current: document.createElement('div'),
};

describe('PDFViewer', () => {
    const defaultProps = {
        orcamento: mockOrcamentoData,
        printableRef: mockPrintableRef as React.RefObject<HTMLDivElement>,
        folhaTimbradaUrl: undefined,
        opacidade: 0.05,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Renderização', () => {
        it('deve renderizar o toolbar com controles de zoom', () => {
            render(<PDFViewer {...defaultProps} />);

            expect(screen.getByText('Preview do PDF')).toBeInTheDocument();
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('deve renderizar botões de zoom (-) e (+)', () => {
            render(<PDFViewer {...defaultProps} />);

            // Buscar botões pelos títulos (title attributes)
            const zoomOut = screen.getByTitle('Diminuir zoom');
            const zoomIn = screen.getByTitle('Aumentar zoom');

            expect(zoomOut).toBeInTheDocument();
            expect(zoomIn).toBeInTheDocument();
        });

        it('deve renderizar contador de páginas', () => {
            render(<PDFViewer {...defaultProps} />);

            expect(screen.getByText(/página/)).toBeInTheDocument();
        });

        it('deve renderizar o componente OrcamentoPrintable', () => {
            render(<PDFViewer {...defaultProps} />);

            expect(screen.getByTestId('orcamento-printable')).toBeInTheDocument();
        });
    });

    describe('Controles de Zoom', () => {
        it('deve iniciar com zoom de 100%', () => {
            render(<PDFViewer {...defaultProps} />);

            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('deve aumentar zoom ao clicar no botão (+)', () => {
            render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomIn = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M12 4v16m8-8H4')
            );

            expect(zoomIn).toBeInTheDocument();
            fireEvent.click(zoomIn!);

            expect(screen.getByText('110%')).toBeInTheDocument();
        });

        it('deve diminuir zoom ao clicar no botão (-)', () => {
            render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomOut = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M20 12H4')
            );

            expect(zoomOut).toBeInTheDocument();
            fireEvent.click(zoomOut!);

            expect(screen.getByText('90%')).toBeInTheDocument();
        });

        it('não deve permitir zoom maior que 200%', () => {
            render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomIn = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M12 4v16m8-8H4')
            );

            // Clicar 10 vezes para tentar ultrapassar 200%
            for (let i = 0; i < 15; i++) {
                fireEvent.click(zoomIn!);
            }

            // Deve estar em 200% e desabilitado
            expect(screen.getByText('200%')).toBeInTheDocument();
            expect(zoomIn).toHaveAttribute('disabled');
        });

        it('não deve permitir zoom menor que 50%', () => {
            render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomOut = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M20 12H4')
            );

            // Clicar 10 vezes para tentar ultrapassar 50%
            for (let i = 0; i < 10; i++) {
                fireEvent.click(zoomOut!);
            }

            // Deve estar em 50% e desabilitado
            expect(screen.getByText('50%')).toBeInTheDocument();
            expect(zoomOut).toHaveAttribute('disabled');
        });

        it('deve resetar zoom ao clicar no botão de porcentagem', () => {
            render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomIn = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M12 4v16m8-8H4')
            );
            const zoomReset = screen.getByText('100%').closest('button');

            // Aumentar zoom
            fireEvent.click(zoomIn!);
            expect(screen.getByText('110%')).toBeInTheDocument();

            // Resetar zoom
            fireEvent.click(zoomReset!);
            expect(screen.getByText('100%')).toBeInTheDocument();
        });
    });

    describe('Contador de Páginas', () => {
        it('deve exibir contador dinâmico de páginas', () => {
            render(<PDFViewer {...defaultProps} />);

            // Inicialmente deve mostrar pelo menos 1 página
            const contadorPaginas = screen.getByText(/página/);
            expect(contadorPaginas).toBeInTheDocument();
        });

        it('deve atualizar contagem quando o número de páginas mudar', () => {
            const { rerender } = render(<PDFViewer {...defaultProps} />);

            // Simular atualização com mais conteúdo
            const orcamentoComMaisPaginas = {
                ...mockOrcamentoData,
                descricaoTecnica: '<p>'.repeat(500),
            };

            rerender(
                <PDFViewer 
                    {...defaultProps}
                    orcamento={orcamentoComMaisPaginas}
                />
            );

            const contadorPaginas = screen.getByText(/página/);
            expect(contadorPaginas).toBeInTheDocument();
        });
    });

    describe('Aplicação de Zoom', () => {
        it('deve aplicar transform scale no container de preview', () => {
            const { container } = render(<PDFViewer {...defaultProps} />);

            const zoomButtons = screen.getAllByRole('button');
            const zoomIn = zoomButtons.find(btn => 
                btn.querySelector('svg')?.innerHTML.includes('M12 4v16m8-8H4')
            );

            fireEvent.click(zoomIn!);

            const previewContainer = container.querySelector('[style*="transform"]');
            expect(previewContainer).toBeInTheDocument();
            expect(previewContainer?.getAttribute('style')).toContain('scale(1.1)');
        });
    });

    describe('Layout e Estilo', () => {
        it('deve ter background escuro (gray-800)', () => {
            const { container } = render(<PDFViewer {...defaultProps} />);

            const viewer = container.querySelector('.bg-gray-800');
            expect(viewer).toBeInTheDocument();
        });

        it('deve ter toolbar com background dark (gray-900)', () => {
            const { container } = render(<PDFViewer {...defaultProps} />);

            const toolbar = container.querySelector('.bg-gray-900');
            expect(toolbar).toBeInTheDocument();
        });
    });
});
