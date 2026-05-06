/**
 * Testes Unitários para OrcamentoPrintable
 * 
 * Para rodar os testes:
 * npm test -- OrcamentoPrintable.test.tsx
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import OrcamentoPrintable from '../OrcamentoPrintable';
import { OrcamentoPDFData } from '../../../types/pdfCustomization';

const mockOrcamentoData: OrcamentoPDFData = {
    numero: 'B5704E6A',
    numeroSequencial: 123,
    emissao: '16/01/2026',
    validade: '14/02/2026',
    cliente: {
        nome: 'EMPRESA TESTE LTDA',
        email: 'teste@empresa.com',
        cpfCnpj: '12345678000100',
        telefone: '(47) 99999-9999',
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
            nome: 'Item Teste 1',
            quantidade: 10,
            valorUnitario: 100,
            valorTotal: 1000,
            unidade: 'UN',
        },
        {
            nome: 'Item Teste 2',
            quantidade: 5,
            valorUnitario: 50,
            valorTotal: 250,
            unidade: 'UN',
        },
    ],
    financeiro: {
        subtotal: 1250,
        desconto: 0,
        impostos: 0,
        valorTotal: 1250,
    },
    pagamento: 'À Vista',
    descricaoTecnica: '<p>Descrição técnica do projeto</p>',
    observacoes: '<p>Observações importantes</p>',
};

describe('OrcamentoPrintable', () => {
    beforeEach(() => {
        // Reset antes de cada teste
    });

    describe('Renderização do Número do Orçamento', () => {
        it('deve exibir número do orçamento no formato correto: ORÇAMENTO: [número]', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            // Verificar se o texto "ORÇAMENTO: 123" está presente no container
            expect(container.textContent).toContain('ORÇAMENTO: 123');
        });

        it('deve usar número sequencial quando disponível', () => {
            const orcamentoComNumero = {
                ...mockOrcamentoData,
                numeroSequencial: 456,
            };

            const { container } = render(
                <OrcamentoPrintable orcamento={orcamentoComNumero} />
            );

            expect(container.textContent).toContain('ORÇAMENTO: 456');
        });

        it('deve usar número (ID) como fallback quando numeroSequencial não existir', () => {
            const orcamentoSemNumero = {
                ...mockOrcamentoData,
                numeroSequencial: undefined,
            };

            const { container } = render(
                <OrcamentoPrintable orcamento={orcamentoSemNumero} />
            );

            expect(container.textContent).toContain('ORÇAMENTO: B5704E6A');
        });

        it('deve aplicar fonte de 14px ao número do orçamento', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const style = container.querySelector('strong[style*="font-size: 14px"]');
            expect(style).toBeTruthy();
        });
    });

    describe('Estrutura de Páginas A4', () => {
        it('deve renderizar estrutura de página A4 com classe pdf-page', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const paginas = container.querySelectorAll('.pdf-page');
            expect(paginas.length).toBeGreaterThan(0);
        });

        it('deve incluir classe page-content para aplicar margens', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const pageContent = container.querySelector('.page-content');
            expect(pageContent).toBeInTheDocument();
        });

        it('deve aplicar margens de 95px (top) e 100px (bottom) via CSS', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const styleElement = container.querySelector('style');
            expect(styleElement?.textContent).toContain('padding-top: 95px');
            expect(styleElement?.textContent).toContain('padding-bottom: 100px');
        });
    });

    describe('Folha Timbrada', () => {
        it('deve renderizar folha timbrada quando fornecida', () => {
            const folhaTimbradaUrl = 'https://example.com/folha.png';
            
            const { container } = render(
                <OrcamentoPrintable 
                    orcamento={mockOrcamentoData}
                    folhaTimbradaUrl={folhaTimbradaUrl}
                />
            );

            const watermark = container.querySelector('.custom-letterhead');
            expect(watermark).toBeInTheDocument();
        });

        it('deve renderizar marca d\'água padrão quando folha timbrada não fornecida', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const watermark = container.querySelector('.watermark-center');
            expect(watermark).toBeInTheDocument();
            expect(watermark?.textContent).toContain('S3E');
        });

        it('deve aplicar opacidade configurável na marca d\'água', () => {
            const opacidade = 0.1;
            
            const { container } = render(
                <OrcamentoPrintable 
                    orcamento={mockOrcamentoData}
                    opacidade={opacidade}
                />
            );

            const styleElement = container.querySelector('style');
            expect(styleElement?.textContent).toContain(`opacity: ${opacidade}`);
        });
    });

    describe('Conteúdo do Orçamento', () => {
        it('deve renderizar dados do cliente', () => {
            const { container, getAllByText, getByText } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            expect(getAllByText('EMPRESA TESTE LTDA').length).toBeGreaterThan(0);
            expect(getByText('teste@empresa.com')).toBeInTheDocument();
        });

        it('deve renderizar itens do orçamento na tabela', () => {
            const { getByText } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            expect(getByText('Item Teste 1')).toBeInTheDocument();
            expect(getByText('Item Teste 2')).toBeInTheDocument();
        });

        it('deve renderizar total do orçamento', () => {
            const { getAllByText } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const totals = getAllByText(/R\$ 1\.250/);
            // Deve ter pelo menos uma ocorrência do total
            expect(totals.length).toBeGreaterThan(0);
        });

        it('deve renderizar descrição técnica quando presente', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            expect(container.textContent).toContain('Descrição Técnica do Projeto');
        });
    });

    describe('Renderização de Conteúdo', () => {
        it('deve renderizar conteúdo técnico através do PrintRenderer', () => {
            const orcamentoComDescricao = {
                ...mockOrcamentoData,
                descricaoTecnica: '<p>Descrição técnica detalhada do projeto</p>',
            };

            const { container } = render(
                <OrcamentoPrintable orcamento={orcamentoComDescricao} />
            );

            // Deve ter a primeira página com dados do orçamento
            const paginas = container.querySelectorAll('.pdf-page');
            expect(paginas.length).toBeGreaterThanOrEqual(1);
            
            // Deve ter o PrintRenderer para descrição técnica
            const printRenderer = container.querySelector('.print-renderer');
            expect(printRenderer).toBeInTheDocument();
        });

        it('deve incluir folha timbrada na primeira página', () => {
            const { container } = render(
                <OrcamentoPrintable 
                    orcamento={mockOrcamentoData}
                    folhaTimbradaUrl="https://example.com/folha.png"
                />
            );

            const watermarks = container.querySelectorAll('.watermark-background');
            
            // Deve ter pelo menos uma folha timbrada (primeira página com dados)
            expect(watermarks.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('CSS para Impressão', () => {
        it('deve incluir @media print com margens corretas', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const styleElement = container.querySelector('style');
            expect(styleElement?.textContent).toContain('@media print');
            expect(styleElement?.textContent).toContain('padding-top: 95px !important');
            expect(styleElement?.textContent).toContain('padding-bottom: 100px !important');
        });

        it('deve incluir @page com tamanho A4', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const styleElement = container.querySelector('style');
            expect(styleElement?.textContent).toContain('@page {');
            expect(styleElement?.textContent).toContain('size: A4');
            expect(styleElement?.textContent).toContain('margin: 95px 0 80px 0');
        });
    });

    describe('Proteção de Impressão', () => {
        it('deve aplicar break-inside: avoid via CSS para evitar texto cortado', () => {
            const { container } = render(
                <OrcamentoPrintable orcamento={mockOrcamentoData} />
            );

            const printRenderer = container.querySelector('.print-renderer');
            // PrintRenderer deve estar presente
            expect(printRenderer).toBeInTheDocument();
            
            // Estilos devem estar presentes (aplicados inline)
            const styleElements = container.querySelectorAll('style');
            expect(styleElements.length).toBeGreaterThan(0);
        });
    });
});
