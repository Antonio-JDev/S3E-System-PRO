# Referência Rápida - Todos os Endpoints

Documento de referência rápida com todos os endpoints disponíveis no sistema S3E.

---

## 🔐 Autenticação (`authService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login de usuário |
| POST | `/api/auth/register` | Registrar novo usuário |
| GET | `/api/auth/profile` | Obter perfil do usuário |
| PUT | `/api/auth/profile` | Atualizar perfil |
| PUT | `/api/auth/change-password` | Alterar senha |

---

## 📦 Materiais (`materiaisService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/materiais` | Listar materiais |
| GET | `/api/materiais/:id` | Buscar material por ID |
| POST | `/api/materiais` | Criar novo material |
| PUT | `/api/materiais/:id` | Atualizar material |
| DELETE | `/api/materiais/:id` | Deletar material |
| POST | `/api/materiais/movimentacao` | Registrar movimentação |
| GET | `/api/materiais/movimentacoes/historico` | Histórico de movimentações |

---

## 🛒 Compras (`comprasService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/compras` | Listar compras |
| POST | `/api/compras` | Criar nova compra |
| PATCH | `/api/compras/:id/status` | Atualizar status da compra |
| POST | `/api/compras/parse-xml` | Parse de XML de nota fiscal |

---

## 📋 Orçamentos (`orcamentosService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/orcamentos` | Listar orçamentos |
| GET | `/api/orcamentos/:id` | Buscar orçamento por ID |
| POST | `/api/orcamentos` | Criar novo orçamento |
| PATCH | `/api/orcamentos/:id/status` | Atualizar status |

---

## 💰 Vendas (`vendasService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/vendas/dashboard` | Dashboard de vendas |
| GET | `/api/vendas/estoque/:orcamentoId` | Verificar estoque |
| GET | `/api/vendas` | Listar vendas |
| GET | `/api/vendas/:id` | Buscar venda por ID |
| POST | `/api/vendas/realizar` | Realizar nova venda |
| PUT | `/api/vendas/:id/cancelar` | Cancelar venda |
| PUT | `/api/vendas/contas/:id/pagar` | Pagar conta a receber |

---

## 💳 Contas a Pagar (`contasPagarService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/contas-pagar` | Criar conta única |
| POST | `/api/contas-pagar/parceladas` | Criar contas parceladas |
| GET | `/api/contas-pagar` | Listar contas |
| GET | `/api/contas-pagar/:id` | Buscar conta por ID |
| PUT | `/api/contas-pagar/:id/pagar` | Pagar conta |
| PUT | `/api/contas-pagar/:id/cancelar` | Cancelar conta |
| PUT | `/api/contas-pagar/:id/vencimento` | Atualizar vencimento |
| GET | `/api/contas-pagar/alertas/atrasadas` | Contas atrasadas |
| GET | `/api/contas-pagar/alertas/a-vencer` | Contas a vencer |

---

## 📊 Relatórios (`relatoriosService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/relatorios/dashboard` | Dashboard completo |
| GET | `/api/relatorios/financeiro` | Dados financeiros mensais |
| GET | `/api/relatorios/financeiro/resumo` | Resumo financeiro |
| GET | `/api/relatorios/vendas` | Estatísticas de vendas |
| GET | `/api/relatorios/clientes/top` | Top clientes |

---

## ⚙️ Configurações Fiscais (`configFiscalService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/configuracoes-fiscais` | Listar configurações |
| GET | `/api/configuracoes-fiscais/:id` | Buscar configuração por ID |
| POST | `/api/configuracoes-fiscais` | Criar configuração |
| PUT | `/api/configuracoes-fiscais/:id` | Atualizar configuração |
| DELETE | `/api/configuracoes-fiscais/:id` | Deletar configuração |

---

## 🏗️ Obras e Alocações (`obrasService`)

### Equipes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/obras/equipes` | Criar equipe |
| GET | `/api/obras/equipes` | Listar equipes |
| GET | `/api/obras/equipes/disponiveis` | Equipes disponíveis |
| GET | `/api/obras/equipes/:id` | Buscar equipe por ID |
| PUT | `/api/obras/equipes/:id` | Atualizar equipe |
| DELETE | `/api/obras/equipes/:id` | Desativar equipe |

### Alocações

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/obras/alocar` | Alocar equipe |
| GET | `/api/obras/alocacoes` | Listar alocações |
| GET | `/api/obras/alocacoes/calendario` | Alocações para calendário |
| GET | `/api/obras/alocacoes/:id` | Buscar alocação por ID |
| PUT | `/api/obras/alocacoes/:id` | Atualizar alocação |
| PUT | `/api/obras/alocacoes/:id/iniciar` | Iniciar alocação |
| PUT | `/api/obras/alocacoes/:id/concluir` | Concluir alocação |
| PUT | `/api/obras/alocacoes/:id/cancelar` | Cancelar alocação |

### Estatísticas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/obras/estatisticas` | Estatísticas gerais |

---

## 💲 Comparação de Preços (`comparacaoPrecosService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/comparacao-precos/upload-csv` | Upload de CSV |
| POST | `/api/comparacao-precos/validate-csv` | Validar CSV |
| GET | `/api/comparacao-precos/historico/:codigo` | Histórico de preços |
| POST | `/api/comparacao-precos/atualizar-precos` | Atualizar preços em lote |

---

## 👥 Equipes (`equipesService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/equipes` | Listar equipes |
| GET | `/api/equipes/estatisticas` | Estatísticas |
| GET | `/api/equipes/disponiveis` | Equipes disponíveis |
| GET | `/api/equipes/:id` | Buscar equipe por ID |
| POST | `/api/equipes` | Criar equipe |
| PUT | `/api/equipes/:id` | Atualizar equipe |
| DELETE | `/api/equipes/:id` | Desativar equipe |
| POST | `/api/equipes/:id/membros` | Adicionar membro |
| DELETE | `/api/equipes/:id/membros/:membroId` | Remover membro |

---

## 📄 PDF (`pdfService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/pdf/orcamento/:id/download` | Download de PDF |
| GET | `/api/pdf/orcamento/:id/view` | Visualizar PDF |
| GET | `/api/pdf/orcamento/:id/url` | Gerar URL do PDF |
| GET | `/api/pdf/orcamento/:id/check` | Verificar orçamento |

---

## 👤 Clientes (`clientesService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/clientes` | Listar clientes |
| GET | `/api/clientes/:id` | Buscar cliente por ID |
| POST | `/api/clientes` | Criar cliente |
| PUT | `/api/clientes/:id` | Atualizar cliente |
| DELETE | `/api/clientes/:id` | Deletar cliente |

---

## 🏢 Fornecedores (`fornecedoresService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/fornecedores` | Listar fornecedores |
| GET | `/api/fornecedores/:id` | Buscar fornecedor por ID |
| POST | `/api/fornecedores` | Criar fornecedor |
| PUT | `/api/fornecedores/:id` | Atualizar fornecedor |
| DELETE | `/api/fornecedores/:id` | Deletar fornecedor |

---

## 🏗️ Projetos (`projetosService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/projetos` | Listar projetos |
| GET | `/api/projetos/:id` | Buscar projeto por ID |
| POST | `/api/projetos` | Criar projeto |
| PUT | `/api/projetos/:id` | Atualizar projeto |
| DELETE | `/api/projetos/:id` | Deletar projeto |

---

## 🔧 Serviços (`servicosService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/servicos` | Listar serviços |
| GET | `/api/servicos/:id` | Buscar serviço por ID |
| POST | `/api/servicos` | Criar serviço |
| PUT | `/api/servicos/:id` | Atualizar serviço |
| DELETE | `/api/servicos/:id` | Deletar serviço |

---

## 📦 Movimentações (`movimentacoesService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/movimentacoes` | Listar movimentações |
| GET | `/api/movimentacoes/:id` | Buscar movimentação por ID |
| POST | `/api/movimentacoes` | Criar movimentação |

---

## 📜 Histórico (`historicoService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/historico` | Listar histórico |
| GET | `/api/historico/:id` | Buscar histórico por ID |

---

## 📧 NFe (`nfeService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/nfe` | Listar NFes |
| GET | `/api/nfe/:id` | Buscar NFe por ID |
| POST | `/api/nfe` | Emitir NFe |
| POST | `/api/nfe/:id/cancelar` | Cancelar NFe |

---

## 🏢 Empresas (`empresasService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/empresas` | Listar empresas |
| GET | `/api/empresas/:id` | Buscar empresa por ID |
| POST | `/api/empresas` | Criar empresa |
| PUT | `/api/empresas/:id` | Atualizar empresa |
| DELETE | `/api/empresas/:id` | Deletar empresa |

---

## 📊 Dashboard (`dashboardService`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard` | Dashboard geral |
| GET | `/api/dashboard/stats` | Estatísticas do dashboard |

---

## 🔍 Filtros Comuns

Muitos endpoints aceitam parâmetros de query para filtros e paginação:

```typescript
// Exemplo de uso com filtros
const response = await materiaisService.getMateriais({
  search: 'cabo',           // Buscar por termo
  categoria: 'eletrica',    // Filtrar por categoria
  ativo: true,              // Apenas ativos
  page: 1,                  // Paginação
  limit: 20                 // Itens por página
});
```

### Filtros Comuns por Módulo

#### Materiais
- `search`: Busca em código e descrição
- `categoria`: Filtrar por categoria
- `ativo`: true/false
- `page`, `limit`: Paginação

#### Compras
- `fornecedorId`: Filtrar por fornecedor
- `status`: pendente, confirmada, recebida, cancelada
- `dataInicio`, `dataFim`: Período
- `page`, `limit`: Paginação

#### Vendas
- `clienteId`: Filtrar por cliente
- `status`: ativa, cancelada
- `dataInicio`, `dataFim`: Período
- `page`, `limit`: Paginação

#### Contas a Pagar
- `fornecedorId`: Filtrar por fornecedor
- `status`: pendente, paga, atrasada, cancelada
- `dataInicio`, `dataFim`: Período
- `page`, `limit`: Paginação

#### Obras/Alocações
- `equipeId`: Filtrar por equipe
- `projetoId`: Filtrar por projeto
- `status`: Agendada, EmAndamento, Concluida, Cancelada
- `dataInicio`, `dataFim`: Período

---

## 📝 Convenções de Nomenclatura

### Status de Transações
- `pendente`: Aguardando processamento
- `confirmada`: Confirmada mas não processada
- `recebida`: Recebida/Processada
- `ativa`: Em vigor
- `cancelada`: Cancelada
- `paga`: Pagamento realizado
- `atrasada`: Vencimento atrasado

### Status de Orçamentos
- `rascunho`: Em elaboração
- `enviado`: Enviado ao cliente
- `aprovado`: Aprovado pelo cliente
- `rejeitado`: Rejeitado
- `expirado`: Validade expirada

### Status de Alocações
- `Agendada`: Planejada mas não iniciada
- `EmAndamento`: Em execução
- `Concluida`: Finalizada
- `Cancelada`: Cancelada

---

## 🔐 Autenticação

Todos os endpoints (exceto login e register) requerem autenticação via JWT:

```typescript
// O token é gerenciado automaticamente pelo apiService
// Basta fazer login uma vez:
await authService.login({ email, password });

// Após isso, todas as requisições incluirão o token automaticamente
```

---

## ⚠️ Tratamento de Erros

Todas as respostas seguem o formato `ApiResponse`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

Sempre verifique `success` antes de usar `data`:

```typescript
const response = await materiaisService.getMateriais();

if (response.success && response.data) {
  // Usar response.data
} else {
  // Tratar response.error
}
```

---

## 🚀 Importações

```typescript
// Importar services específicos
import { 
  materiaisService, 
  vendasService, 
  contasPagarService 
} from '@/services';

// Importar tipos
import { 
  Material, 
  Venda, 
  ContaPagar 
} from '@/services';

// Importar tudo
import * as services from '@/services';
```

---

**Total de Endpoints:** 100+  
**Total de Services:** 23  
**Última atualização:** 27/10/2025
