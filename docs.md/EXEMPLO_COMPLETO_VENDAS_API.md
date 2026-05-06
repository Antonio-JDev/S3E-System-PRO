# 🚀 Exemplo Completo - API de Vendas

## 📋 Guia Passo a Passo

Este guia mostra como usar a API de Vendas do sistema S3E do início ao fim.

---

## 🔐 Passo 1: Autenticação

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@s3e.com.br",
    "password": "123456"
  }'
```

### Resposta

```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "830205d8-01b8-4053-b331-642eaa362891",
    "email": "admin@s3e.com.br",
    "name": "Admin S3E",
    "role": "admin"
  }
}
```

**⚠️ Importante:** Salve o `token` para usar nas próximas requisições!

---

## 💰 Passo 2: Realizar uma Venda

### Cenário

```
Orçamento: ORC-2025-001
Cliente: Construtora Alfa (CLI-001)
Valor: R$ 75.000,00
Forma: Parcelado (3x)
Entrada: R$ 25.000,00
```

### Requisição

```bash
curl -X POST http://localhost:3001/api/vendas/realizar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "orcamentoId": "ORC-2025-001",
    "clienteId": "CLI-001",
    "valorTotal": 75000.00,
    "formaPagamento": "Parcelado",
    "parcelas": 3,
    "valorEntrada": 25000.00,
    "observacoes": "Cliente solicitou prazo estendido"
  }'
```

### Resposta

```json
{
  "success": true,
  "message": "Venda realizada com sucesso",
  "data": {
    "venda": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "numeroVenda": "VND-1729436789012",
      "orcamentoId": "ORC-2025-001",
      "dataVenda": "2025-10-20T14:30:00.000Z",
      "valorTotal": 75000.0,
      "status": "Concluida",
      "clienteId": "CLI-001",
      "projetoId": null,
      "formaPagamento": "Parcelado",
      "parcelas": 3,
      "valorEntrada": 25000.0,
      "observacoes": "Cliente solicitou prazo estendido",
      "createdAt": "2025-10-20T14:30:00.000Z",
      "updatedAt": "2025-10-20T14:30:00.000Z"
    },
    "contasReceber": [
      {
        "id": "cr-001",
        "vendaId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "descricao": "Parcela 1/3 - Venda VND-1729436789012",
        "valorParcela": 41666.67,
        "dataVencimento": "2025-11-19T14:30:00.000Z",
        "dataPagamento": null,
        "status": "Pendente",
        "numeroParcela": 1,
        "totalParcelas": 3
      },
      {
        "id": "cr-002",
        "vendaId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "descricao": "Parcela 2/3 - Venda VND-1729436789012",
        "valorParcela": 16666.67,
        "dataVencimento": "2025-12-19T14:30:00.000Z",
        "dataPagamento": null,
        "status": "Pendente",
        "numeroParcela": 2,
        "totalParcelas": 3
      },
      {
        "id": "cr-003",
        "vendaId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "descricao": "Parcela 3/3 - Venda VND-1729436789012",
        "valorParcela": 16666.67,
        "dataVencimento": "2026-01-18T14:30:00.000Z",
        "dataPagamento": null,
        "status": "Pendente",
        "numeroParcela": 3,
        "totalParcelas": 3
      }
    ]
  }
}
```

### 📊 Análise da Resposta

**Venda Criada:**

- ✅ ID único gerado
- ✅ Número de venda único (`VND-timestamp`)
- ✅ Status: `Concluida` (venda foi efetivada)
- ✅ Vinculada ao orçamento aprovado

**Contas a Receber Geradas (3 parcelas):**

| Parcela | Valor        | Vencimento | Cálculo                             |
| ------- | ------------ | ---------- | ----------------------------------- |
| 1/3     | R$ 41.666,67 | +30 dias   | Entrada (25k) + 1ª parcela (16,67k) |
| 2/3     | R$ 16.666,67 | +60 dias   | Restante ÷ 3                        |
| 3/3     | R$ 16.666,67 | +90 dias   | Restante ÷ 3                        |

**Total:** R$ 75.000,00 ✅

---

## 📋 Passo 3: Listar Vendas

### Requisição

```bash
curl -X GET "http://localhost:3001/api/vendas?page=1&limit=10" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Resposta

```json
{
  "success": true,
  "data": {
    "vendas": [
      {
        "id": "a1b2c3d4-...",
        "numeroVenda": "VND-1729436789012",
        "dataVenda": "2025-10-20T14:30:00.000Z",
        "valorTotal": 75000.0,
        "status": "Concluida",
        "cliente": {
          "id": "CLI-001",
          "nome": "Construtora Alfa",
          "cpfCnpj": "11.111.111/0001-11"
        },
        "projeto": null,
        "contasReceber": [
          { "id": "cr-001", "valorParcela": 41666.67, "status": "Pendente" },
          { "id": "cr-002", "valorParcela": 16666.67, "status": "Pendente" },
          { "id": "cr-003", "valorParcela": 16666.67, "status": "Pendente" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

## 💸 Passo 4: Marcar Conta como Paga

### Cenário

Cliente pagou a primeira parcela (R$ 41.666,67).

### Requisição

```bash
curl -X PUT http://localhost:3001/api/vendas/contas/cr-001/pagar \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Resposta

```json
{
  "success": true,
  "message": "Conta marcada como paga",
  "data": {
    "id": "cr-001",
    "vendaId": "a1b2c3d4-...",
    "descricao": "Parcela 1/3 - Venda VND-1729436789012",
    "valorParcela": 41666.67,
    "dataVencimento": "2025-11-19T14:30:00.000Z",
    "dataPagamento": "2025-10-20T15:00:00.000Z", // ✅ Data de pagamento registrada
    "status": "Pago", // ✅ Status atualizado
    "numeroParcela": 1,
    "totalParcelas": 3
  }
}
```

---

## 📊 Passo 5: Visualizar Relatórios

### Dashboard Completo

```bash
curl -X GET http://localhost:3001/api/relatorios/dashboard \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Resposta

```json
{
  "success": true,
  "data": {
    "financeiro": {
      "mensais": [
        {
          "mes": "Nov/2024",
          "receita": 0.0,
          "despesa": 0.0,
          "lucro": 0.0
        },
        // ...
        {
          "mes": "Out/2025",
          "receita": 41666.67, // ✅ Primeira parcela paga!
          "despesa": 0.0,
          "lucro": 41666.67
        }
      ],
      "resumo": {
        "totalReceitas": 41666.67, // Total pago até agora
        "totalDespesas": 0.0,
        "lucroTotal": 41666.67,
        "contasReceberPendentes": 33333.34, // Parcelas 2 e 3
        "contasPagarPendentes": 0.0,
        "contasEmAtraso": 0.0
      }
    },
    "vendas": [
      {
        "mes": "Out/2025",
        "quantidade": 1,
        "valor": 75000.0
      }
    ],
    "topClientes": [
      {
        "clienteId": "CLI-001",
        "clienteNome": "Construtora Alfa",
        "valorTotal": 75000.0,
        "quantidadeCompras": 1
      }
    ]
  }
}
```

---

## 🔄 Fluxo Completo: Do Orçamento ao Relatório

### Passo a Passo

```
1️⃣ CRIAR ORÇAMENTO
POST /api/orcamentos
{
  "clienteId": "CLI-001",
  "projectName": "Edifício Residencial",
  "total": 75000.00,
  "paymentTerms": "3x sem juros"
}
↓
Status: Pendente
↓

2️⃣ CLIENTE APROVA
PUT /api/orcamentos/:id/aprovar
↓
Status: Aprovado ✅
↓

3️⃣ REALIZAR VENDA
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-001",
  "clienteId": "CLI-001",
  "valorTotal": 75000.00,
  "parcelas": 3,
  "valorEntrada": 25000.00
}
↓
Sistema gera automaticamente:
- 1 Venda
- 3 Contas a Receber
↓

4️⃣ CLIENTE PAGA PARCELA
PUT /api/vendas/contas/cr-001/pagar
↓
Conta atualizada:
- status: "Pago"
- dataPagamento: "2025-10-20"
↓

5️⃣ RELATÓRIO ATUALIZADO
GET /api/relatorios/financeiro
↓
Dados agregados:
{
  "mes": "Out/2025",
  "receita": 41666.67,  // ✅ Parcela 1 paga
  "despesa": 0.00,
  "lucro": 41666.67
}
↓

6️⃣ DASHBOARD EXIBE
Frontend renderiza gráfico com:
- Barra verde (receita): R$ 41.666,67
- Barra vermelha (despesa): R$ 0,00
- Lucro: R$ 41.666,67
```

---

## 🎯 Casos de Uso Reais

### Caso 1: Venda à Vista

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-002",
  "clienteId": "CLI-002",
  "valorTotal": 25000.00,
  "formaPagamento": "À vista",
  "parcelas": 1,
  "valorEntrada": 0
}
```

**Resultado:**

- 1 venda criada
- 1 conta a receber de R$ 25.000,00
- Vencimento: +30 dias

---

### Caso 2: Venda Parcelada 6x com Entrada

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-003",
  "clienteId": "CLI-003",
  "valorTotal": 120000.00,
  "formaPagamento": "Parcelado",
  "parcelas": 6,
  "valorEntrada": 30000.00
}
```

**Resultado:**

- Restante: R$ 90.000,00
- 6 parcelas de R$ 15.000,00
- Parcela 1: R$ 45.000,00 (entrada + 1ª)
- Parcelas 2-6: R$ 15.000,00 cada

---

### Caso 3: Consultar Vendas de um Cliente

```bash
# Listar todas as vendas
curl -X GET "http://localhost:3001/api/vendas" \
  -H "Authorization: Bearer TOKEN"

# Buscar venda específica
curl -X GET "http://localhost:3001/api/vendas/a1b2c3d4-..." \
  -H "Authorization: Bearer TOKEN"
```

---

### Caso 4: Cancelar Venda

```bash
curl -X PUT "http://localhost:3001/api/vendas/a1b2c3d4-.../cancelar" \
  -H "Authorization: Bearer TOKEN"
```

**Resultado:**

- Status da venda: `Cancelada`
- Contas a receber: Permanecem (não são excluídas)
- Sistema mantém histórico

---

## 📊 Passo 6: Acompanhar Evolução

### Dados Financeiros Mensais

```bash
curl -X GET http://localhost:3001/api/relatorios/financeiro \
  -H "Authorization: Bearer TOKEN"
```

### Resposta (exemplo após 3 meses)

```json
{
  "success": true,
  "data": [
    {
      "mes": "Out/2025",
      "receita": 41666.67, // Parcela 1 paga
      "despesa": 15000.0,
      "lucro": 26666.67
    },
    {
      "mes": "Nov/2025",
      "receita": 16666.67, // Parcela 2 paga
      "despesa": 12000.0,
      "lucro": 4666.67
    },
    {
      "mes": "Dez/2025",
      "receita": 16666.67, // Parcela 3 paga
      "despesa": 10000.0,
      "lucro": 6666.67
    }
  ]
}
```

---

## 🎨 Frontend: Exibição no Dashboard

### Código React

```tsx
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";

const DashboardFinanceiro = () => {
  const [dadosFinanceiros, setDadosFinanceiros] = useState([]);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/relatorios/financeiro",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { data } = await response.json();
      setDadosFinanceiros(data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const chartData = {
    labels: dadosFinanceiros.map((d) => d.mes),
    datasets: [
      {
        label: "Receitas",
        data: dadosFinanceiros.map((d) => d.receita),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 2,
      },
      {
        label: "Despesas",
        data: dadosFinanceiros.map((d) => d.despesa),
        backgroundColor: "rgba(239, 68, 68, 0.6)",
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Fluxo de Caixa - Últimos 12 Meses",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return "R$ " + value.toLocaleString("pt-BR");
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard Financeiro</h2>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Total Receitas
          </h3>
          <p className="text-3xl font-bold text-green-600">
            R${" "}
            {dadosFinanceiros
              .reduce((sum, d) => sum + d.receita, 0)
              .toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Total Despesas
          </h3>
          <p className="text-3xl font-bold text-red-600">
            R${" "}
            {dadosFinanceiros
              .reduce((sum, d) => sum + d.despesa, 0)
              .toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Lucro Total
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            R${" "}
            {dadosFinanceiros
              .reduce((sum, d) => sum + d.lucro, 0)
              .toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default DashboardFinanceiro;
```

---

## 🔍 Validações e Erros

### Erro 1: Orçamento não aprovado

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-002",  // Status: Pendente
  ...
}
```

**Resposta:**

```json
{
  "error": "Orçamento não está aprovado",
  "status": 400
}
```

---

### Erro 2: Token inválido

```bash
curl -X GET http://localhost:3001/api/vendas \
  -H "Authorization: Bearer TOKEN_INVALIDO"
```

**Resposta:**

```json
{
  "error": "Token inválido",
  "status": 401
}
```

---

### Erro 3: Sem permissão

```bash
# Usuário com role "user" tentando acessar relatórios
curl -X GET http://localhost:3001/api/relatorios/financeiro \
  -H "Authorization: Bearer TOKEN_USER"
```

**Resposta:**

```json
{
  "error": "Acesso negado. Permissão insuficiente.",
  "requiredRoles": ["admin", "financeiro"],
  "status": 403
}
```

---

## 📈 Exemplo Real: Ciclo de 3 Meses

### Mês 1: Outubro (Venda)

```
- Venda realizada: R$ 75.000,00
- Parcelas geradas: 3x
- Primeira parcela paga: R$ 41.666,67
```

**Relatório Out/2025:**

```json
{
  "mes": "Out/2025",
  "receita": 41666.67,
  "despesa": 0.0,
  "lucro": 41666.67
}
```

---

### Mês 2: Novembro (Pagamento)

```
- Cliente paga parcela 2: R$ 16.666,67
```

**Relatório Nov/2025:**

```json
{
  "mes": "Nov/2025",
  "receita": 16666.67,
  "despesa": 0.0,
  "lucro": 16666.67
}
```

---

### Mês 3: Dezembro (Conclusão)

```
- Cliente paga parcela 3: R$ 16.666,67
- Venda totalmente recebida!
```

**Relatório Dez/2025:**

```json
{
  "mes": "Dez/2025",
  "receita": 16666.67,
  "despesa": 0.0,
  "lucro": 16666.67
}
```

**Resumo Acumulado:**

```json
{
  "totalReceitas": 75000.0, // Total da venda
  "totalDespesas": 0.0,
  "lucroTotal": 75000.0,
  "contasReceberPendentes": 0.0, // ✅ Tudo pago!
  "contasPagarPendentes": 0.0,
  "contasEmAtraso": 0.0
}
```

---

## 🧪 Testes Automatizados (Sugestão)

### Teste 1: Criação de Venda

```typescript
describe("Vendas API", () => {
  it("deve criar venda e gerar contas a receber", async () => {
    const response = await request(app)
      .post("/api/vendas/realizar")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orcamentoId: "ORC-2025-001",
        clienteId: "CLI-001",
        valorTotal: 75000,
        parcelas: 3,
        valorEntrada: 25000,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.venda).toBeDefined();
    expect(response.body.data.contasReceber).toHaveLength(3);

    // Verificar primeira parcela (entrada + 1ª)
    expect(response.body.data.contasReceber[0].valorParcela).toBe(41666.67);
  });
});
```

### Teste 2: Agregação Mensal

```typescript
describe("Relatórios API", () => {
  it("deve agregar dados financeiros por mês", async () => {
    const response = await request(app)
      .get("/api/relatorios/financeiro")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(12);
    expect(response.body.data[0]).toHaveProperty("mes");
    expect(response.body.data[0]).toHaveProperty("receita");
    expect(response.body.data[0]).toHaveProperty("despesa");
    expect(response.body.data[0]).toHaveProperty("lucro");
  });
});
```

---

## 🎓 Boas Práticas Aplicadas

### 1. Transações Atômicas

```typescript
await prisma.$transaction(async (tx) => {
    const venda = await tx.venda.create(...);
    const contas = await Promise.all(
        parcelas.map(p => tx.contaReceber.create(...))
    );
});
```

**Benefício:** Garante que venda e contas sejam criadas juntas ou nenhuma seja
criada.

---

### 2. Validações em Camadas

```typescript
// Controller: Validação básica
if (!data.orcamentoId || !data.clienteId) {
  return res.status(400).json({ error: "Dados obrigatórios ausentes" });
}

// Service: Validação de negócio
if (valorTotal <= 0) {
  throw new Error("Valor total deve ser maior que zero");
}
```

---

### 3. Respostas Consistentes

```typescript
// Sucesso
{
  "success": true,
  "message": "...",
  "data": { ... }
}

// Erro
{
  "error": "...",
  "message": "...",
  "status": 400
}
```

---

### 4. Segurança em Camadas

```typescript
// 1. Autenticação
authenticate;

// 2. Autorização
authorize("admin", "financeiro");

// 3. Validação
if (!isValid) throw Error;
```

---

## 📞 Troubleshooting

### Problema 1: "Token inválido"

**Solução:** Fazer login novamente para obter token novo.

### Problema 2: "Orçamento não encontrado"

**Solução:** Verificar se o ID do orçamento está correto e se ele existe no
banco.

### Problema 3: "Acesso negado"

**Solução:** Verificar se o usuário tem a role necessária (admin, financeiro,
etc).

### Problema 4: "Parcelas não somam o total"

**Solução:** Usar arredondamento adequado:

```typescript
valorParcela = Math.round((valorRestante / parcelas) * 100) / 100;
```

---

## 🚀 Instalação e Configuração

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Banco de Dados

```bash
# Criar arquivo .env.development
DATABASE_URL="postgresql://postgres:senha@localhost:5432/s3e_portfolio_dev"
JWT_SECRET="sua_chave_secreta_super_segura"
PORT=3001
```

### 3. Rodar Migrations

```bash
dotenv -e .env.development -- npx prisma migrate dev
```

### 4. Seed do Banco

```bash
npm run seed
```

### 5. Iniciar Servidor

```bash
npm run dev
```

---

## 📚 Documentação Relacionada

- 📖 `IMPLEMENTACAO_MODULO_VENDAS.md` - Detalhes do módulo
- 📊 `IMPLEMENTACAO_RELATORIOS_DASHBOARD.md` - Relatórios
- 🔄 `ATUALIZACAO_VENDAS_ORCAMENTO.md` - Fluxo de orçamentos
- 💰 `ATUALIZACAO_RELATORIOS_CONTAS_PAGAS.md` - Regime de caixa
- 📝 `RESUMO_SESSAO_VENDAS_RELATORIOS.md` - Resumo geral

---

**Guia criado em 20/10/2025** 📚  
**Sistema S3E Engenharia Elétrica** ⚡
