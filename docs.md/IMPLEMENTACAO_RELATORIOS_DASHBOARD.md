# 📊 Implementação de Relatórios e Dashboard Financeiro

## ✅ Resumo Executivo

Implementação completa do **backend de relatórios** para alimentar os gráficos e
estatísticas do dashboard financeiro do sistema S3E, incluindo agregação de
dados mensais, resumos financeiros e análises de vendas.

---

## 🎯 Objetivos Alcançados

### Backend Implementado

1. **✅ Serviço de Relatórios** (`relatorios.service.ts`)
   - Agregação de dados financeiros mensais
   - Cálculo de receitas e despesas
   - Estatísticas de vendas
   - Top clientes por valor
   - Dashboard completo

2. **✅ Controller de Relatórios** (`relatoriosController.ts`)
   - Endpoints para todos os relatórios
   - Tratamento de erros consistente
   - Validações de parâmetros

3. **✅ Rotas Protegidas** (`relatorios.routes.ts`)
   - Autenticação JWT obrigatória
   - Autorização por perfil de usuário
   - Segregação de acessos

4. **✅ Integração Completa**
   - Rotas registradas no app principal
   - Documentação de endpoints
   - Pronto para consumo pelo frontend

---

## 📁 Arquivos Criados

### Backend

#### Criados:

- `backend/src/services/relatorios.service.ts` - Lógica de negócio dos
  relatórios
- `backend/src/controllers/relatoriosController.ts` - Controllers dos endpoints
- `backend/src/routes/relatorios.routes.ts` - Definição das rotas

#### Modificados:

- `backend/src/app.ts` - Integração das rotas de relatórios

---

## 🔌 Endpoints da API

### Base URL: `/api/relatorios`

| Método | Endpoint             | Descrição                 | Permissões                 |
| ------ | -------------------- | ------------------------- | -------------------------- |
| `GET`  | `/dashboard`         | Dashboard completo        | admin, gerente             |
| `GET`  | `/financeiro`        | Dados financeiros mensais | admin, gerente, financeiro |
| `GET`  | `/financeiro/resumo` | Resumo financeiro geral   | admin, gerente, financeiro |
| `GET`  | `/vendas`            | Estatísticas de vendas    | admin, gerente, comercial  |
| `GET`  | `/clientes/top`      | Top clientes              | admin, gerente, comercial  |

---

## 📊 Estrutura de Dados

### 1. Dados Financeiros Mensais

**Endpoint:** `GET /api/relatorios/financeiro`

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "mes": "Nov/2024",
      "receita": 85000.0,
      "despesa": 45000.0,
      "lucro": 40000.0
    },
    {
      "mes": "Dez/2024",
      "receita": 120000.0,
      "despesa": 52000.0,
      "lucro": 68000.0
    }
    // ... últimos 12 meses
  ]
}
```

**Uso:** Gráfico de barras com receitas, despesas e lucro mensal

---

### 2. Resumo Financeiro Geral

**Endpoint:** `GET /api/relatorios/financeiro/resumo`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "totalReceitas": 450000.0,
    "totalDespesas": 250000.0,
    "lucroTotal": 200000.0,
    "contasReceberPendentes": 85000.0,
    "contasPagarPendentes": 35000.0,
    "contasEmAtraso": 15000.0
  }
}
```

**Uso:** Cards de resumo no dashboard

---

### 3. Estatísticas de Vendas

**Endpoint:** `GET /api/relatorios/vendas?meses=12`

**Parâmetros:**

- `meses` (opcional): Número de meses para análise (padrão: 12)

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "mes": "Nov/2024",
      "quantidade": 12,
      "valor": 85000.0
    },
    {
      "mes": "Dez/2024",
      "quantidade": 15,
      "valor": 120000.0
    }
    // ...
  ]
}
```

**Uso:** Gráfico de evolução de vendas

---

### 4. Top Clientes

**Endpoint:** `GET /api/relatorios/clientes/top?limite=10`

**Parâmetros:**

- `limite` (opcional): Número de clientes a retornar (padrão: 10)

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "clienteId": "CLI-001",
      "clienteNome": "Construtora Alfa",
      "valorTotal": 250000.0,
      "quantidadeCompras": 8
    },
    {
      "clienteId": "CLI-003",
      "clienteNome": "Indústria Gama",
      "valorTotal": 180000.0,
      "quantidadeCompras": 5
    }
    // ...
  ]
}
```

**Uso:** Tabela de melhores clientes

---

### 5. Dashboard Completo

**Endpoint:** `GET /api/relatorios/dashboard`

**Resposta:**

```json
{
  "success": true,
  "data": {
    "financeiro": {
      "mensais": [
        /* dados mensais */
      ],
      "resumo": {
        /* resumo geral */
      }
    },
    "vendas": [
      /* estatísticas de vendas */
    ],
    "topClientes": [
      /* top 5 clientes */
    ]
  }
}
```

**Uso:** Carregamento único para todo o dashboard

---

## 🔐 Controle de Acesso

### Perfis de Usuário

| Perfil         | Permissões                         |
| -------------- | ---------------------------------- |
| **admin**      | Acesso total a todos os relatórios |
| **gerente**    | Acesso total a todos os relatórios |
| **financeiro** | Relatórios financeiros e resumos   |
| **comercial**  | Relatórios de vendas e clientes    |
| **user**       | Sem acesso a relatórios            |

### Matriz de Permissões

| Endpoint             | admin | gerente | financeiro | comercial |
| -------------------- | ----- | ------- | ---------- | --------- |
| `/dashboard`         | ✅    | ✅      | ❌         | ❌        |
| `/financeiro`        | ✅    | ✅      | ✅         | ❌        |
| `/financeiro/resumo` | ✅    | ✅      | ✅         | ❌        |
| `/vendas`            | ✅    | ✅      | ❌         | ✅        |
| `/clientes/top`      | ✅    | ✅      | ❌         | ✅        |

---

## 🧮 Lógica de Agregação

### Agregação Mensal

```typescript
// 1. Definir período (últimos 12 meses)
const dataInicio = new Date();
dataInicio.setMonth(dataInicio.getMonth() - 12);

// 2. Buscar dados do banco
const contasReceber = await prisma.contaReceber.findMany({
  where: { dataVencimento: { gte: dataInicio } },
});

// 3. Agrupar por mês
const mesesMap = new Map<string, { receita: number; despesa: number }>();

contasReceber.forEach((conta) => {
  const mesAno = `${mes}/${ano}`;
  mesesMap.get(mesAno).receita += conta.valorParcela;
});

// 4. Formatar resultado
return meses.map((mesAno) => ({
  mes: "Nov/2024",
  receita: 85000.0,
  despesa: 45000.0,
  lucro: 40000.0,
}));
```

### Cálculo de Status

```typescript
// Contas em atraso
const hoje = new Date();
const atrasadas = contas.filter((c) => {
  const vencimento = new Date(c.dataVencimento);
  return vencimento < hoje && c.status === "Pendente";
});
```

---

## 📈 Exemplos de Uso

### Exemplo 1: Carregar Dashboard Completo

```typescript
// Frontend
const carregarDashboard = async () => {
  const response = await fetch("/api/relatorios/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data } = await response.json();

  // Usar dados para preencher:
  // - Gráficos de barras (financeiro.mensais)
  // - Cards de resumo (financeiro.resumo)
  // - Gráfico de vendas (vendas)
  // - Tabela de clientes (topClientes)
};
```

### Exemplo 2: Gráfico de Receitas/Despesas

```typescript
// Transformar dados para Chart.js
const dadosGrafico = data.financeiro.mensais.map((item) => ({
  labels: item.mes,
  datasets: [
    {
      label: "Receitas",
      data: item.receita,
      backgroundColor: "rgba(34, 197, 94, 0.5)",
    },
    {
      label: "Despesas",
      data: item.despesa,
      backgroundColor: "rgba(239, 68, 68, 0.5)",
    },
  ],
}));
```

### Exemplo 3: Cards de Resumo

```typescript
const { resumo } = data.financeiro;

// Card: Total de Receitas
<Card>
    <h3>Receitas</h3>
    <p className="text-3xl font-bold text-green-600">
        R$ {resumo.totalReceitas.toLocaleString('pt-BR')}
    </p>
</Card>

// Card: Lucro
<Card>
    <h3>Lucro</h3>
    <p className="text-3xl font-bold text-blue-600">
        R$ {resumo.lucroTotal.toLocaleString('pt-BR')}
    </p>
</Card>

// Card: Contas em Atraso (alerta)
<Card>
    <h3>Em Atraso</h3>
    <p className="text-3xl font-bold text-red-600">
        R$ {resumo.contasEmAtraso.toLocaleString('pt-BR')}
    </p>
</Card>
```

---

## 🔄 Fluxo de Dados

```
Frontend Dashboard
     ↓
GET /api/relatorios/dashboard
     ↓
RelatoriosController.getDashboardCompleto()
     ↓
RelatoriosService.getDashboardCompleto()
     ↓
Promise.all([
    getDadosFinanceirosMensais(),
    getResumoFinanceiro(),
    getEstatisticasVendas(),
    getTopClientes()
])
     ↓
Prisma → PostgreSQL
     ↓
Agregação e Formatação
     ↓
JSON Response
     ↓
Frontend (gráficos e cards)
```

---

## 🎨 Componentes Frontend Sugeridos

### 1. Dashboard Principal

```tsx
const Dashboard = () => {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    fetch("/api/relatorios/dashboard")
      .then((res) => res.json())
      .then((data) => setDados(data.data));
  }, []);

  return (
    <div>
      <CardsResumo resumo={dados?.financeiro.resumo} />
      <GraficoFinanceiro dados={dados?.financeiro.mensais} />
      <GraficoVendas dados={dados?.vendas} />
      <TabelaTopClientes dados={dados?.topClientes} />
    </div>
  );
};
```

### 2. Gráfico de Barras (Chart.js)

```tsx
import { Bar } from "react-chartjs-2";

const GraficoFinanceiro = ({ dados }) => {
  const chartData = {
    labels: dados.map((d) => d.mes),
    datasets: [
      {
        label: "Receitas",
        data: dados.map((d) => d.receita),
        backgroundColor: "rgba(34, 197, 94, 0.5)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 2,
      },
      {
        label: "Despesas",
        data: dados.map((d) => d.despesa),
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 2,
      },
    ],
  };

  return <Bar data={chartData} options={options} />;
};
```

### 3. Cards de Resumo

```tsx
const CardsResumo = ({ resumo }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
        titulo="Total Receitas"
        valor={resumo.totalReceitas}
        cor="green"
        icone="💰"
      />
      <Card
        titulo="Total Despesas"
        valor={resumo.totalDespesas}
        cor="red"
        icone="💸"
      />
      <Card
        titulo="Lucro Total"
        valor={resumo.lucroTotal}
        cor="blue"
        icone="📈"
      />
    </div>
  );
};
```

---

## 🧪 Testes de API

### Teste 1: Dashboard Completo

```bash
curl -X GET http://localhost:3001/api/relatorios/dashboard \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "financeiro": { ... },
    "vendas": [ ... ],
    "topClientes": [ ... ]
  }
}
```

### Teste 2: Dados Financeiros Mensais

```bash
curl -X GET http://localhost:3001/api/relatorios/financeiro \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

### Teste 3: Top 5 Clientes

```bash
curl -X GET "http://localhost:3001/api/relatorios/clientes/top?limite=5" \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

### Teste 4: Sem Autorização (deve retornar 401)

```bash
curl -X GET http://localhost:3001/api/relatorios/dashboard
```

**Resposta Esperada:**

```json
{
  "error": "Token não fornecido"
}
```

---

## 📊 Performance e Otimização

### Estratégias Aplicadas

1. **Promise.all()** - Consultas paralelas no dashboard completo
2. **Select específico** - Busca apenas campos necessários
3. **Agregação em memória** - Evita múltiplas queries ao banco
4. **Índices no Prisma** - Campos de data indexados
5. **Caching (futuro)** - Redis para dados que mudam pouco

### Métricas Esperadas

| Endpoint        | Tempo Médio | Registros |
| --------------- | ----------- | --------- |
| `/dashboard`    | ~500ms      | Todos     |
| `/financeiro`   | ~200ms      | ~1000     |
| `/vendas`       | ~150ms      | ~500      |
| `/clientes/top` | ~100ms      | ~100      |

---

## 🚀 Próximos Passos

### Fase 1: Frontend

- [ ] Criar componente Dashboard
- [ ] Integrar gráficos (Chart.js ou Recharts)
- [ ] Implementar cards de resumo
- [ ] Adicionar filtros de período

### Fase 2: Recursos Avançados

- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Comparação de períodos
- [ ] Gráficos de pizza (distribuição)
- [ ] Previsões e tendências

### Fase 3: Cache e Performance

- [ ] Implementar Redis para cache
- [ ] Paginação para grandes volumes
- [ ] Lazy loading de gráficos
- [ ] WebSockets para updates em tempo real

### Fase 4: Análises Avançadas

- [ ] Análise de rentabilidade por cliente
- [ ] Análise de sazonalidade
- [ ] Previsão de fluxo de caixa
- [ ] Alertas inteligentes

---

## 🎓 Boas Práticas Aplicadas

- ✅ Separação de responsabilidades (Service/Controller/Route)
- ✅ Agregação eficiente de dados
- ✅ Tratamento de erros consistente
- ✅ Documentação completa
- ✅ Autorização granular por perfil
- ✅ Respostas padronizadas
- ✅ TypeScript para type safety
- ✅ Código limpo e comentado

---

## 📞 Suporte

Para dúvidas sobre relatórios:

- 📖 Ver também: `IMPLEMENTACAO_MODULO_VENDAS.md`
- 📊 Dashboard: Consultar documentação do Chart.js
- 🔧 API: Ver `EXEMPLOS_API.md`

---

**Implementado em 20/10/2025** 📊  
**Sistema S3E Engenharia Elétrica**
