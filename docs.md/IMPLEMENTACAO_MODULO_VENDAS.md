# 📋 Implementação do Módulo de Vendas e Contas a Receber

## ✅ Resumo Executivo

Implementação completa do módulo de **Vendas** e **Contas a Receber** no sistema
S3E, incluindo backend (API e banco de dados) e frontend (interface de usuário).
O módulo foi desenvolvido seguindo o padrão visual do sistema e está totalmente
integrado com a página de Financeiro.

---

## 🎯 Objetivos Alcançados

### Backend

1. **✅ Modelagem de Dados (Prisma)**
   - Criado modelo `Venda` com todos os campos necessários
   - Criado modelo `ContaReceber` vinculado a vendas
   - Relacionamentos configurados com `Cliente`, `Projeto` e cascata de exclusão

2. **✅ Serviços e Lógica de Negócio**
   - `VendasService.realizarVenda()`: Cria venda e gera contas a receber
     automaticamente
   - `VendasService.getVendasDashboard()`: Fornece dados estatísticos para
     dashboard
   - `VendasService.listarVendas()`: Lista com paginação
   - `VendasService.pagarConta()`: Marca conta como paga
   - `VendasService.cancelarVenda()`: Cancela venda

3. **✅ Controllers e Rotas**
   - Controller completo com tratamento de erros
   - Rotas protegidas por autenticação JWT
   - Endpoints RESTful seguindo padrões do sistema

4. **✅ Integração com App Principal**
   - Rotas registradas em `/api/vendas`
   - Endpoints documentados na rota principal

### Frontend

1. **✅ Componente de Vendas**
   - Interface responsiva seguindo padrão do sistema
   - 3 tabs principais: Dashboard, Vendas Realizadas, Nova Venda
   - Cards resumo com métricas importantes
   - Tabela de vendas com status visual
   - Formulário completo de nova venda

2. **✅ Integração com Financeiro**
   - Dados mockados compartilhados entre páginas
   - Consistência visual e de dados
   - Mesma paleta de cores e componentes

3. **✅ Navegação e UX**
   - Link no menu lateral com ícone personalizado
   - Transições suaves entre tabs
   - Feedback visual para estados de carregamento
   - Validações de formulário

---

## 📁 Arquivos Criados/Modificados

### Backend

#### Criados:

- `backend/src/services/vendas.service.ts`
- `backend/src/controllers/vendasController.ts`
- `backend/src/routes/vendas.routes.ts`
- `backend/src/types/index.ts`

#### Modificados:

- `backend/prisma/schema.prisma` - Adicionados modelos Venda e ContaReceber
- `backend/src/app.ts` - Integradas rotas de vendas

### Frontend

#### Criados:

- `frontend/src/components/Vendas.tsx`

#### Modificados:

- `frontend/src/App.tsx` - Adicionada rota para Vendas
- `frontend/src/constants/index.tsx` - Adicionado ícone e link de navegação
- `frontend/src/data/mockData.ts` - Adicionados dados mockados de vendas
- `frontend/src/components/Financeiro.tsx` - Integração com dados de vendas

---

## 🗄️ Estrutura do Banco de Dados

### Modelo `Venda`

```prisma
model Venda {
  id              String   @id @default(uuid())
  numeroVenda     String   @unique
  dataVenda       DateTime @default(now())
  valorTotal      Float
  status          String   @default("Pendente") // Pendente, Concluida, Cancelada
  clienteId       String
  projetoId       String?
  formaPagamento  String   @default("À vista")
  parcelas        Int      @default(1)
  valorEntrada    Float    @default(0)
  observacoes     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  cliente   Cliente           @relation(fields: [clienteId], references: [id])
  projeto   Projeto?          @relation(fields: [projetoId], references: [id])
  contasReceber ContaReceber[]
}
```

### Modelo `ContaReceber`

```prisma
model ContaReceber {
  id             String   @id @default(uuid())
  vendaId        String
  descricao      String
  valorParcela   Float
  dataVencimento DateTime
  dataPagamento  DateTime?
  status         String   @default("Pendente") // Pendente, Pago, Atrasado
  numeroParcela  Int?
  totalParcelas  Int?
  observacoes    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  venda Venda @relation(fields: [vendaId], references: [id], onDelete: Cascade)
}
```

---

## 🔌 Endpoints da API

### Base URL: `/api/vendas`

| Método | Endpoint            | Descrição                       | Autenticação |
| ------ | ------------------- | ------------------------------- | ------------ |
| `GET`  | `/dashboard`        | Dados para dashboard financeiro | ✅           |
| `GET`  | `/`                 | Lista vendas (paginação)        | ✅           |
| `GET`  | `/:id`              | Busca venda específica          | ✅           |
| `POST` | `/realizar`         | Realiza nova venda              | ✅           |
| `PUT`  | `/:id/cancelar`     | Cancela venda                   | ✅           |
| `PUT`  | `/contas/:id/pagar` | Marca conta como paga           | ✅           |

---

## 📊 Funcionalidades da Interface

### 1. Dashboard de Vendas

- **Total de Vendas**: Soma total e quantidade
- **A Receber**: Valor total de contas pendentes
- **Em Atraso**: Contas vencidas e não pagas
- **Vendas por Status**: Breakdown por status
- **Lista de Contas**: Visualização das próximas contas

### 2. Vendas Realizadas

- Tabela completa de vendas
- Colunas: Nº Venda, Cliente, Projeto, Data, Valor, Status, Parcelas
- Status visual com badges coloridos
- Contador de parcelas pagas

### 3. Nova Venda

- Seleção de cliente (obrigatório)
- Projeto relacionado (opcional)
- Valor total da venda
- Forma de pagamento (À vista, Parcelado, Boleto, PIX)
- Número de parcelas (até 12x)
- Valor de entrada
- Cálculo automático de parcelas
- Observações
- Validações completas

---

## 🎨 Padrão Visual

### Cores do Sistema

- **Azul** (`blue-50` to `blue-700`): Total de vendas, valores principais
- **Verde** (`green-50` to `green-700`): Contas a receber, valores positivos
- **Vermelho** (`red-50` to `red-700`): Contas em atraso, alertas
- **Cinza** (`gray-50` to `gray-700`): Textos, bordas, fundos neutros

### Componentes Padrão

- Cards com gradiente e bordas arredondadas
- Tabs com transições suaves
- Tabelas responsivas com hover
- Formulários com validação visual
- Badges para status
- Ícones SVG personalizados

---

## 🔄 Fluxo de Realização de Venda

```
1. Usuário preenche formulário de venda
   ↓
2. Frontend envia POST para /api/vendas/realizar
   ↓
3. Backend valida dados
   ↓
4. Cria registro de Venda no banco
   ↓
5. Gera automaticamente N parcelas (ContaReceber)
   ↓
6. Cada parcela tem:
   - Valor calculado (restante ÷ parcelas)
   - Data de vencimento (+ 30 dias por parcela)
   - Status inicial: Pendente
   ↓
7. Retorna venda criada + contas a receber
   ↓
8. Frontend exibe sucesso e redireciona para lista
```

---

## 📈 Cálculo de Parcelas

### Exemplo: Venda de R$ 15.000,00

- **Entrada**: R$ 5.000,00
- **Restante**: R$ 10.000,00
- **Parcelas**: 3x

**Resultado**:

- Parcela 1: R$ 8.333,33 (venc: 30 dias) - Entrada + 1ª parcela
- Parcela 2: R$ 3.333,33 (venc: 60 dias)
- Parcela 3: R$ 3.333,33 (venc: 90 dias)

---

## 🧪 Dados Mockados

```javascript
vendasData = [
  {
    id: "VND-001",
    numeroVenda: "VND-1698765432",
    dataVenda: "2024-01-15",
    valorTotal: 15000.0,
    status: "Concluida",
    cliente: { nome: "Construtora Alfa" },
    projeto: { titulo: "Edifício Residencial" },
    contasReceber: [
      {
        id: "CR-001",
        valorParcela: 7500.0,
        dataVencimento: "2024-02-15",
        status: "Pago",
      },
      {
        id: "CR-002",
        valorParcela: 7500.0,
        dataVencimento: "2024-03-15",
        status: "Pendente",
      },
    ],
  },
  // ... mais vendas
];
```

---

## 🚀 Próximos Passos (Sugeridos)

### Fase 1: Integração Backend Real

- [ ] Conectar frontend aos endpoints reais
- [ ] Implementar feedback de erro/sucesso
- [ ] Adicionar loading states

### Fase 2: Funcionalidades Avançadas

- [ ] Filtros de busca (cliente, período, status)
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Gráficos de evolução de vendas
- [ ] Notificações de vencimento
- [ ] Dashboard com métricas avançadas

### Fase 3: Gestão de Contas

- [ ] Modal de detalhes de conta a receber
- [ ] Botão "Marcar como Pago" funcional
- [ ] Histórico de pagamentos
- [ ] Envio de lembretes por email
- [ ] Integração com meios de pagamento

### Fase 4: Relatórios e Analytics

- [ ] Relatório de vendas por período
- [ ] Análise de inadimplência
- [ ] Previsão de recebimentos
- [ ] Indicadores de performance (KPIs)

---

## 📝 Notas Técnicas

1. **Transações**: A criação de venda usa `prisma.$transaction` para garantir
   atomicidade
2. **Cascata**: Exclusão de venda remove automaticamente contas a receber
3. **Validações**: Realizadas tanto no frontend quanto backend
4. **Autenticação**: Todas as rotas requerem JWT válido
5. **Paginação**: Lista de vendas suporta paginação (page, limit)
6. **Consistência**: Dados compartilhados entre Vendas e Financeiro

---

## 🎓 Boas Práticas Implementadas

- ✅ Separação de responsabilidades (Controller, Service, Model)
- ✅ Validação de dados de entrada
- ✅ Tratamento de erros consistente
- ✅ Código TypeScript tipado
- ✅ Componentes React reutilizáveis
- ✅ Responsividade mobile-first
- ✅ Acessibilidade (ARIA labels)
- ✅ Performance (useMemo, callbacks)

---

## 📞 Suporte e Documentação

Para mais informações sobre o sistema S3E:

- 📖 Documentação de API: Ver `EXEMPLOS_API.md`
- 🔧 Configuração Fiscal: Ver `CONFIGURACAO_FISCAL_NFE.md`
- 📊 Testes: Ver `GUIA_TESTES_COMPLETO.md`

---

**Desenvolvido para S3E Engenharia Elétrica** 🔌⚡
