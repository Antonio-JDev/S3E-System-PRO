# Guia Rápido - Services do Frontend

## 🚀 Como Usar os Services

### 📦 Importação

```typescript
// Importar service específico
import { vendasService } from '@/services/vendasService';

// OU importar múltiplos do index central
import { 
  vendasService, 
  materiaisService, 
  relatoriosService 
} from '@/services';
```

---

## 📚 Exemplos Práticos

### 1. Vendas

```typescript
import { vendasService } from '@/services';

// Listar todas as vendas
const listarVendas = async () => {
  const response = await vendasService.listarVendas({
    page: 1,
    limit: 10,
    status: 'Ativa'
  });
  
  if (response.success) {
    console.log('Vendas:', response.data.vendas);
    console.log('Total:', response.data.total);
  }
};

// Realizar nova venda
const realizarVenda = async () => {
  const response = await vendasService.realizarVenda({
    orcamentoId: 'orc-123',
    clienteId: 'cli-456',
    formaPagamento: 'PIX',
    numeroParcelas: 1,
    dataVencimentoPrimeiraParcela: '2024-01-15',
    observacoes: 'Venda à vista com desconto'
  });
  
  if (response.success) {
    console.log('Venda criada:', response.data);
  }
};

// Verificar estoque antes de vender
const verificarEstoque = async (orcamentoId: string) => {
  const response = await vendasService.verificarEstoque(orcamentoId);
  
  if (response.success && response.data.disponivel) {
    console.log('✅ Estoque disponível!');
  } else {
    console.log('❌ Itens indisponíveis:', response.data.itensIndisponiveis);
  }
};
```

### 2. Materiais e Estoque

```typescript
import { materiaisService } from '@/services';

// Listar materiais
const listarMateriais = async () => {
  const response = await materiaisService.getMateriais({
    categoria: 'Elétrico',
    ativo: true
  });
  
  if (response.success) {
    console.log('Materiais:', response.data);
  }
};

// Criar novo material
const criarMaterial = async () => {
  const response = await materiaisService.createMaterial({
    codigo: 'MAT-001',
    descricao: 'Cabo Flex 2.5mm',
    unidade: 'Metro',
    preco: 3.50,
    estoque: 1000,
    estoqueMinimo: 100,
    categoria: 'Elétrico'
  });
  
  if (response.success) {
    console.log('Material criado:', response.data);
  }
};

// Registrar movimentação (entrada/saída)
const movimentarEstoque = async () => {
  const response = await materiaisService.registrarMovimentacao({
    materialId: 'mat-123',
    tipo: 'ENTRADA',
    quantidade: 500,
    motivoMovimentacao: 'Compra de fornecedor',
    observacoes: 'NF 12345'
  });
  
  if (response.success) {
    console.log('Movimentação registrada:', response.data);
  }
};
```

### 3. Orçamentos

```typescript
import { orcamentosService } from '@/services';

// Criar orçamento
const criarOrcamento = async () => {
  const response = await orcamentosService.createOrcamento({
    clienteId: 'cli-123',
    projetoId: 'proj-456',
    validade: '2024-12-31',
    observacoes: 'Orçamento com 10% de desconto',
    itens: [
      {
        materialId: 'mat-001',
        quantidade: 100,
        precoUnitario: 3.50
      },
      {
        materialId: 'mat-002',
        quantidade: 50,
        precoUnitario: 12.00
      }
    ]
  });
  
  if (response.success) {
    console.log('Orçamento criado:', response.data);
  }
};

// Atualizar status
const aprovarOrcamento = async (id: string) => {
  const response = await orcamentosService.updateOrcamentoStatus(id, 'Aprovado');
  
  if (response.success) {
    console.log('Orçamento aprovado!');
  }
};
```

### 4. Compras

```typescript
import { comprasService } from '@/services';

// Criar compra
const criarCompra = async () => {
  const response = await comprasService.createCompra({
    fornecedorId: 'forn-123',
    dataEntregaPrevista: '2024-02-01',
    notaFiscal: 'NF-12345',
    itens: [
      {
        materialId: 'mat-001',
        quantidade: 1000,
        precoUnitario: 3.20
      }
    ]
  });
  
  if (response.success) {
    console.log('Compra criada:', response.data);
  }
};

// Parse de XML de NF-e
const importarNotaFiscal = async (file: File) => {
  try {
    const result = await comprasService.parseXML(file);
    
    console.log('Fornecedor:', result.fornecedor);
    console.log('Itens:', result.itens);
    console.log('Valor Total:', result.valorTotal);
  } catch (error) {
    console.error('Erro ao processar XML:', error);
  }
};
```

### 5. Contas a Pagar

```typescript
import { contasPagarService } from '@/services';

// Criar conta única
const criarConta = async () => {
  const response = await contasPagarService.criarConta({
    fornecedorId: 'forn-123',
    descricao: 'Aluguel - Janeiro/2024',
    valor: 2500.00,
    dataVencimento: '2024-01-10',
    categoria: 'Aluguel'
  });
  
  if (response.success) {
    console.log('Conta criada:', response.data);
  }
};

// Criar contas parceladas
const criarContasParceladas = async () => {
  const response = await contasPagarService.criarContasParceladas({
    fornecedorId: 'forn-456',
    descricao: 'Equipamento XYZ',
    valorTotal: 12000.00,
    numeroParcelas: 6,
    dataVencimentoPrimeiraParcela: '2024-02-01',
    categoria: 'Equipamentos'
  });
  
  if (response.success) {
    console.log('Contas criadas:', response.data.contas);
  }
};

// Pagar conta
const pagarConta = async (id: string) => {
  const response = await contasPagarService.pagarConta(id, {
    dataPagamento: '2024-01-10',
    observacoes: 'Pago via PIX'
  });
  
  if (response.success) {
    console.log('Conta paga!');
  }
};

// Buscar contas em atraso
const verificarAtrasos = async () => {
  const response = await contasPagarService.getContasEmAtraso();
  
  if (response.success) {
    console.log('⚠️ Contas atrasadas:', response.data);
  }
};
```

### 6. Relatórios e Dashboard

```typescript
import { relatoriosService } from '@/services';

// Dashboard completo
const carregarDashboard = async () => {
  const response = await relatoriosService.getDashboardCompleto();
  
  if (response.success) {
    const { vendasMes, receitaMes, lucroMes, alertas } = response.data;
    console.log('Vendas do mês:', vendasMes);
    console.log('Receita:', receitaMes);
    console.log('Lucro:', lucroMes);
    console.log('Alertas:', alertas);
  }
};

// Dados financeiros para gráficos
const carregarGraficoFinanceiro = async () => {
  const response = await relatoriosService.getDadosFinanceiros({
    meses: 12
  });
  
  if (response.success) {
    // Dados prontos para Chart.js, Recharts, etc.
    response.data.forEach(mes => {
      console.log(mes.periodo, 'Receitas:', mes.receitas, 'Despesas:', mes.despesas);
    });
  }
};

// Top clientes
const topClientes = async () => {
  const response = await relatoriosService.getTopClientes({
    limite: 10,
    dataInicio: '2024-01-01',
    dataFim: '2024-12-31'
  });
  
  if (response.success) {
    response.data.forEach(cliente => {
      console.log(cliente.nome, 'Total:', cliente.valorTotal);
    });
  }
};
```

### 7. Equipes e Alocações

```typescript
import { alocacaoService, equipesService } from '@/services';

// Criar equipe
const criarEquipe = async () => {
  const response = await equipesService.criarEquipe({
    nome: 'Equipe Alpha',
    especialidade: 'Instalação Elétrica',
    lider: 'João Silva',
    membros: [
      { nome: 'Pedro Santos', funcao: 'Eletricista' },
      { nome: 'Maria Oliveira', funcao: 'Auxiliar' }
    ]
  });
  
  if (response.success) {
    console.log('Equipe criada:', response.data);
  }
};

// Alocar equipe a projeto
const alocarEquipe = async () => {
  const response = await alocacaoService.alocarEquipe({
    equipeId: 'eq-123',
    projetoId: 'proj-456',
    dataInicio: '2024-02-01',
    dataFim: '2024-02-15',
    observacoes: 'Instalação completa'
  });
  
  if (response.success) {
    console.log('Equipe alocada:', response.data);
  }
};

// Buscar alocações para calendário
const carregarCalendario = async () => {
  const response = await alocacaoService.getAlocacoesCalendario(2, 2024);
  
  if (response.success) {
    // Dados prontos para FullCalendar, react-big-calendar, etc.
    response.data.forEach(event => {
      console.log(event.title, event.start, event.end);
    });
  }
};
```

### 8. Comparação de Preços

```typescript
import { comparacaoPrecosService } from '@/services';

// Upload de CSV para comparação
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  try {
    const result = await comparacaoPrecosService.uploadCSV(file);
    console.log('Comparação concluída:', result);
  } catch (error) {
    console.error('Erro no upload:', error);
  }
};

// Validar CSV antes do upload
const validarArquivo = async (file: File) => {
  try {
    const result = await comparacaoPrecosService.validarCSV(file);
    
    if (result.valido) {
      console.log('✅ Arquivo válido!');
      console.log('Preview:', result.preview);
    } else {
      console.log('❌ Erros:', result.erros);
    }
  } catch (error) {
    console.error('Erro na validação:', error);
  }
};

// Buscar histórico de preços
const buscarHistorico = async (codigo: string) => {
  const response = await comparacaoPrecosService.buscarHistoricoPrecos(codigo);
  
  if (response.success) {
    response.data.forEach(historico => {
      console.log(historico.data, historico.preco, historico.fornecedor);
    });
  }
};
```

### 9. PDFs

```typescript
import { pdfService } from '@/services';

// Fazer download direto
const downloadPDF = async (orcamentoId: string) => {
  try {
    await pdfService.downloadOrcamentoPDF(
      orcamentoId, 
      `orcamento-${orcamentoId}.pdf`
    );
    console.log('✅ Download iniciado!');
  } catch (error) {
    console.error('Erro ao baixar PDF:', error);
  }
};

// Abrir em nova aba
const abrirPDF = async (orcamentoId: string) => {
  try {
    await pdfService.abrirOrcamentoPDF(orcamentoId);
    console.log('✅ PDF aberto em nova aba!');
  } catch (error) {
    console.error('Erro ao abrir PDF:', error);
  }
};

// Verificar se orçamento existe
const verificarOrcamento = async (id: string) => {
  const response = await pdfService.verificarOrcamento(id);
  
  if (response.success && response.data.existe) {
    console.log('✅ Orçamento encontrado:', response.data.orcamento);
  } else {
    console.log('❌ Orçamento não encontrado');
  }
};
```

### 10. Configurações Fiscais

```typescript
import { configFiscalService } from '@/services';

// Criar configuração fiscal
const criarConfigFiscal = async () => {
  const response = await configFiscalService.createConfiguracao({
    empresaId: 'emp-123',
    regime: 'SimplesNacional',
    aliquotaICMS: 7.0,
    aliquotaIPI: 0.0,
    aliquotaPIS: 0.65,
    aliquotaCOFINS: 3.0,
    aliquotaIR: 0.0,
    aliquotaCSLL: 0.0,
    ambienteNFe: 'Homologacao',
    serieNFe: 1,
    observacoes: 'Configuração para testes'
  });
  
  if (response.success) {
    console.log('Configuração criada:', response.data);
  }
};
```

---

## 🎯 Dicas de Uso

### 1. Tratamento de Erros

```typescript
const salvarVenda = async () => {
  try {
    const response = await vendasService.realizarVenda(dadosVenda);
    
    if (response.success) {
      // Sucesso
      toast.success('Venda realizada com sucesso!');
      navigate('/vendas');
    } else {
      // Erro retornado pela API
      toast.error(response.error || 'Erro ao realizar venda');
    }
  } catch (error) {
    // Erro de rede ou exceção
    console.error('Erro inesperado:', error);
    toast.error('Erro de conexão com o servidor');
  }
};
```

### 2. Loading States

```typescript
const [loading, setLoading] = useState(false);

const carregarDados = async () => {
  setLoading(true);
  try {
    const response = await vendasService.listarVendas();
    if (response.success) {
      setVendas(response.data.vendas);
    }
  } finally {
    setLoading(false);
  }
};
```

### 3. Uso em Componentes React

```tsx
import { useEffect, useState } from 'react';
import { vendasService } from '@/services';

function ListaVendas() {
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const carregarVendas = async () => {
      setLoading(true);
      try {
        const response = await vendasService.listarVendas();
        if (response.success) {
          setVendas(response.data.vendas);
        }
      } catch (error) {
        console.error('Erro ao carregar vendas:', error);
      } finally {
        setLoading(false);
      }
    };
    
    carregarVendas();
  }, []);
  
  if (loading) return <div>Carregando...</div>;
  
  return (
    <div>
      {vendas.map(venda => (
        <div key={venda.id}>{venda.id} - {venda.valorTotal}</div>
      ))}
    </div>
  );
}
```

---

## 📝 Referência Rápida

| Service | Endpoint Base | Principal Uso |
|---------|---------------|---------------|
| `vendasService` | `/api/vendas` | Vendas e contas a receber |
| `comprasService` | `/api/compras` | Compras e NF-e |
| `materiaisService` | `/api/materiais` | Estoque e materiais |
| `orcamentosService` | `/api/orcamentos` | Orçamentos |
| `contasPagarService` | `/api/contas-pagar` | Contas a pagar |
| `relatoriosService` | `/api/relatorios` | Relatórios e dashboards |
| `alocacaoService` | `/api/obras` | Alocações de equipes |
| `equipesService` | `/api/equipes` | Gestão de equipes |
| `comparacaoPrecosService` | `/api/comparacao-precos` | Comparação de preços |
| `pdfService` | `/api/pdf` | Geração de PDFs |
| `configFiscalService` | `/api/configuracoes-fiscais` | Configurações fiscais |

---

## 🔗 Links Úteis

- [Documentação Completa da Integração](./INTEGRACAO_COMPLETA_BACKEND_FRONTEND.md)
- [Arquitetura do Sistema](./ARCHITECTURE.md)
- [Guia de Autenticação](./ARQUITETURA_AUTENTICACAO.md)

---

**Última atualização:** 2025-10-27
