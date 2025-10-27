# Integração Completa: Backend ↔ Frontend

## 📋 Resumo
Este documento detalha a integração completa de todos os endpoints do backend com o frontend, incluindo todos os services criados e suas funcionalidades.

## 🎯 Status da Integração
✅ **100% dos endpoints do backend estão conectados ao frontend**

---

## 📦 Services Criados

### 1. **alocacaoService.ts** - Gestão Operacional de Obras
**Endpoint Base:** `/api/obras`

#### Equipes
- ✅ `POST /api/obras/equipes` - Criar equipe
- ✅ `GET /api/obras/equipes` - Listar equipes
- ✅ `GET /api/obras/equipes/disponiveis` - Equipes disponíveis
- ✅ `GET /api/obras/equipes/:id` - Buscar equipe específica
- ✅ `PUT /api/obras/equipes/:id` - Atualizar equipe
- ✅ `DELETE /api/obras/equipes/:id` - Desativar equipe

#### Alocações
- ✅ `POST /api/obras/alocar` - Alocar equipe a projeto
- ✅ `GET /api/obras/alocacoes` - Listar alocações
- ✅ `GET /api/obras/alocacoes/calendario` - Alocações para calendário
- ✅ `GET /api/obras/alocacoes/:id` - Buscar alocação específica
- ✅ `PUT /api/obras/alocacoes/:id` - Atualizar alocação
- ✅ `PUT /api/obras/alocacoes/:id/iniciar` - Iniciar alocação
- ✅ `PUT /api/obras/alocacoes/:id/concluir` - Concluir alocação
- ✅ `PUT /api/obras/alocacoes/:id/cancelar` - Cancelar alocação

#### Estatísticas
- ✅ `GET /api/obras/estatisticas` - Estatísticas gerais

---

### 2. **comparacaoPrecosService.ts** - Comparação de Preços
**Endpoint Base:** `/api/comparacao-precos`

- ✅ `POST /api/comparacao-precos/upload-csv` - Upload de CSV
- ✅ `POST /api/comparacao-precos/validate-csv` - Validar CSV
- ✅ `GET /api/comparacao-precos/historico/:codigo` - Histórico de preços
- ✅ `POST /api/comparacao-precos/atualizar-precos` - Atualizar preços

**Funcionalidades Especiais:**
- Upload de arquivos CSV com FormData
- Validação prévia de estrutura
- Histórico de variação de preços

---

### 3. **equipesService.ts** - Gestão de Equipes
**Endpoint Base:** `/api/equipes`

- ✅ `GET /api/equipes` - Listar equipes
- ✅ `GET /api/equipes/estatisticas` - Estatísticas
- ✅ `GET /api/equipes/disponiveis` - Equipes disponíveis
- ✅ `GET /api/equipes/:id` - Buscar equipe por ID
- ✅ `POST /api/equipes` - Criar equipe
- ✅ `PUT /api/equipes/:id` - Atualizar equipe
- ✅ `DELETE /api/equipes/:id` - Desativar equipe
- ✅ `POST /api/equipes/:id/membros` - Adicionar membro
- ✅ `DELETE /api/equipes/:id/membros/:membroId` - Remover membro

---

### 4. **vendasService.ts** - Vendas e Contas a Receber
**Endpoint Base:** `/api/vendas`

- ✅ `GET /api/vendas/dashboard` - Dashboard de vendas
- ✅ `GET /api/vendas/estoque/:orcamentoId` - Verificar estoque
- ✅ `GET /api/vendas` - Listar vendas (com paginação)
- ✅ `GET /api/vendas/:id` - Buscar venda específica
- ✅ `POST /api/vendas/realizar` - Realizar nova venda
- ✅ `PUT /api/vendas/:id/cancelar` - Cancelar venda
- ✅ `PUT /api/vendas/contas/:id/pagar` - Pagar conta a receber

**Recursos:**
- Paginação de resultados
- Verificação de estoque antes da venda
- Gestão de contas a receber
- Dashboard com métricas

---

### 5. **materiaisService.ts** - Gestão de Materiais e Estoque
**Endpoint Base:** `/api/materiais`

- ✅ `GET /api/materiais` - Listar materiais
- ✅ `GET /api/materiais/:id` - Buscar material por ID
- ✅ `POST /api/materiais` - Criar material
- ✅ `PUT /api/materiais/:id` - Atualizar material
- ✅ `DELETE /api/materiais/:id` - Deletar material
- ✅ `POST /api/materiais/movimentacao` - Registrar movimentação
- ✅ `GET /api/materiais/movimentacoes/historico` - Histórico de movimentações

**Funcionalidades:**
- Controle de estoque
- Estoque mínimo
- Histórico de movimentações (entrada/saída)

---

### 6. **orcamentosService.ts** - Orçamentos
**Endpoint Base:** `/api/orcamentos`

- ✅ `GET /api/orcamentos` - Listar orçamentos
- ✅ `GET /api/orcamentos/:id` - Buscar orçamento por ID
- ✅ `POST /api/orcamentos` - Criar orçamento
- ✅ `PATCH /api/orcamentos/:id/status` - Atualizar status

**Status Disponíveis:**
- Pendente
- Aprovado
- Rejeitado
- Convertido

---

### 7. **comprasService.ts** - Gestão de Compras
**Endpoint Base:** `/api/compras`

- ✅ `GET /api/compras` - Listar compras
- ✅ `POST /api/compras` - Criar compra
- ✅ `PATCH /api/compras/:id/status` - Atualizar status
- ✅ `POST /api/compras/parse-xml` - Parse de XML de NF-e

**Funcionalidades Especiais:**
- Upload e parse de XML de nota fiscal
- Extração automática de dados da NF-e
- Controle de status da compra

---

### 8. **contasPagarService.ts** - Contas a Pagar
**Endpoint Base:** `/api/contas-pagar`

- ✅ `POST /api/contas-pagar` - Criar conta única
- ✅ `POST /api/contas-pagar/parceladas` - Criar contas parceladas
- ✅ `GET /api/contas-pagar` - Listar contas (com paginação)
- ✅ `GET /api/contas-pagar/:id` - Buscar conta específica
- ✅ `PUT /api/contas-pagar/:id/pagar` - Marcar como paga
- ✅ `PUT /api/contas-pagar/:id/cancelar` - Cancelar conta
- ✅ `PUT /api/contas-pagar/:id/vencimento` - Atualizar vencimento
- ✅ `GET /api/contas-pagar/alertas/atrasadas` - Contas em atraso
- ✅ `GET /api/contas-pagar/alertas/a-vencer` - Contas a vencer

**Recursos Avançados:**
- Sistema de parcelamento automático
- Alertas de vencimento
- Categorização de despesas
- Paginação de resultados

---

### 9. **relatoriosService.ts** - Relatórios e Dashboard
**Endpoint Base:** `/api/relatorios`

- ✅ `GET /api/relatorios/dashboard` - Dashboard completo
- ✅ `GET /api/relatorios/financeiro` - Dados financeiros mensais
- ✅ `GET /api/relatorios/financeiro/resumo` - Resumo financeiro
- ✅ `GET /api/relatorios/vendas` - Estatísticas de vendas
- ✅ `GET /api/relatorios/clientes/top` - Top clientes

**Métricas Disponíveis:**
- Receitas e despesas mensais
- Lucro e margem de lucro
- Fluxo de caixa projetado
- Conversão de orçamentos
- Ranking de clientes
- Ticket médio

---

### 10. **configFiscalService.ts** - Configurações Fiscais
**Endpoint Base:** `/api/configuracoes-fiscais`

- ✅ `GET /api/configuracoes-fiscais` - Listar configurações
- ✅ `GET /api/configuracoes-fiscais/:id` - Buscar por ID
- ✅ `POST /api/configuracoes-fiscais` - Criar configuração
- ✅ `PUT /api/configuracoes-fiscais/:id` - Atualizar
- ✅ `DELETE /api/configuracoes-fiscais/:id` - Deletar

**Configurações Incluídas:**
- Regime tributário
- Alíquotas (ICMS, IPI, PIS, COFINS, IR, CSLL)
- Certificado digital
- Ambiente NF-e (Produção/Homologação)
- Numeração de notas

---

### 11. **pdfService.ts** - Geração de PDFs
**Endpoint Base:** `/api/pdf`

- ✅ `GET /api/pdf/orcamento/:id/download` - Download de PDF
- ✅ `GET /api/pdf/orcamento/:id/view` - Visualização inline
- ✅ `GET /api/pdf/orcamento/:id/url` - Gerar URL/DataURL
- ✅ `GET /api/pdf/orcamento/:id/check` - Verificar orçamento

**Helpers:**
- `downloadOrcamentoPDF()` - Download automático
- `abrirOrcamentoPDF()` - Abrir em nova aba

---

## 🔄 Services Já Existentes (Atualizados)

### 12. **authService.ts** - Autenticação
**Endpoint Base:** `/api/auth`
- ✅ Login
- ✅ Logout
- ✅ Verificação de token
- ✅ Refresh token

### 13. **clientesService.ts** - Clientes
**Endpoint Base:** `/api/clientes`
- ✅ CRUD completo de clientes

### 14. **fornecedoresService.ts** - Fornecedores
**Endpoint Base:** `/api/fornecedores`
- ✅ CRUD completo de fornecedores

### 15. **empresasService.ts** - Empresas
**Endpoint Base:** `/api/empresas`
- ✅ CRUD completo de empresas

### 16. **projetosService.ts** - Projetos
**Endpoint Base:** `/api/projetos`
- ✅ CRUD completo de projetos

### 17. **servicosService.ts** - Serviços
**Endpoint Base:** `/api/servicos`
- ✅ CRUD completo de serviços

### 18. **movimentacoesService.ts** - Movimentações
**Endpoint Base:** `/api/movimentacoes`
- ✅ Gestão de movimentações

### 19. **historicoService.ts** - Histórico
**Endpoint Base:** `/api/historico`
- ✅ Consulta de histórico

### 20. **nfeService.ts** - Notas Fiscais
**Endpoint Base:** `/api/nfe`
- ✅ Emissão de NF-e

### 21. **dashboardService.ts** - Dashboard
**Endpoint Base:** `/api/dashboard`
- ✅ Dados do dashboard principal

---

## 📁 Estrutura de Arquivos

```
frontend/src/services/
├── index.ts                      # Exportação central
├── api.ts                        # Cliente HTTP base
├── authService.ts                # Autenticação
├── alocacaoService.ts            # ✨ NOVO - Alocações e obras
├── comparacaoPrecosService.ts    # ✨ NOVO - Comparação de preços
├── equipesService.ts             # ✨ NOVO - Gestão de equipes
├── vendasService.ts              # ✨ NOVO - Vendas
├── materiaisService.ts           # ✨ NOVO - Materiais
├── orcamentosService.ts          # ✨ NOVO - Orçamentos
├── comprasService.ts             # ✨ NOVO - Compras
├── contasPagarService.ts         # ✨ NOVO - Contas a pagar
├── relatoriosService.ts          # ✨ NOVO - Relatórios
├── configFiscalService.ts        # ✨ NOVO - Config fiscal
├── pdfService.ts                 # ✨ NOVO - PDFs
├── clientesService.ts            # Já existente
├── fornecedoresService.ts        # Já existente
├── empresasService.ts            # Já existente
├── projetosService.ts            # Já existente
├── servicosService.ts            # Já existente
├── movimentacoesService.ts       # Já existente
├── historicoService.ts           # Já existente
├── nfeService.ts                 # Já existente
└── dashboardService.ts           # Já existente
```

---

## 🎨 Como Usar os Services

### Importação Simples
```typescript
// Importar service específico
import { vendasService } from '@/services/vendasService';

// OU importar do index central
import { vendasService } from '@/services';
```

### Exemplo de Uso - Vendas
```typescript
// Listar vendas com filtros
const response = await vendasService.listarVendas({
  page: 1,
  limit: 10,
  status: 'Ativa',
  dataInicio: '2024-01-01'
});

if (response.success) {
  console.log(response.data.vendas);
}
```

### Exemplo de Uso - Upload de CSV
```typescript
// Comparação de preços
const file = event.target.files[0];
const response = await comparacaoPrecosService.uploadCSV(file);

if (response.success) {
  console.log('CSV processado:', response.data);
}
```

### Exemplo de Uso - Relatórios
```typescript
// Dashboard completo
const dashboard = await relatoriosService.getDashboardCompleto();

// Dados financeiros
const financeiro = await relatoriosService.getDadosFinanceiros({
  meses: 12
});

// Top clientes
const topClientes = await relatoriosService.getTopClientes({
  limite: 10
});
```

---

## 🔐 Autenticação

Todos os services utilizam o `apiService` base que:
- ✅ Adiciona automaticamente o token JWT no header
- ✅ Atualiza o token do localStorage em cada requisição
- ✅ Trata erros de autenticação
- ✅ Suporta requisições com e sem corpo

---

## 📊 Tipos TypeScript

Todos os services possuem tipagem completa:
- ✅ Interfaces para entidades
- ✅ Tipos para respostas da API
- ✅ Enums para status
- ✅ Tipos para filtros e parâmetros

Exemplo:
```typescript
import type { 
  Venda, 
  ContaReceber, 
  DashboardVendas 
} from '@/services/vendasService';
```

---

## 🚀 Próximos Passos

1. **Integrar nos Componentes**
   - Atualizar componentes existentes para usar os novos services
   - Criar novos componentes para funcionalidades sem UI

2. **Testes**
   - Criar testes unitários para cada service
   - Testes de integração com mock do backend

3. **Otimizações**
   - Implementar cache de requisições
   - Implementar retry automático
   - Adicionar loading states

4. **Documentação**
   - Documentar exemplos de uso em cada componente
   - Criar guia de boas práticas

---

## ✅ Checklist de Integração

### Backend (22 rotas)
- ✅ alocacao.routes.ts → alocacaoService.ts
- ✅ comparacaoPrecos.routes.ts → comparacaoPrecosService.ts
- ✅ equipes.routes.ts → equipesService.ts
- ✅ vendas.routes.ts → vendasService.ts
- ✅ materiais.ts → materiaisService.ts
- ✅ orcamentos.ts → orcamentosService.ts
- ✅ compras.ts → comprasService.ts
- ✅ contasPagar.routes.ts → contasPagarService.ts
- ✅ relatorios.routes.ts → relatoriosService.ts
- ✅ configFiscal.ts → configFiscalService.ts
- ✅ pdf.routes.ts → pdfService.ts
- ✅ auth.ts → authService.ts
- ✅ clientes.ts → clientesService.ts
- ✅ fornecedores.ts → fornecedoresService.ts
- ✅ empresas.ts → empresasService.ts
- ✅ projetos.ts → projetosService.ts
- ✅ servicos.ts → servicosService.ts
- ✅ movimentacoes.ts → movimentacoesService.ts
- ✅ historico.ts → historicoService.ts
- ✅ nfe.ts → nfeService.ts
- ✅ dashboard.ts → dashboardService.ts
- ✅ protected.routes.ts → (rota de teste, não necessita service)

### Frontend (23 services)
- ✅ 11 novos services criados
- ✅ 12 services já existentes
- ✅ 1 arquivo index.ts para exportação central
- ✅ Tipagem TypeScript completa
- ✅ Documentação inline em todos os services

---

## 🎯 Conclusão

**A integração entre backend e frontend está 100% completa!**

Todos os endpoints do backend possuem métodos correspondentes no frontend, com:
- ✅ Tipagem TypeScript completa
- ✅ Tratamento de erros
- ✅ Autenticação automática
- ✅ Documentação inline
- ✅ Padrão consistente
- ✅ Exportação centralizada

O sistema está pronto para ser usado em qualquer componente React/TypeScript do frontend.

---

**Data:** 2025-10-27  
**Autor:** Sistema S3E - Integração Completa  
**Versão:** 1.0.0
