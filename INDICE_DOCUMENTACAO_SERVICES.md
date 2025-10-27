# 📚 Índice da Documentação - Services Frontend-Backend

Guia de navegação rápida para toda a documentação de conexão entre frontend e backend.

---

## 🎯 Começando

### Para entender o que foi feito
👉 **[RESUMO_CONEXAO_FRONTEND_BACKEND.md](./RESUMO_CONEXAO_FRONTEND_BACKEND.md)**
- Visão geral do projeto
- Números e estatísticas
- Status de implementação
- Checklist completo

---

## 📖 Documentação Principal

### 1. Documentação Completa
👉 **[CONEXAO_COMPLETA_FRONTEND_BACKEND.md](./CONEXAO_COMPLETA_FRONTEND_BACKEND.md)**
- Descrição detalhada de cada service
- Todos os endpoints disponíveis
- Interfaces TypeScript
- Exemplos básicos de uso
- Padrões e convenções

**Use quando:** Precisar entender em detalhes como cada service funciona

---

### 2. Exemplos Práticos
👉 **[EXEMPLOS_USO_SERVICES.md](./EXEMPLOS_USO_SERVICES.md)**
- Exemplos completos em React
- Componentes funcionais
- Hooks customizados
- Padrões de uso
- Boas práticas

**Use quando:** For implementar uma funcionalidade específica

---

### 3. Referência Rápida
👉 **[REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md)**
- Lista completa de endpoints
- Métodos HTTP (GET, POST, PUT, PATCH, DELETE)
- Parâmetros e filtros
- Convenções de nomenclatura
- Códigos de status

**Use quando:** Precisar consultar rapidamente um endpoint específico

---

## 🗂️ Organização por Tema

### 💰 Financeiro
**Documentos relevantes:**
- Vendas e Contas a Receber → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 4)
- Contas a Pagar → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 5)
- Relatórios Financeiros → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 6)
- Dashboard → `REFERENCIA_RAPIDA_ENDPOINTS.md` (seção Dashboard)

**Exemplos:**
- Dashboard Financeiro → `EXEMPLOS_USO_SERVICES.md` (Relatórios)
- Alertas de Contas → `EXEMPLOS_USO_SERVICES.md` (Contas a Pagar)
- Realizar Venda → `EXEMPLOS_USO_SERVICES.md` (Vendas)

---

### 📦 Estoque e Materiais
**Documentos relevantes:**
- Materiais → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 1)
- Compras → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 2)
- Movimentações → `REFERENCIA_RAPIDA_ENDPOINTS.md` (seção Movimentações)

**Exemplos:**
- Lista de Materiais → `EXEMPLOS_USO_SERVICES.md` (Materiais)
- Upload de XML → `EXEMPLOS_USO_SERVICES.md` (Compras)
- Movimentação de Estoque → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 1)

---

### 📋 Orçamentos e Vendas
**Documentos relevantes:**
- Orçamentos → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 3)
- Vendas → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 4)
- PDF → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 11)

**Exemplos:**
- Criar Orçamento → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 3)
- Realizar Venda → `EXEMPLOS_USO_SERVICES.md` (Vendas)
- Gerar PDF → `EXEMPLOS_USO_SERVICES.md` (PDF)

---

### 🏗️ Obras e Equipes
**Documentos relevantes:**
- Obras e Alocações → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 8)
- Equipes → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 10)

**Exemplos:**
- Gerenciar Obras → `EXEMPLOS_USO_SERVICES.md` (Obras)
- Alocar Equipes → `EXEMPLOS_USO_SERVICES.md` (Obras)

---

### ⚙️ Configurações
**Documentos relevantes:**
- Configurações Fiscais → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 7)
- Empresas → `REFERENCIA_RAPIDA_ENDPOINTS.md` (seção Empresas)

---

### 💲 Comparação de Preços
**Documentos relevantes:**
- Comparação → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 9)

**Exemplos:**
- Upload CSV → `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` (seção 9)

---

## 🔍 Encontrar por Funcionalidade

### Quero criar/listar/editar...

| Funcionalidade | Documento | Seção |
|----------------|-----------|-------|
| Materiais | `EXEMPLOS_USO_SERVICES.md` | Materiais - Listagem |
| Compras | `EXEMPLOS_USO_SERVICES.md` | Compras - Upload XML |
| Orçamentos | `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` | Seção 3 |
| Vendas | `EXEMPLOS_USO_SERVICES.md` | Vendas - Realizar Venda |
| Contas a Pagar | `EXEMPLOS_USO_SERVICES.md` | Contas a Pagar |
| Equipes | `EXEMPLOS_USO_SERVICES.md` | Obras |
| Alocações | `EXEMPLOS_USO_SERVICES.md` | Obras |
| Relatórios | `EXEMPLOS_USO_SERVICES.md` | Relatórios |
| PDF | `EXEMPLOS_USO_SERVICES.md` | PDF |

---

### Quero entender...

| Tópico | Documento | Seção |
|--------|-----------|-------|
| Todos os endpoints | `REFERENCIA_RAPIDA_ENDPOINTS.md` | Todas |
| Como usar services | `EXEMPLOS_USO_SERVICES.md` | Todas |
| Tipos TypeScript | `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` | Todas |
| Filtros disponíveis | `REFERENCIA_RAPIDA_ENDPOINTS.md` | Filtros Comuns |
| Autenticação | `REFERENCIA_RAPIDA_ENDPOINTS.md` | Autenticação |
| Padrões | `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` | Padrões |

---

## 📂 Estrutura de Arquivos

```
/workspace/
├── frontend/
│   └── src/
│       └── services/
│           ├── api.ts                      # Base service com HTTP methods
│           ├── index.ts                    # Exportações centralizadas
│           │
│           ├── authService.ts              # Autenticação
│           │
│           ├── materiaisService.ts         # 🆕 Materiais e estoque
│           ├── comprasService.ts           # 🆕 Compras e XML
│           ├── orcamentosService.ts        # 🆕 Orçamentos
│           ├── vendasService.ts            # 🆕 Vendas e contas a receber
│           ├── contasPagarService.ts       # 🆕 Contas a pagar
│           ├── relatoriosService.ts        # 🆕 Relatórios
│           ├── configFiscalService.ts      # 🆕 Configurações fiscais
│           ├── obrasService.ts             # 🆕 Obras e alocações
│           ├── comparacaoPrecosService.ts  # 🆕 Comparação de preços
│           ├── equipesService.ts           # 🆕 Equipes
│           ├── pdfService.ts               # 🆕 Geração de PDF
│           │
│           ├── clientesService.ts          # Clientes
│           ├── fornecedoresService.ts      # Fornecedores
│           ├── projetosService.ts          # Projetos
│           ├── servicosService.ts          # Serviços
│           ├── movimentacoesService.ts     # Movimentações
│           ├── historicoService.ts         # Histórico
│           ├── nfeService.ts               # NFe
│           ├── empresasService.ts          # Empresas
│           └── dashboardService.ts         # Dashboard
│
└── docs/
    ├── RESUMO_CONEXAO_FRONTEND_BACKEND.md          # 📋 Resumo executivo
    ├── CONEXAO_COMPLETA_FRONTEND_BACKEND.md        # 📖 Documentação completa
    ├── EXEMPLOS_USO_SERVICES.md                    # 💡 Exemplos práticos
    ├── REFERENCIA_RAPIDA_ENDPOINTS.md              # 🔍 Referência rápida
    └── INDICE_DOCUMENTACAO_SERVICES.md             # 📚 Este arquivo
```

---

## 🚀 Fluxos de Uso Comuns

### 1. Implementar uma nova tela
1. **Ler:** `REFERENCIA_RAPIDA_ENDPOINTS.md` para ver endpoints disponíveis
2. **Ver exemplos:** `EXEMPLOS_USO_SERVICES.md` para componentes similares
3. **Implementar:** Usar o service correspondente
4. **Consultar:** `CONEXAO_COMPLETA_FRONTEND_BACKEND.md` para detalhes dos tipos

### 2. Debugar uma chamada de API
1. **Verificar endpoint:** `REFERENCIA_RAPIDA_ENDPOINTS.md`
2. **Ver tipos:** `CONEXAO_COMPLETA_FRONTEND_BACKEND.md`
3. **Conferir implementação:** Ver código do service em `/frontend/src/services/`

### 3. Adicionar novo endpoint
1. **Criar no backend** (routes + controller)
2. **Adicionar ao service** correspondente no frontend
3. **Atualizar tipos** TypeScript
4. **Documentar** em `CONEXAO_COMPLETA_FRONTEND_BACKEND.md`
5. **Adicionar exemplo** em `EXEMPLOS_USO_SERVICES.md`
6. **Atualizar referência** em `REFERENCIA_RAPIDA_ENDPOINTS.md`

---

## 📊 Estatísticas

- **Services totais:** 23
- **Novos services:** 11
- **Endpoints conectados:** 100+
- **Arquivos de documentação:** 4
- **Exemplos práticos:** 8+
- **Páginas de documentação:** ~50

---

## 🔗 Links Rápidos

### Por Prioridade
1. 🥇 **[RESUMO](./RESUMO_CONEXAO_FRONTEND_BACKEND.md)** - Comece aqui
2. 🥈 **[EXEMPLOS](./EXEMPLOS_USO_SERVICES.md)** - Copie e adapte
3. 🥉 **[REFERÊNCIA](./REFERENCIA_RAPIDA_ENDPOINTS.md)** - Consulte quando necessário

### Por Necessidade
- **Aprender:** [CONEXAO_COMPLETA_FRONTEND_BACKEND.md](./CONEXAO_COMPLETA_FRONTEND_BACKEND.md)
- **Implementar:** [EXEMPLOS_USO_SERVICES.md](./EXEMPLOS_USO_SERVICES.md)
- **Consultar:** [REFERENCIA_RAPIDA_ENDPOINTS.md](./REFERENCIA_RAPIDA_ENDPOINTS.md)
- **Visão geral:** [RESUMO_CONEXAO_FRONTEND_BACKEND.md](./RESUMO_CONEXAO_FRONTEND_BACKEND.md)

---

## 💡 Dicas

### Para Desenvolvedores Frontend
- Sempre importe os services de `@/services`
- Use TypeScript para type safety
- Consulte `EXEMPLOS_USO_SERVICES.md` para padrões
- Verifique `response.success` antes de usar `response.data`

### Para Desenvolvedores Backend
- Mantenha consistência nas respostas (ApiResponse)
- Use status HTTP corretos
- Documente novos endpoints em `REFERENCIA_RAPIDA_ENDPOINTS.md`

### Para Gerentes de Projeto
- Consulte `RESUMO_CONEXAO_FRONTEND_BACKEND.md` para status
- Use as tabelas de status para planejamento
- Todos os módulos estão 100% conectados

---

## 🆘 Suporte

### Não encontrou o que precisa?
1. Procure na [Referência Rápida](./REFERENCIA_RAPIDA_ENDPOINTS.md)
2. Veja os [Exemplos Práticos](./EXEMPLOS_USO_SERVICES.md)
3. Leia a [Documentação Completa](./CONEXAO_COMPLETA_FRONTEND_BACKEND.md)
4. Consulte o código-fonte em `/frontend/src/services/`

### Reportar Problemas
- Verifique se o endpoint existe no backend
- Confira se o token JWT está sendo enviado
- Valide os dados de entrada
- Consulte o console do browser para erros

---

**Última atualização:** 27/10/2025  
**Versão:** 1.0.0  
**Status:** ✅ Completo e Atualizado
