/**
 * Templates e utilitários para importação/exportação de dados
 * Para migração de dados do sistema antigo para o novo
 */

// ==================== TEMPLATES ====================

export interface OrcamentoTemplate {
  clienteId?: string;
  clienteNome?: string; // Para busca/associação
  titulo: string;
  descricao?: string;
  descricaoProjeto?: string;
  validade: string; // ISO date string
  status?: 'Pendente' | 'Aprovado' | 'Recusado';
  bdi?: number;
  observacoes?: string;
  empresaCNPJ?: string;
  enderecoObra?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  responsavelObra?: string;
  previsaoInicio?: string;
  previsaoTermino?: string;
  descontoValor?: number;
  impostoPercentual?: number;
  condicaoPagamento?: string;
  items: Array<{
    tipo: 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO';
    materialId?: string;
    materialNome?: string; // Para busca/associação
    kitId?: string;
    kitNome?: string;
    servicoId?: string;
    servicoNome?: string;
    quadroId?: string;
    quadroNome?: string;
    cotacaoId?: string;
    cotacaoNome?: string;
    nome: string;
    descricao?: string;
    unidadeMedida: string;
    quantidade: number;
    custoUnit?: number;
    precoUnit?: number;
    subtotal?: number;
  }>;
}

export interface VendaItemTemplate {
  tipo: 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO';
  materialId?: string;
  materialNome?: string; // Para busca/associação
  kitId?: string;
  kitNome?: string;
  servicoId?: string;
  servicoNome?: string;
  quadroId?: string;
  quadroNome?: string;
  cotacaoId?: string;
  cotacaoNome?: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidade: number;
  custoUnit?: number;
  precoUnit: number; // Valor unitário
  subtotal: number; // quantidade * precoUnit
}

export interface VendaTemplate {
  orcamentoId?: string;
  orcamentoNumero?: string; // Para busca/associação
  clienteId?: string;
  clienteNome?: string; // Para busca/associação
  formaPagamento: string;
  numeroParcelas: number;
  dataVenda: string; // ISO date string
  dataVencimentoPrimeiraParcela?: string; // ISO date string
  observacoes?: string;
  valorTotal?: number; // Total da venda (soma dos subtotais + frete - desconto)
  valorFrete?: number; // Custo de frete
  valorDesconto?: number; // Valor de desconto
  items?: VendaItemTemplate[]; // Itens (materiais/serviços) da venda
}

export interface MaterialTemplate {
  codigo: string;
  descricao: string;
  unidade: string;
  preco: number;
  estoque: number;
  estoqueMinimo?: number;
  categoria?: string;
  fornecedorId?: string;
  fornecedorNome?: string; // Para busca/associação
  ativo?: boolean;
}

export interface ClienteTemplate {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo: 'PF' | 'PJ';
  ativo?: boolean;
}

export interface ImportExportData {
  version: string;
  exportDate: string;
  orcamentos?: OrcamentoTemplate[];
  vendas?: VendaTemplate[];
  materiais?: MaterialTemplate[];
  clientes?: ClienteTemplate[];
}

/**
 * Gerar template vazio para exportação
 */
export function generateEmptyTemplate(type: 'orcamentos' | 'vendas' | 'materiais' | 'clientes'): ImportExportData {
  const base = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
  };

  switch (type) {
    case 'orcamentos':
      return {
        ...base,
        orcamentos: [],
      };
    case 'vendas':
      return {
        ...base,
        vendas: [],
      };
    case 'materiais':
      return {
        ...base,
        materiais: [],
      };
    case 'clientes':
      return {
        ...base,
        clientes: [],
      };
    default:
      return base;
  }
}

/**
 * Gerar template com exemplo para referência
 */
export function generateExampleTemplate(type: 'orcamentos' | 'vendas' | 'materiais' | 'clientes'): ImportExportData {
  const exampleDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  switch (type) {
    case 'orcamentos':
      return {
        version: '1.0.0',
        exportDate: exampleDate,
        orcamentos: [
          {
            clienteNome: 'Cliente Exemplo',
            titulo: 'Orçamento de Exemplo',
            descricao: 'Descrição do orçamento',
            descricaoProjeto: 'Descrição do projeto',
            validade: futureDate,
            status: 'Pendente',
            bdi: 20,
            enderecoObra: 'Rua Exemplo, 123',
            cidade: 'Cidade',
            bairro: 'Bairro',
            cep: '12345-678',
            condicaoPagamento: 'À Vista',
            items: [
              {
                tipo: 'MATERIAL',
                materialNome: 'Material Exemplo',
                nome: 'Material Exemplo',
                unidadeMedida: 'UN',
                quantidade: 10,
                custoUnit: 100,
                precoUnit: 120,
                subtotal: 1200,
              },
            ],
          },
        ],
      };
    case 'vendas':
      return {
        version: '1.0.0',
        exportDate: exampleDate,
        vendas: [
          {
            orcamentoNumero: '1',
            clienteNome: 'Cliente Exemplo',
            formaPagamento: 'Dinheiro',
            numeroParcelas: 1,
            dataVenda: exampleDate,
            observacoes: 'Venda exemplo',
            valorFrete: 0,
            valorDesconto: 0,
            items: [
              {
                tipo: 'MATERIAL',
                materialNome: 'Material Exemplo',
                nome: 'Material Exemplo',
                descricao: 'Descrição do material',
                unidadeMedida: 'UN',
                quantidade: 10,
                custoUnit: 50,
                precoUnit: 75,
                subtotal: 750,
              },
              {
                tipo: 'SERVICO',
                servicoNome: 'Serviço Exemplo',
                nome: 'Instalação Elétrica',
                descricao: 'Descrição do serviço',
                unidadeMedida: 'h',
                quantidade: 8,
                custoUnit: 30,
                precoUnit: 60,
                subtotal: 480,
              },
            ],
            valorTotal: 1230, // Soma dos subtotais: 750 + 480 + 0 (frete) - 0 (desconto)
          },
        ],
      };
    case 'materiais':
      return {
        version: '1.0.0',
        exportDate: exampleDate,
        materiais: [
          {
            codigo: 'MAT001',
            descricao: 'Material Exemplo',
            unidade: 'UN',
            preco: 100,
            estoque: 50,
            estoqueMinimo: 10,
            categoria: 'Categoria Exemplo',
            fornecedorNome: 'Fornecedor Exemplo',
            ativo: true,
          },
        ],
      };
    case 'clientes':
      return {
        version: '1.0.0',
        exportDate: exampleDate,
        clientes: [
          {
            nome: 'EMPRESA EXEMPLO LTDA',
            cpfCnpj: '12.345.678/0001-90',
            email: 'contato@empresaexemplo.com.br',
            telefone: '(47) 3333-4444',
            endereco: 'Rua Exemplo, 123',
            cidade: 'Itajaí',
            estado: 'SC',
            cep: '88300-000',
            tipo: 'PJ',
            ativo: true,
          },
          {
            nome: 'João da Silva',
            cpfCnpj: '123.456.789-00',
            email: 'joao.silva@email.com',
            telefone: '(47) 99999-8888',
            endereco: 'Avenida Principal, 456',
            cidade: 'Florianópolis',
            estado: 'SC',
            cep: '88000-000',
            tipo: 'PF',
            ativo: true,
          },
        ],
      };
    default:
      return generateEmptyTemplate(type);
  }
}

/**
 * Exportar dados como JSON para download
 */
export function exportToJSON(data: ImportExportData, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ler arquivo JSON
 */
export function readJSONFile(file: File): Promise<ImportExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json as ImportExportData);
      } catch (error) {
        reject(new Error('Arquivo JSON inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

/**
 * Validar estrutura do template importado
 */
export function validateImportData(data: ImportExportData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.version || !data.exportDate) {
    errors.push('Estrutura básica inválida: faltam campos version ou exportDate');
  }

  if (data.orcamentos) {
    data.orcamentos.forEach((orc, index) => {
      if (!orc.titulo) errors.push(`Orçamento ${index + 1}: campo 'titulo' é obrigatório`);
      if (!orc.validade) errors.push(`Orçamento ${index + 1}: campo 'validade' é obrigatório`);
      if (!orc.items || !Array.isArray(orc.items) || orc.items.length === 0) {
        errors.push(`Orçamento ${index + 1}: deve ter pelo menos um item`);
      }
    });
  }

  if (data.vendas) {
    data.vendas.forEach((venda, index) => {
      if (!venda.formaPagamento) errors.push(`Venda ${index + 1}: campo 'formaPagamento' é obrigatório`);
      if (!venda.numeroParcelas) errors.push(`Venda ${index + 1}: campo 'numeroParcelas' é obrigatório`);
      if (!venda.dataVenda) errors.push(`Venda ${index + 1}: campo 'dataVenda' é obrigatório`);
      // Validar itens se existirem
      if (venda.items && Array.isArray(venda.items)) {
        venda.items.forEach((item, itemIndex) => {
          if (!item.nome) errors.push(`Venda ${index + 1}, Item ${itemIndex + 1}: campo 'nome' é obrigatório`);
          if (!item.unidadeMedida) errors.push(`Venda ${index + 1}, Item ${itemIndex + 1}: campo 'unidadeMedida' é obrigatório`);
          if (item.quantidade === undefined || item.quantidade === null) {
            errors.push(`Venda ${index + 1}, Item ${itemIndex + 1}: campo 'quantidade' é obrigatório`);
          }
          if (item.precoUnit === undefined || item.precoUnit === null) {
            errors.push(`Venda ${index + 1}, Item ${itemIndex + 1}: campo 'precoUnit' é obrigatório`);
          }
          if (item.subtotal === undefined || item.subtotal === null) {
            errors.push(`Venda ${index + 1}, Item ${itemIndex + 1}: campo 'subtotal' é obrigatório`);
          }
        });
      }
    });
  }

  if (data.materiais) {
    data.materiais.forEach((mat, index) => {
      if (!mat.codigo) errors.push(`Material ${index + 1}: campo 'codigo' é obrigatório`);
      if (!mat.descricao) errors.push(`Material ${index + 1}: campo 'descricao' é obrigatório`);
      if (!mat.unidade) errors.push(`Material ${index + 1}: campo 'unidade' é obrigatório`);
      if (mat.preco === undefined || mat.preco === null) {
        errors.push(`Material ${index + 1}: campo 'preco' é obrigatório`);
      }
      if (mat.estoque === undefined || mat.estoque === null) {
        errors.push(`Material ${index + 1}: campo 'estoque' é obrigatório`);
      }
    });
  }

  if (data.clientes) {
    data.clientes.forEach((cliente, index) => {
      if (!cliente.nome) errors.push(`Cliente ${index + 1}: campo 'nome' é obrigatório`);
      if (!cliente.cpfCnpj) errors.push(`Cliente ${index + 1}: campo 'cpfCnpj' é obrigatório`);
      if (!cliente.email) errors.push(`Cliente ${index + 1}: campo 'email' é obrigatório`);
      if (!cliente.telefone) errors.push(`Cliente ${index + 1}: campo 'telefone' é obrigatório`);
      if (!cliente.tipo || !['PF', 'PJ'].includes(cliente.tipo)) {
        errors.push(`Cliente ${index + 1}: campo 'tipo' deve ser 'PF' ou 'PJ'`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

