/**
 * Testes Unitários para PDFOrcamentoService
 * 
 * Para rodar os testes:
 * npm test -- pdfOrcamento.service.test.ts
 */

// Mock do Prisma Client ANTES de importar qualquer coisa
const mockFindUnique = jest.fn();

jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn(() => ({
            orcamento: {
                findUnique: mockFindUnique,
            },
        })),
    };
});

// Importar o serviço DEPOIS do mock
import { PDFOrcamentoService } from './pdfOrcamento.service';

// Mock do Puppeteer
jest.mock('puppeteer', () => ({
    launch: jest.fn(() => ({
        newPage: jest.fn(() => ({
            setRequestInterception: jest.fn(),
            setContent: jest.fn(),
            pdf: jest.fn(() => Buffer.from('mock-pdf-content')),
        })),
        close: jest.fn(),
    })),
}));

describe('PDFOrcamentoService', () => {
    const mockOrcamento = {
        id: 'test-id',
        numeroSequencial: 123,
        titulo: 'Teste Orçamento',
        validade: new Date('2025-12-31'),
        createdAt: new Date('2025-01-01'),
        clienteId: 'cliente-id',
        cliente: {
            id: 'cliente-id',
            nome: 'EMPRESA TESTE LTDA',
            email: 'teste@empresa.com',
            cpfCnpj: '12345678000100',
            telefone: '(47) 99999-9999',
            endereco: 'Rua Teste, 123',
        },
        items: [
            {
                id: 'item-1',
                tipo: 'MATERIAL',
                quantidade: 10,
                precoUnit: 100,
                subtotal: 1000,
                descricao: 'Material Teste',
                material: {
                    nome: 'Material Teste',
                },
            },
        ],
        enderecoObra: 'Rua Obra, 456',
        cidade: 'Itajaí',
        bairro: 'Centro',
        cep: '88300-000',
        precoVenda: 1000,
        descontoValor: 0,
        impostoPercentual: 0,
        condicaoPagamento: 'À Vista',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Configurar o mock para retornar o orçamento por padrão
        mockFindUnique.mockResolvedValue(mockOrcamento);
    });

    describe('gerarHTMLOrcamento', () => {
        it('deve gerar HTML válido com estrutura de página A4', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toBeDefined();
            expect(typeof html).toBe('string');
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<html');
            expect(html).toContain('.page-content');
            expect(html).toContain('padding-top: 95px');
            expect(html).toContain('padding-bottom: 100px');
        });

        it('deve incluir número sequencial no formato correto', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('ORÇAMENTO: 123');
            expect(html).toContain('font-size: 14px');
        });

        it('deve incluir dados do cliente corretamente', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('EMPRESA TESTE LTDA');
            expect(html).toContain('teste@empresa.com');
            expect(html).toContain('12345678000100');
        });

        it('deve incluir folha timbrada quando fornecida', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const marcaDaguaConfig = {
                tipo: 'template' as const,
                folhaTimbradaUrl: 'https://example.com/folha.png',
            };

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id', marcaDaguaConfig);

            expect(html).toContain('custom-letterhead');
            expect(html).toContain('https://example.com/folha.png');
        });

        it('deve aplicar margens corretas em @media print', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('@media print');
            expect(html).toContain('padding-top: 95px !important');
            expect(html).toContain('padding-bottom: 100px !important');
        });

        it('deve incluir itens do orçamento na tabela', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('Itens do Orçamento');
            expect(html).toContain('Material Teste');
            expect(html).toContain('10.00');
            expect(html).toContain('R$ 100,00');
        });

        it('deve lançar erro quando orçamento não for encontrado', async () => {
            mockFindUnique.mockResolvedValue(null);

            await expect(
                PDFOrcamentoService.gerarHTMLOrcamento('id-nao-existe')
            ).rejects.toThrow('Orçamento não encontrado');
        });

        it('deve incluir descrição técnica quando presente', async () => {
            const orcamentoComDescricao = {
                ...mockOrcamento,
                descricaoProjeto: '<p>Descrição técnica do projeto</p>',
            };

            mockFindUnique.mockResolvedValue(orcamentoComDescricao);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('Descrição Técnica do Projeto');
            expect(html).toContain('Descrição técnica do projeto');
        });

        it('deve incluir marca d\'água quando configurada', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const marcaDaguaConfig = {
                tipo: 'template' as const,
                opacidade: 0.05,
            };

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id', marcaDaguaConfig);

            expect(html).toContain('watermark-background');
            expect(html).toContain('opacity: 0.05');
        });
    });

    describe('Estrutura CSS para paginação', () => {
        it('deve incluir CSS para page-content com margens corretas', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('.page-content {');
            expect(html).toContain('padding-top: 95px');
            expect(html).toContain('padding-bottom: 100px');
            expect(html).toContain('padding-left: 20px');
            expect(html).toContain('padding-right: 20px');
        });

        it('deve incluir @page com tamanho A4', async () => {
            mockFindUnique.mockResolvedValue(mockOrcamento);

            const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id');

            expect(html).toContain('@page {');
            expect(html).toContain('size: A4');
            expect(html).toContain('margin: 0');
        });
    });
});
