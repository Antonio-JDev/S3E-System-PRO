/**
 * Testes Unitários para PDFOrcamentoService com pdfmake
 */

const mockFindUnique = jest.fn();

jest.mock('../lib/prisma', () => ({
  prisma: {
    orcamento: {
      findUnique: mockFindUnique,
    },
  },
}));

import { PDFOrcamentoService } from './pdfOrcamento.service';

describe('PDFOrcamentoService (pdfmake)', () => {
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
    condicaoPagamento: '30 dias',
    descricao: '<p>Escopo do serviço de teste com <b>negrito</b></p>',
    descricaoProjeto: '<p>Especificação técnica detalhada</p>',
    observacoes: '<p>Observação teste</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve gerar PDF com sucesso via pdfmake', async () => {
    mockFindUnique.mockResolvedValue(mockOrcamento);

    const pdfBuffer = await PDFOrcamentoService.gerarPDF('test-id');

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // Verifica header do formato PDF "%PDF-"
    expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });

  it('deve lançar erro se o orçamento não for encontrado', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(PDFOrcamentoService.gerarPDF('inexistente')).rejects.toThrow(
      'Orçamento não encontrado'
    );
  });

  it('gera PDF válido com timbre PNG, HTML rico e imagem externa que não pode ser embutida', async () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    mockFindUnique.mockResolvedValue({
      ...mockOrcamento,
      descricaoProjeto:
        '<p>Técnica <b>negrito</b></p><div class="page-break"></div><ul><li>Lista</li></ul><img src="https://externo.invalid/x.png" /><table><tr><td colspan="2">Tabela</td></tr></table>',
    });

    const pdfBuffer = await PDFOrcamentoService.gerarPDF('test-id', {
      folhaTimbradaUrl: png,
      opacidade: 0.1,
    });

    expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
    expect(pdfBuffer.length).toBeGreaterThan(500);
  });

  it('não derruba a geração quando a folha timbrada é webp inválido', async () => {
    mockFindUnique.mockResolvedValue(mockOrcamento);

    const pdfBuffer = await PDFOrcamentoService.gerarPDF('test-id', {
      folhaTimbradaUrl: 'data:image/webp;base64,AAAA',
      opacidade: 0.05,
    });

    expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
  });

  it('preview HTML inclui descrição técnica e a folha timbrada', async () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    mockFindUnique.mockResolvedValue(mockOrcamento);

    const html = await PDFOrcamentoService.gerarHTMLOrcamento('test-id', {
      folhaTimbradaUrl: png,
      opacidade: 0.08,
    });

    expect(html).not.toContain('Descrição Técnica do Projeto');
    expect(html).toContain('Especificação técnica detalhada');
    expect(html).toContain('letterhead-img');
    expect(html).toContain('data:image/png');
  });
});
