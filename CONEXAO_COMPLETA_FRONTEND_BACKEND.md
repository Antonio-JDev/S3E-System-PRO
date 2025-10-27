# Conexão Completa Frontend-Backend - S3E System

## 📋 Resumo

Todos os endpoints do backend foram conectados ao frontend através de services TypeScript dedicados. Foram criados **11 novos services** que se conectam aos endpoints REST do backend.

---

## 🎯 Services Implementados

### 1. **materiaisService.ts**
Gerenciamento completo de materiais e estoque.

**Endpoints disponíveis:**
- `getMateriais()` - Listar materiais com filtros
- `getMaterialById(id)` - Buscar material específico
- `createMaterial(data)` - Criar novo material
- `updateMaterial(id, data)` - Atualizar material
- `deleteMaterial(id)` - Deletar material
- `registrarMovimentacao(data)` - Registrar movimentação de estoque
- `getMovimentacoes()` - Buscar histórico de movimentações

**Exemplo de uso:**
```typescript
import { materiaisService } from '@/services';

// Listar materiais
const response = await materiaisService.getMateriais({
  search: 'cabo',
  ativo: true
});

// Registrar movimentação
await materiaisService.registrarMovimentacao({
  materialId: '123',
  tipo: 'entrada',
  quantidade: 100,
  motivo: 'Compra'
});
```

---

### 2. **comprasService.ts**
Gerenciamento de compras e integração com XML.

**Endpoints disponíveis:**
- `getCompras()` - Listar compras com filtros
- `createCompra(data)` - Criar nova compra
- `updateCompraStatus(id, data)` - Atualizar status da compra
- `parseXML(xmlContent)` - Parse de XML de nota fiscal

**Exemplo de uso:**
```typescript
import { comprasService } from '@/services';

// Criar compra
const response = await comprasService.createCompra({
  fornecedorId: '123',
  dataCompra: '2025-10-27',
  itens: [
    {
      materialId: '456',
      quantidade: 50,
      precoUnitario: 10.50
    }
  ]
});

// Parse XML
const parsed = await comprasService.parseXML(xmlContent);
```

---

### 3. **orcamentosService.ts**
Gerenciamento de orçamentos.

**Endpoints disponíveis:**
- `getOrcamentos()` - Listar orçamentos
- `getOrcamentoById(id)` - Buscar orçamento específico
- `createOrcamento(data)` - Criar novo orçamento
- `updateOrcamentoStatus(id, data)` - Atualizar status

**Exemplo de uso:**
```typescript
import { orcamentosService } from '@/services';

// Criar orçamento
const response = await orcamentosService.createOrcamento({
  clienteId: '123',
  data: '2025-10-27',
  validade: '2025-11-27',
  itens: [
    {
      descricao: 'Cabo 10mm',
      quantidade: 100,
      precoUnitario: 5.50
    }
  ]
});
```

---

### 4. **vendasService.ts**
Gerenciamento de vendas e contas a receber.

**Endpoints disponíveis:**
- `getDashboard()` - Dashboard de vendas
- `verificarEstoque(orcamentoId)` - Verificar disponibilidade
- `listarVendas()` - Listar vendas
- `buscarVenda(id)` - Buscar venda específica
- `realizarVenda(data)` - Realizar nova venda
- `cancelarVenda(id)` - Cancelar venda
- `pagarConta(id, data)` - Pagar conta a receber

**Exemplo de uso:**
```typescript
import { vendasService } from '@/services';

// Realizar venda
const response = await vendasService.realizarVenda({
  orcamentoId: '123',
  dataVenda: '2025-10-27',
  parcelas: [
    {
      numeroParcela: 1,
      dataVencimento: '2025-11-27',
      valor: 1000
    }
  ]
});

// Dashboard
const dashboard = await vendasService.getDashboard({
  dataInicio: '2025-10-01',
  dataFim: '2025-10-31'
});
```

---

### 5. **contasPagarService.ts**
Gerenciamento de contas a pagar.

**Endpoints disponíveis:**
- `criarConta(data)` - Criar conta única
- `criarContasParceladas(data)` - Criar contas parceladas
- `listarContas()` - Listar contas
- `buscarConta(id)` - Buscar conta específica
- `pagarConta(id, data)` - Pagar conta
- `cancelarConta(id)` - Cancelar conta
- `atualizarVencimento(id, data)` - Atualizar vencimento
- `getContasEmAtraso()` - Buscar contas atrasadas
- `getContasAVencer(dias)` - Buscar contas a vencer

**Exemplo de uso:**
```typescript
import { contasPagarService } from '@/services';

// Criar conta parcelada
const response = await contasPagarService.criarContasParceladas({
  fornecedorId: '123',
  descricao: 'Compra de materiais',
  valorTotal: 5000,
  numeroParcelas: 5,
  dataVencimentoPrimeiraParcela: '2025-11-27'
});

// Listar contas atrasadas
const atrasadas = await contasPagarService.getContasEmAtraso();
```

---

### 6. **relatoriosService.ts**
Relatórios e dashboards completos.

**Endpoints disponíveis:**
- `getDashboardCompleto()` - Dashboard completo do sistema
- `getDadosFinanceiros()` - Dados financeiros mensais
- `getResumoFinanceiro()` - Resumo financeiro geral
- `getEstatisticasVendas()` - Estatísticas de vendas
- `getTopClientes()` - Top clientes

**Exemplo de uso:**
```typescript
import { relatoriosService } from '@/services';

// Dashboard completo
const dashboard = await relatoriosService.getDashboardCompleto();

// Estatísticas de vendas
const stats = await relatoriosService.getEstatisticasVendas({
  dataInicio: '2025-01-01',
  dataFim: '2025-12-31'
});
```

---

### 7. **configFiscalService.ts**
Gerenciamento de configurações fiscais.

**Endpoints disponíveis:**
- `getConfiguracoes()` - Listar configurações
- `getConfiguracaoById(id)` - Buscar configuração específica
- `createConfiguracao(data)` - Criar configuração
- `updateConfiguracao(id, data)` - Atualizar configuração
- `deleteConfiguracao(id)` - Deletar configuração

**Exemplo de uso:**
```typescript
import { configFiscalService } from '@/services';

// Criar configuração fiscal
const response = await configFiscalService.createConfiguracao({
  empresaId: '123',
  ambiente: 'homologacao',
  regimeTributario: 'simples',
  serieNFe: '1',
  proximoNumeroNFe: 1
});
```

---

### 8. **obrasService.ts**
Gerenciamento de obras, equipes e alocações.

**Endpoints disponíveis:**

**Equipes:**
- `criarEquipe(data)` - Criar equipe
- `listarEquipes()` - Listar equipes
- `getEquipesDisponiveis(params)` - Buscar equipes disponíveis
- `buscarEquipe(id)` - Buscar equipe específica
- `atualizarEquipe(id, data)` - Atualizar equipe
- `desativarEquipe(id)` - Desativar equipe

**Alocações:**
- `alocarEquipe(data)` - Alocar equipe a projeto
- `listarAlocacoes()` - Listar alocações
- `getAlocacoesCalendario()` - Alocações para calendário
- `buscarAlocacao(id)` - Buscar alocação específica
- `atualizarAlocacao(id, data)` - Atualizar alocação
- `iniciarAlocacao(id)` - Iniciar alocação
- `concluirAlocacao(id)` - Concluir alocação
- `cancelarAlocacao(id)` - Cancelar alocação
- `getEstatisticas()` - Estatísticas gerais

**Exemplo de uso:**
```typescript
import { obrasService } from '@/services';

// Criar equipe
const equipe = await obrasService.criarEquipe({
  nome: 'Equipe Alpha',
  responsavel: 'João Silva',
  membros: ['João', 'Maria', 'Pedro'],
  especialidades: ['Elétrica', 'Hidráulica']
});

// Alocar equipe
const alocacao = await obrasService.alocarEquipe({
  equipeId: '123',
  projetoId: '456',
  dataInicio: '2025-11-01',
  dataFim: '2025-11-30'
});
```

---

### 9. **comparacaoPrecosService.ts**
Comparação de preços via upload de CSV.

**Endpoints disponíveis:**
- `uploadCSV(file)` - Upload e comparação de CSV
- `validarCSV(file)` - Validar estrutura do CSV
- `buscarHistoricoPrecos(codigo)` - Histórico de preços
- `atualizarPrecos(data)` - Atualizar preços em lote

**Exemplo de uso:**
```typescript
import { comparacaoPrecosService } from '@/services';

// Upload CSV
const file = event.target.files[0];
const resultado = await comparacaoPrecosService.uploadCSV(file);

// Atualizar preços
await comparacaoPrecosService.atualizarPrecos({
  atualizacoes: [
    { materialId: '123', precoNovo: 15.50 },
    { materialId: '456', precoNovo: 22.00 }
  ],
  fornecedor: 'Fornecedor XYZ'
});
```

---

### 10. **equipesService.ts**
Gerenciamento de equipes (alternativo ao obrasService).

**Endpoints disponíveis:**
- `listarEquipes()` - Listar equipes
- `getEstatisticas()` - Estatísticas de equipes
- `buscarEquipesDisponiveis()` - Buscar equipes disponíveis
- `buscarEquipePorId(id)` - Buscar equipe por ID
- `criarEquipe(data)` - Criar equipe
- `atualizarEquipe(id, data)` - Atualizar equipe
- `desativarEquipe(id)` - Desativar equipe
- `adicionarMembro(id, membro)` - Adicionar membro
- `removerMembro(id, membroId)` - Remover membro

**Exemplo de uso:**
```typescript
import { equipesService } from '@/services';

// Criar equipe
const equipe = await equipesService.criarEquipe({
  nome: 'Equipe Beta',
  responsavel: 'Carlos Santos',
  membros: ['Carlos', 'Ana', 'Roberto'],
  especialidades: ['Pintura', 'Acabamento']
});

// Adicionar membro
await equipesService.adicionarMembro('123', {
  nome: 'Fernanda',
  funcao: 'Auxiliar',
  especialidade: 'Pintura'
});
```

---

### 11. **pdfService.ts**
Geração de PDFs de orçamentos.

**Endpoints disponíveis:**
- `gerarOrcamentoPDFDownload(id)` - Gerar PDF para download
- `gerarOrcamentoPDFView(id)` - Gerar PDF para visualização
- `gerarOrcamentoPDFURL(id)` - Gerar PDF e retornar URL
- `verificarOrcamento(id)` - Verificar se orçamento existe
- `downloadPDF(blob, filename)` - Helper para download
- `viewPDF(blob)` - Helper para visualização

**Exemplo de uso:**
```typescript
import { pdfService } from '@/services';

// Download PDF
const blob = await pdfService.gerarOrcamentoPDFDownload('123');
pdfService.downloadPDF(blob, 'orcamento-123.pdf');

// Visualizar PDF em nova aba
const blob = await pdfService.gerarOrcamentoPDFView('123');
pdfService.viewPDF(blob);
```

---

## 📦 Arquivo de Índice

Foi criado um arquivo `/frontend/src/services/index.ts` que exporta todos os services para facilitar as importações:

```typescript
// Importar múltiplos services de uma vez
import { 
  materiaisService, 
  vendasService, 
  contasPagarService,
  relatoriosService 
} from '@/services';
```

---

## 🎨 Padrões Utilizados

Todos os services seguem o mesmo padrão:

1. **Tipagem TypeScript forte** - Interfaces para todos os dados
2. **Uso do apiService base** - Reutilização do serviço HTTP
3. **Tratamento de erros consistente** - Via ApiResponse
4. **Documentação inline** - Comentários sobre cada endpoint
5. **Nomenclatura clara** - Métodos autoexplicativos

---

## 🔐 Autenticação

Todos os services utilizam automaticamente o token JWT armazenado no localStorage através do `apiService`. Não é necessário passar o token manualmente em cada requisição.

---

## 📊 Estrutura de Resposta

Todas as requisições retornam objetos no formato `ApiResponse`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

---

## 🚀 Como Usar

1. **Importar o service necessário:**
```typescript
import { materiaisService } from '@/services/materiaisService';
// ou
import { materiaisService } from '@/services';
```

2. **Fazer a requisição:**
```typescript
const response = await materiaisService.getMateriais();

if (response.success && response.data) {
  // Usar os dados
  console.log(response.data);
} else {
  // Tratar erro
  console.error(response.error);
}
```

3. **Usar em componentes React:**
```typescript
import { useEffect, useState } from 'react';
import { materiaisService, Material } from '@/services';

function MeuComponente() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  
  useEffect(() => {
    async function loadMateriais() {
      const response = await materiaisService.getMateriais();
      if (response.success && response.data) {
        setMateriais(response.data);
      }
    }
    
    loadMateriais();
  }, []);
  
  return (
    <div>
      {materiais.map(material => (
        <div key={material.id}>{material.descricao}</div>
      ))}
    </div>
  );
}
```

---

## ✅ Status da Implementação

| Módulo | Backend | Frontend Service | Status |
|--------|---------|------------------|--------|
| Autenticação | ✅ | ✅ | Completo |
| Materiais | ✅ | ✅ | **Novo** |
| Compras | ✅ | ✅ | **Novo** |
| Orçamentos | ✅ | ✅ | **Novo** |
| Vendas | ✅ | ✅ | **Novo** |
| Contas a Pagar | ✅ | ✅ | **Novo** |
| Relatórios | ✅ | ✅ | **Novo** |
| Config Fiscal | ✅ | ✅ | **Novo** |
| Obras/Alocações | ✅ | ✅ | **Novo** |
| Comparação Preços | ✅ | ✅ | **Novo** |
| Equipes | ✅ | ✅ | **Novo** |
| PDF | ✅ | ✅ | **Novo** |
| Clientes | ✅ | ✅ | Existente |
| Fornecedores | ✅ | ✅ | Existente |
| Projetos | ✅ | ✅ | Existente |
| Serviços | ✅ | ✅ | Existente |
| Movimentações | ✅ | ✅ | Existente |
| Histórico | ✅ | ✅ | Existente |
| NFe | ✅ | ✅ | Existente |
| Empresas | ✅ | ✅ | Existente |
| Dashboard | ✅ | ✅ | Existente |

---

## 🎯 Próximos Passos

1. **Atualizar componentes existentes** para usar os novos services
2. **Criar novos componentes** para módulos sem UI (Materiais, Vendas, etc.)
3. **Adicionar testes unitários** para os services
4. **Documentar fluxos de uso** específicos de cada módulo
5. **Criar hooks customizados** para facilitar o uso (ex: `useMateriais`, `useVendas`)

---

## 📝 Notas Importantes

- Todos os services estão prontos para uso imediato
- A autenticação JWT é gerenciada automaticamente
- Tratamento de erros está implementado em todos os services
- Todos os tipos TypeScript estão definidos
- Os services seguem as convenções do projeto

---

## 🛠️ Manutenção

Para adicionar novos endpoints no futuro:

1. Adicionar método no service correspondente
2. Adicionar tipos TypeScript necessários
3. Seguir o padrão estabelecido de nomenclatura
4. Documentar o novo endpoint neste arquivo
5. Atualizar a exportação no `index.ts` se necessário

---

**Implementado em:** 27/10/2025  
**Status:** ✅ Completo  
**Services criados:** 11  
**Endpoints conectados:** 100%
