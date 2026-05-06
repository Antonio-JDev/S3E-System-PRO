# 💸 Fluxo de Caixa: Saídas em R$ 0,00

## 🔍 Situação Atual

O **Fluxo de Caixa** está exibindo:

- ✅ **Entradas:** R$ 8.000,01 (3 parcelas a receber)
- ❌ **Saídas:** R$ 0,00 (0 contas a pagar)

Isso **não é um erro de código**, mas sim falta de dados cadastrados no sistema.

---

## ✅ O Código Está Correto!

O serviço de Fluxo de Caixa **já busca** todas as fontes de saídas:

### **Arquivo:** `backend/src/services/fluxoCaixa.service.ts`

```typescript
// 1. CONTAS A PAGAR (Fornecedores)
const contasPagar = await prisma.contaPagar.findMany({
  where: {
    dataVencimento: {
      gte: dataInicio, // Próximos 30/60/90 dias
      lte: dataFim,
    },
    status: {
      in: ["Pendente", "Pago"], // Pendentes e pagas
    },
  },
});

// 2. DESPESAS FIXAS (RH, Frota, Luz, etc.)
const despesasFixas = await prisma.despesaFixa.findMany({
  where: {
    ativa: true, // Apenas despesas ativas
  },
});

// 3. DISTRIBUIR DESPESAS FIXAS AO LONGO DO PERÍODO
const despesasFixasMensais = despesasFixas.reduce(
  (total, d) => total + d.valor,
  0
);
const despesasFixasDiarias = despesasFixasMensais / 30;

// ✅ As despesas fixas são distribuídas diariamente no fluxo
```

---

## 🎯 Por que está em R$ 0,00?

### **Motivo 1: Sem Contas a Pagar de Fornecedores**

```sql
SELECT * FROM ContaPagar
WHERE dataVencimento >= '2026-01-21'
  AND dataVencimento <= '2026-04-21'
  AND status IN ('Pendente', 'Pago');

-- RESULTADO: 0 registros ❌
```

**O que falta:**

- Compras de materiais com pagamento parcelado
- Boletos de fornecedores com vencimento futuro
- Notas fiscais com duplicatas a vencer

---

### **Motivo 2: Sem Despesas Fixas Cadastradas**

```sql
SELECT * FROM DespesaFixa
WHERE ativa = true;

-- RESULTADO: 0 registros ❌
```

**O que falta:**

- Salários mensais (RH)
- Luz, água, internet
- Aluguel
- Seguro da frota
- Manutenções periódicas

---

## 🔧 Como Popular as Saídas?

### **1. Cadastrar Compras com Pagamento Futuro**

Quando você faz uma **compra de material**, o sistema deve gerar contas a pagar
automaticamente:

```
Exemplo:
├─ Compra de cabos: R$ 10.000,00
├─ Fornecedor: WEG
├─ Pagamento: 3x (30/60/90 dias)
│
└─ Sistema cria automaticamente:
    ├─ Conta a Pagar 1: R$ 3.333,33 (Venc: 19/02/2026)
    ├─ Conta a Pagar 2: R$ 3.333,33 (Venc: 21/03/2026)
    └─ Conta a Pagar 3: R$ 3.333,34 (Venc: 20/04/2026)

✅ Essas contas aparecem automaticamente no Fluxo de Caixa!
```

---

### **2. Cadastrar Despesas Fixas**

#### **Exemplo: Folha de Pagamento (RH)**

```typescript
// Endpoint: POST /api/financeiro/despesas-fixas

{
  "descricao": "Folha de Pagamento - Eletricistas",
  "valor": 15000.00,
  "categoria": "RH",
  "diaVencimento": 5,  // Todo dia 5 de cada mês
  "ativa": true
}
```

**Resultado:**

- ✅ R$ 15.000,00 distribuídos diariamente no fluxo
- ✅ Aparece como saída fixa nos próximos 90 dias

---

#### **Exemplo: Energia Elétrica**

```typescript
{
  "descricao": "Conta de Luz - Escritório",
  "valor": 800.00,
  "categoria": "UTILIDADES",
  "diaVencimento": 10,
  "ativa": true
}
```

---

#### **Exemplo: Seguro da Frota**

```typescript
{
  "descricao": "Seguro Mensal - Caminhão Placa ABC-1234",
  "valor": 500.00,
  "categoria": "FROTA",
  "diaVencimento": 15,
  "ativa": true
}
```

---

### **3. Importar XMLs de Compras**

Quando você importa um **XML de compra**, o sistema automaticamente:

```
XML de Compra:
├─ Nota Fiscal: NF-82990
├─ Fornecedor: LUMIBRAS
├─ Valor Total: R$ 4.054,29
├─ Duplicatas:
│   ├─ Parcela 1: R$ 1.351,43 (Venc: 23/10/2025)
│   ├─ Parcela 2: R$ 1.351,43 (Venc: 23/11/2025)
│   └─ Parcela 3: R$ 1.351,43 (Venc: 23/12/2025)
│
└─ Sistema gera automaticamente:
    ├─ ✅ 3 registros em ContaPagar
    └─ ✅ Aparecem no Fluxo de Caixa se vencimento for futuro
```

---

## 📊 Exemplo de Fluxo Completo

### **Situação Atual (Sem Saídas):**

```
┌─────────────────────────────────────────┐
│ Fluxo de Caixa - 90 dias                │
├─────────────────────────────────────────┤
│ ENTRADAS:     R$ 8.000,01  ✅           │
│ SAÍDAS:       R$ 0,00      ❌           │
│ SALDO FINAL:  R$ 7.557,17               │
│                                         │
│ Gráfico:                                │
│   📈 Linha só sobe (irreal)             │
└─────────────────────────────────────────┘
```

---

### **Situação Esperada (Com Saídas):**

```
┌─────────────────────────────────────────┐
│ Fluxo de Caixa - 90 dias                │
├─────────────────────────────────────────┤
│ ENTRADAS:     R$ 8.000,01  ✅           │
│ SAÍDAS:       R$ 12.500,00 ✅           │
│   ├─ Fornecedores:  R$ 10.000,00        │
│   ├─ RH (Salários): R$ 2.000,00         │
│   └─ Fixas:         R$ 500,00           │
│ SALDO FINAL:  R$ -4.942,83 ⚠️           │
│                                         │
│ Gráfico:                                │
│   📉 Linha sobe e desce (realista)      │
│   🔴 Dias críticos em vermelho          │
└─────────────────────────────────────────┘
```

---

## 🎯 O que Fazer Agora?

### **Passo 1: Cadastrar Despesas Fixas**

Acesse **Financeiro → Despesas Fixas** e cadastre:

```
☐ Folha de Pagamento (R$ 15.000/mês)
☐ Luz (R$ 800/mês)
☐ Água (R$ 200/mês)
☐ Internet (R$ 150/mês)
☐ Aluguel (R$ 3.000/mês)
☐ Seguro Frota (R$ 500/mês)
☐ Contador (R$ 1.000/mês)
```

**Total:** ~R$ 20.650/mês de saídas fixas

---

### **Passo 2: Importar Compras com Pagamento Futuro**

Importe XMLs de compras recentes que tenham vencimento nos próximos 90 dias.

**Exemplo:**

```
Compra de 19/01/2026:
├─ Cabos: R$ 5.000,00 (Venc: 19/02/2026)
├─ Disjuntores: R$ 3.000,00 (Venc: 19/03/2026)
└─ Conduítes: R$ 2.000,00 (Venc: 19/04/2026)

✅ Total de R$ 10.000,00 em saídas futuras
```

---

### **Passo 3: Verificar Fluxo Atualizado**

Após cadastrar despesas fixas e importar compras:

```
✅ Saídas passam de R$ 0,00 para ~R$ 12.000+
✅ Gráfico mostra entradas e saídas
✅ Linha de saldo sobe e desce realisticamente
✅ Dias críticos aparecem em vermelho
```

---

## 🔄 Fluxo Automático de Saídas

### **Como as Saídas São Populadas Automaticamente:**

```
┌─────────────────────────────────────────────────┐
│ 1. NOVA COMPRA DE MATERIAL                      │
├─────────────────────────────────────────────────┤
│ Usuário importa XML com duplicatas              │
│         ↓                                       │
│ Sistema cria registros em ContaPagar            │
│         ↓                                       │
│ Fluxo de Caixa busca ContaPagar futuras         │
│         ↓                                       │
│ ✅ Saídas aparecem automaticamente no gráfico   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 2. DESPESA FIXA CADASTRADA                      │
├─────────────────────────────────────────────────┤
│ Usuário cadastra "Folha de Pagamento"           │
│         ↓                                       │
│ Sistema registra em DespesaFixa                 │
│         ↓                                       │
│ Fluxo de Caixa distribui valor diariamente      │
│         ↓                                       │
│ ✅ Saídas fixas aparecem distribuídas no fluxo  │
└─────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Verificação

Para garantir que o Fluxo de Caixa mostre todas as saídas:

### **Contas a Pagar:**

- [ ] Importar XMLs de compras recentes
- [ ] Verificar que duplicatas têm vencimento futuro
- [ ] Confirmar que status é "Pendente"

### **Despesas Fixas:**

- [ ] Cadastrar folha de pagamento
- [ ] Cadastrar contas de utilidades (luz, água, internet)
- [ ] Cadastrar aluguel (se houver)
- [ ] Cadastrar seguros (frota, patrimônio)
- [ ] Marcar todas como "ativa: true"

### **Validação:**

- [ ] Acessar Fluxo de Caixa
- [ ] Verificar que Saídas > R$ 0,00
- [ ] Conferir gráfico mostrando barras vermelhas
- [ ] Validar dias críticos (saldo negativo)

---

## 🎯 Resultado Esperado

### **Antes (Situação Atual):**

```
ENTRADAS:  R$ 8.000,01  ✅
SAÍDAS:    R$ 0,00      ❌ (Falta cadastrar)
SALDO:     R$ 7.557,17  ⚠️ (Irreal)
```

### **Depois (Com Dados):**

```
ENTRADAS:  R$ 8.000,01   ✅
SAÍDAS:    R$ 12.500,00  ✅ (Fornecedores + RH + Fixas)
SALDO:     R$ -4.942,83  ⚠️ (Realista - precisa de atenção!)
```

---

## 💡 Por que isso é Importante?

### **Sem Saídas (Atual):**

```
❌ Fluxo de caixa "cor de rosa" (irreal)
❌ Não mostra necessidade de capital de giro
❌ Não alerta sobre dias críticos
❌ Dá falsa sensação de saúde financeira
```

### **Com Saídas (Correto):**

```
✅ Visão realista da situação financeira
✅ Identifica dias com saldo negativo
✅ Permite planejar pagamentos
✅ Alerta sobre necessidade de crédito
✅ Ajuda a negociar prazos com fornecedores
```

---

## 🔗 Endpoints Úteis

### **Cadastrar Despesa Fixa:**

```
POST /api/financeiro/despesas-fixas

{
  "descricao": "Nome da despesa",
  "valor": 1000.00,
  "categoria": "RH | FROTA | UTILIDADES | OUTROS",
  "diaVencimento": 5,
  "ativa": true
}
```

### **Listar Contas a Pagar:**

```
GET /api/contas-pagar?status=Pendente
```

### **Listar Despesas Fixas:**

```
GET /api/financeiro/despesas-fixas
```

---

**Sistema S3E - Fluxo de Caixa com Saídas v1.0**  
_"Cadastre despesas fixas e compras para ver o fluxo real!"_ ✅
