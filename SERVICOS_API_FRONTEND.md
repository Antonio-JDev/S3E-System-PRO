# Serviços de API - Frontend

Este documento descreve todos os serviços de API disponíveis no frontend para conectar com os endpoints do backend.

## 📁 Estrutura de Serviços

Todos os serviços estão localizados em `/frontend/src/services/` e podem ser importados de forma centralizada:

```typescript
import { 
  authService, 
  materiaisService, 
  vendasService,
  // ... outros serviços
} from '@/services';
```

## 🔐 Autenticação

### AuthService (`authService`)

**Arquivo:** `authService.ts`

```typescript
// Login
await authService.login({ email, password });

// Registro
await authService.register({ nome, email, password, role });

// Perfil do usuário
await authService.getProfile();

// Logout
await authService.logout();
```

## 📦 Estoque e Materiais

### MateriaisService (`materiaisService`)

**Arquivo:** `materiaisService.ts`

```typescript
// Listar materiais
await materiaisService.listarMateriais({ search, categoria, ativo });

// Buscar por ID
await materiaisService.buscarMaterialPorId(id);

// Criar material
await materiaisService.criarMaterial(data);

// Atualizar material
await materiaisService.atualizarMaterial(id, data);

// Deletar material
await materiaisService.deletarMaterial(id);

// Registrar movimentação
await materiaisService.registrarMovimentacao({ materialId, tipo, quantidade });

// Listar movimentações
await materiaisService.listarMovimentacoes({ materialId, tipo, dataInicio, dataFim });
```

### MovimentacoesService (`movimentacoesService`)

**Arquivo:** `movimentacoesService.ts`

Serviço existente para movimentações de estoque.

## 🛒 Compras e Orçamentos

### ComprasService (`comprasService`)

**Arquivo:** `comprasService.ts`

```typescript
// Listar compras
await comprasService.listarCompras({ fornecedorId, status, dataInicio, dataFim });

// Criar compra
await comprasService.criarCompra({
  fornecedorId,
  dataCompra,
  itens: [{ materialId, quantidade, precoUnitario }]
});

// Atualizar status
await comprasService.atualizarStatusCompra(id, { status, dataRecebimento });

// Parse XML
await comprasService.parseXML(xmlData);
```

### OrcamentosService (`orcamentosService`)

**Arquivo:** `orcamentosService.ts`

```typescript
// Listar orçamentos
await orcamentosService.listarOrcamentos({ clienteId, status });

// Buscar por ID
await orcamentosService.buscarOrcamentoPorId(id);

// Criar orçamento
await orcamentosService.criarOrcamento({
  numero,
  clienteId,
  dataEmissao,
  dataValidade,
  itens: [{ descricao, quantidade, precoUnitario }]
});

// Atualizar status
await orcamentosService.atualizarStatusOrcamento(id, { status });
```

## 💰 Vendas e Financeiro

### VendasService (`vendasService`)

**Arquivo:** `vendasService.ts`

```typescript
// Dashboard financeiro
await vendasService.getDashboard({ mes, ano });

// Verificar estoque
await vendasService.verificarEstoque(orcamentoId);

// Listar vendas
await vendasService.listarVendas({ clienteId, status, page, limit });

// Buscar venda
await vendasService.buscarVenda(id);

// Realizar venda
await vendasService.realizarVenda({
  orcamentoId,
  dataVenda,
  desconto,
  parcelamento: { numeroParcelas, formaPagamento, dataVencimento }
});

// Cancelar venda
await vendasService.cancelarVenda(id, observacao);

// Pagar conta a receber
await vendasService.pagarConta(contaId, {
  dataPagamento,
  valorPago,
  formaPagamento
});
```

### ContasPagarService (`contasPagarService`)

**Arquivo:** `contasPagarService.ts`

```typescript
// Criar conta única
await contasPagarService.criarConta({
  fornecedorId,
  descricao,
  valor,
  dataVencimento,
  categoria
});

// Criar contas parceladas
await contasPagarService.criarContasParceladas({
  fornecedorId,
  descricao,
  valorTotal,
  numeroParcelas,
  dataVencimentoPrimeiraParcela,
  categoria
});

// Listar contas
await contasPagarService.listarContas({ fornecedorId, status, categoria });

// Buscar conta
await contasPagarService.buscarConta(id);

// Pagar conta
await contasPagarService.pagarConta(id, {
  dataPagamento,
  formaPagamento
});

// Cancelar conta
await contasPagarService.cancelarConta(id, observacao);

// Atualizar vencimento
await contasPagarService.atualizarVencimento(id, {
  novaDataVencimento
});

// Alertas
await contasPagarService.getContasEmAtraso();
await contasPagarService.getContasAVencer(dias);
```

## 📊 Relatórios

### RelatoriosService (`relatoriosService`)

**Arquivo:** `relatoriosService.ts`

```typescript
// Dashboard completo
await relatoriosService.getDashboardCompleto({ dataInicio, dataFim });

// Dados financeiros mensais
await relatoriosService.getDadosFinanceiros({ ano, meses });

// Resumo financeiro
await relatoriosService.getResumoFinanceiro({ dataInicio, dataFim });

// Estatísticas de vendas
await relatoriosService.getEstatisticasVendas({ dataInicio, dataFim });

// Top clientes
await relatoriosService.getTopClientes({ limite, dataInicio, dataFim });
```

## 🏢 Fiscal

### ConfigFiscalService (`configFiscalService`)

**Arquivo:** `configFiscalService.ts`

```typescript
// Listar configurações
await configFiscalService.listarConfiguracoes({ empresaId, ncm, ativo });

// Buscar por ID
await configFiscalService.buscarConfiguracaoPorId(id);

// Criar configuração
await configFiscalService.criarConfiguracao({
  empresaId,
  ncm,
  descricao,
  cfop,
  aliquotaIcms,
  aliquotaIpi,
  aliquotaPis,
  aliquotaCofins,
  cst
});

// Atualizar configuração
await configFiscalService.atualizarConfiguracao(id, data);

// Deletar configuração
await configFiscalService.deletarConfiguracao(id);
```

### NFEService (`nfeService`)

**Arquivo:** `nfeService.ts`

Serviço existente para emissão de notas fiscais.

## 👷 Obras e Equipes

### AlocacoesService (`alocacoesService`)

**Arquivo:** `alocacoesService.ts`

```typescript
// === EQUIPES ===

// Criar equipe
await alocacoesService.criarEquipe({
  nome,
  responsavel,
  especialidade,
  capacidadeMaxima
});

// Listar equipes
await alocacoesService.listarEquipes({ todas: true });

// Equipes disponíveis
await alocacoesService.getEquipesDisponiveis({
  dataInicio,
  dataFim
});

// Buscar equipe
await alocacoesService.buscarEquipe(id);

// Atualizar equipe
await alocacoesService.atualizarEquipe(id, data);

// Desativar equipe
await alocacoesService.desativarEquipe(id);

// === ALOCAÇÕES ===

// Alocar equipe
await alocacoesService.alocarEquipe({
  equipeId,
  projetoId,
  dataInicio,
  dataFim
});

// Listar alocações
await alocacoesService.listarAlocacoes({ equipeId, projetoId, status });

// Alocações para calendário
await alocacoesService.getAlocacoesCalendario({ mes, ano });

// Buscar alocação
await alocacoesService.buscarAlocacao(id);

// Atualizar alocação
await alocacoesService.atualizarAlocacao(id, data);

// Iniciar alocação
await alocacoesService.iniciarAlocacao(id);

// Concluir alocação
await alocacoesService.concluirAlocacao(id);

// Cancelar alocação
await alocacoesService.cancelarAlocacao(id, observacao);

// Estatísticas
await alocacoesService.getEstatisticas();
```

### EquipesService (`equipesService`)

**Arquivo:** `equipesService.ts`

```typescript
// Listar equipes
await equipesService.listarEquipes({ ativa, especialidade });

// Estatísticas
await equipesService.getEstatisticas();

// Equipes disponíveis
await equipesService.buscarEquipesDisponiveis({ dataInicio, dataFim });

// Buscar por ID
await equipesService.buscarEquipePorId(id);

// Criar equipe
await equipesService.criarEquipe({
  nome,
  responsavel,
  especialidade,
  capacidadeMaxima
});

// Atualizar equipe
await equipesService.atualizarEquipe(id, data);

// Desativar equipe
await equipesService.desativarEquipe(id);

// Adicionar membro
await equipesService.adicionarMembro(equipeId, {
  nome,
  funcao,
  contato
});

// Remover membro
await equipesService.removerMembro(equipeId, membroId);
```

## 💵 Comparação de Preços

### ComparacaoPrecosService (`comparacaoPrecosService`)

**Arquivo:** `comparacaoPrecosService.ts`

```typescript
// Upload CSV
await comparacaoPrecosService.uploadCSV(file);

// Validar CSV
await comparacaoPrecosService.validarCSV(file);

// Histórico de preços
await comparacaoPrecosService.buscarHistoricoPrecos(codigo);

// Atualizar preços
await comparacaoPrecosService.atualizarPrecos({
  atualizacoes: [
    { codigoMaterial, novoPreco, fornecedor }
  ]
});
```

## 📄 PDF

### PdfService (`pdfService`)

**Arquivo:** `pdfService.ts`

```typescript
// Verificar orçamento
await pdfService.verificarOrcamento(orcamentoId);

// Download PDF
await pdfService.downloadPDF(orcamentoId, 'nome_arquivo.pdf');

// Visualizar PDF
await pdfService.viewPDF(orcamentoId);

// Gerar URL do PDF
await pdfService.gerarOrcamentoPDFURL(orcamentoId);
```

## 👥 Cadastros Básicos

### ClientesService (`clientesService`)

**Arquivo:** `clientesService.ts`

Serviço existente para gerenciamento de clientes.

### FornecedoresService (`fornecedoresService`)

**Arquivo:** `fornecedoresService.ts`

Serviço existente para gerenciamento de fornecedores.

### EmpresasService (`empresasService`)

**Arquivo:** `empresasService.ts`

Serviço existente para gerenciamento de empresas.

## 🏗️ Projetos

### ProjetosService (`projetosService`)

**Arquivo:** `projetosService.ts`

Serviço existente para gerenciamento de projetos.

### ServicosService (`servicosService`)

**Arquivo:** `servicosService.ts`

Serviço existente para gerenciamento de serviços.

## 📋 Dashboard

### DashboardService (`dashboardService`)

**Arquivo:** `dashboardService.ts`

Serviço existente para dashboard principal.

## 📜 Histórico

### HistoricoService (`historicoService`)

**Arquivo:** `historicoService.ts`

Serviço existente para histórico de ações.

## 🔧 Configuração Base

### ApiService (`apiService`)

**Arquivo:** `api.ts`

Serviço base que fornece métodos HTTP genéricos:

```typescript
// GET
await apiService.get('/endpoint', { params });

// POST
await apiService.post('/endpoint', data);

// PUT
await apiService.put('/endpoint', data);

// DELETE
await apiService.delete('/endpoint');
```

## 📝 Tipos e Interfaces

Todos os serviços exportam suas interfaces TypeScript. Você pode importá-las assim:

```typescript
import { 
  Material, 
  CreateMaterialDto, 
  Venda,
  ContaPagar 
} from '@/services';
```

## 🌐 Endpoints

Todos os endpoints estão configurados em `/frontend/src/config/api.ts`:

```typescript
import { ENDPOINTS } from '@/config/api';

// Usar endpoints configurados
ENDPOINTS.MATERIAIS // '/api/materiais'
ENDPOINTS.VENDAS // '/api/vendas'
// ... etc
```

## 🔑 Autenticação

Todos os serviços utilizam automaticamente o token JWT armazenado no `localStorage`. O token é adicionado automaticamente aos headers das requisições pelo `ApiService`.

## ⚠️ Tratamento de Erros

Todos os serviços retornam respostas no formato:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

Exemplo de uso:

```typescript
const response = await materiaisService.listarMateriais();

if (response.success) {
  console.log('Dados:', response.data);
} else {
  console.error('Erro:', response.error);
}
```

## 📦 Resumo de Arquivos Criados

### Novos Serviços Criados:

1. ✅ `materiaisService.ts` - Gerenciamento de materiais e estoque
2. ✅ `comprasService.ts` - Gestão de compras
3. ✅ `orcamentosService.ts` - Gestão de orçamentos
4. ✅ `vendasService.ts` - Gestão de vendas e contas a receber
5. ✅ `contasPagarService.ts` - Gestão de contas a pagar
6. ✅ `relatoriosService.ts` - Relatórios e dashboard
7. ✅ `configFiscalService.ts` - Configurações fiscais
8. ✅ `alocacoesService.ts` - Alocações de equipes em obras
9. ✅ `comparacaoPrecosService.ts` - Comparação de preços
10. ✅ `equipesService.ts` - Gestão de equipes
11. ✅ `pdfService.ts` - Geração de PDFs

### Arquivos Atualizados:

1. ✅ `config/api.ts` - Endpoints atualizados
2. ✅ `services/index.ts` - Exportação centralizada (novo)

## 🎯 Próximos Passos

Para utilizar os serviços nos componentes React:

1. Importe o serviço necessário
2. Use dentro de funções async ou useEffect
3. Gerencie o estado com useState
4. Trate os erros adequadamente

Exemplo:

```typescript
import { useState, useEffect } from 'react';
import { materiaisService, type Material } from '@/services';

function MaterialList() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMateriais() {
      try {
        const response = await materiaisService.listarMateriais();
        if (response.success && response.data) {
          setMateriais(response.data);
        }
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadMateriais();
  }, []);

  return (
    <div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul>
          {materiais.map(material => (
            <li key={material.id}>{material.descricao}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## 📚 Documentação Adicional

- Veja `FRONTEND_BACKEND_INTEGRATION.md` para mais detalhes sobre integração
- Veja `GUIA_TESTES_COMPLETO.md` para testes dos endpoints
- Veja `EXEMPLOS_API.md` para exemplos práticos de uso
