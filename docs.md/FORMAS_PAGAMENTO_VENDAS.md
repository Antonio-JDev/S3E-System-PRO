# 💳 Formas de Pagamento - Sistema S3E

## ✅ Formas de Pagamento Suportadas

O sistema S3E já suporta **4 formas de pagamento** diferentes:

1. **À vista** - Pagamento único
2. **Parcelado** - Pagamento em várias parcelas
3. **Boleto** - Duplicatas bancárias
4. **PIX** - Pagamento instantâneo

---

## 💰 1. À Vista

### Características

- **Parcelas:** 1
- **Entrada:** Não tem
- **Vencimento:** 30 dias após a venda
- **Uso:** Pagamento único, geralmente com desconto

### Exemplo de Requisição

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-001",
  "clienteId": "CLI-001",
  "valorTotal": 75000.00,
  "formaPagamento": "À vista",
  "parcelas": 1,
  "valorEntrada": 0
}
```

### Resultado

```
Venda: R$ 75.000,00
Contas a Receber geradas: 1

Parcela única:
- Valor: R$ 75.000,00
- Vencimento: Data da venda + 30 dias
- Status: Pendente
```

### Frontend

```tsx
<select name="formaPagamento" value="À vista">
  <option value="À vista">À vista</option>
  ...
</select>

<input name="parcelas" value={1} disabled />
```

---

## 📅 2. Parcelado (Cartão/Crediário)

### Características

- **Parcelas:** 1 a 12 (ou mais)
- **Entrada:** Opcional
- **Vencimento:** +30 dias por parcela
- **Uso:** Facilitar pagamento para cliente

### Exemplo 1: Parcelado sem Entrada (3x)

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-001",
  "clienteId": "CLI-001",
  "valorTotal": 75000.00,
  "formaPagamento": "Parcelado",
  "parcelas": 3,
  "valorEntrada": 0
}
```

**Resultado:**

```
Venda: R$ 75.000,00
Contas a Receber: 3

Parcela 1: R$ 25.000,00 (venc: +30 dias)
Parcela 2: R$ 25.000,00 (venc: +60 dias)
Parcela 3: R$ 25.000,00 (venc: +90 dias)
```

---

### Exemplo 2: Parcelado com Entrada (6x)

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

```
Venda: R$ 120.000,00
Entrada: R$ 30.000,00
Restante: R$ 90.000,00
Contas a Receber: 6

Parcela 1: R$ 45.000,00 (entrada + 1ª parcela) (venc: +30 dias)
Parcela 2: R$ 15.000,00 (venc: +60 dias)
Parcela 3: R$ 15.000,00 (venc: +90 dias)
Parcela 4: R$ 15.000,00 (venc: +120 dias)
Parcela 5: R$ 15.000,00 (venc: +150 dias)
Parcela 6: R$ 15.000,00 (venc: +180 dias)
```

---

## 📄 3. Boleto (Duplicata)

### Características

- **Parcelas:** Geralmente 1 a 6
- **Entrada:** Opcional
- **Vencimento:** Customizável (geralmente 30, 60, 90 dias)
- **Uso:** Empresas, pagamento formal

### Exemplo: Boleto em 3 Parcelas

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-001",
  "clienteId": "CLI-001",
  "valorTotal": 75000.00,
  "formaPagamento": "Boleto",
  "parcelas": 3,
  "valorEntrada": 0,
  "observacoes": "Duplicatas 001/003, 002/003, 003/003"
}
```

**Resultado:**

```
Venda: R$ 75.000,00
Contas a Receber: 3 boletos

Boleto 1: R$ 25.000,00 (venc: 30 dias)
Boleto 2: R$ 25.000,00 (venc: 60 dias)
Boleto 3: R$ 25.000,00 (venc: 90 dias)
```

### Diferença para Parcelado

```
Parcelado (Cartão):
- Geralmente sem entrada
- Parcelas mensais fixas
- Automático

Boleto (Duplicata):
- Pode ter entrada
- Vencimentos personalizados
- Requer emissão de boleto bancário
```

---

## ⚡ 4. PIX

### Características

- **Parcelas:** Geralmente 1 (à vista)
- **Entrada:** Não aplicável
- **Vencimento:** Imediato ou poucos dias
- **Uso:** Pagamento instantâneo, desconto

### Exemplo 1: PIX à Vista

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-002",
  "clienteId": "CLI-002",
  "valorTotal": 25000.00,
  "formaPagamento": "PIX",
  "parcelas": 1,
  "valorEntrada": 0
}
```

**Resultado:**

```
Venda: R$ 25.000,00
Contas a Receber: 1

PIX único: R$ 25.000,00 (venc: +7 dias)
```

---

### Exemplo 2: PIX Parcelado (menos comum)

```json
POST /api/vendas/realizar
{
  "orcamentoId": "ORC-2025-003",
  "clienteId": "CLI-003",
  "valorTotal": 60000.00,
  "formaPagamento": "PIX",
  "parcelas": 2,
  "valorEntrada": 30000.00,
  "observacoes": "Cliente solicitou dividir em 2 PIX"
}
```

**Resultado:**

```
Venda: R$ 60.000,00
Contas a Receber: 2

PIX 1: R$ 45.000,00 (entrada + 1ª) (venc: +7 dias)
PIX 2: R$ 15.000,00 (venc: +37 dias)
```

---

## 📊 Comparação das Formas

| Forma         | Parcelas | Entrada  | Vencimento Típico | Quando Usar               |
| ------------- | -------- | -------- | ----------------- | ------------------------- |
| **À vista**   | 1        | Não      | 30 dias           | Desconto, pagamento único |
| **Parcelado** | 1-12     | Opcional | 30, 60, 90...     | Facilitar para cliente    |
| **Boleto**    | 1-6      | Opcional | 30, 60, 90        | Empresas, formal          |
| **PIX**       | 1-2      | Não      | 0-7 dias          | Rápido, instantâneo       |

---

## 🎯 Como o Sistema Trata Cada Forma

### Lógica Atual (Genérica)

```typescript
// O sistema trata todas as formas da mesma maneira:
1. Recebe: formaPagamento (string)
2. Calcula: parcelas, vencimentos
3. Gera: contas a receber
4. Retorna: venda + contas
```

**Comportamento:**

- ✅ Campo `formaPagamento` é armazenado
- ✅ Parcelas calculadas igualmente
- ✅ Vencimentos padrão (+30 dias por parcela)

---

## 💡 Melhorias Sugeridas

### 1. Ajustar Vencimentos por Forma de Pagamento

**Sugestão de implementação:**

```typescript
// backend/src/services/vendas.service.ts

// Calcular data de vencimento baseado na forma de pagamento
const calcularDataVencimento = (
  formaPagamento: string,
  numeroParcela: number
): Date => {
  const data = new Date();

  switch (formaPagamento) {
    case "À vista":
      // 30 dias para pagamento
      data.setDate(data.getDate() + 30);
      break;

    case "PIX":
      // 7 dias para PIX (ou imediato)
      data.setDate(data.getDate() + 7);
      break;

    case "Boleto":
      // 30 dias por boleto (padrão bancário)
      data.setDate(data.getDate() + numeroParcela * 30);
      break;

    case "Parcelado":
      // 30 dias por parcela (padrão de cartão)
      data.setDate(data.getDate() + numeroParcela * 30);
      break;

    default:
      // Padrão: 30 dias
      data.setDate(data.getDate() + numeroParcela * 30);
  }

  return data;
};

// Usar na criação das contas
for (let i = 1; i <= parcelas; i++) {
  const dataVencimento = calcularDataVencimento(formaPagamento, i);

  await tx.contaReceber.create({
    data: {
      vendaId: venda.id,
      descricao: `${formaPagamento} - Parcela ${i}/${parcelas} - Venda ${numeroVenda}`,
      valorParcela: i === 1 ? valorEntrada + valorParcela : valorParcela,
      dataVencimento,
      // ...
    },
  });
}
```

---

### 2. Validações Específicas por Forma

```typescript
// Validar regras de negócio por forma de pagamento
const validarFormaPagamento = (formaPagamento: string, parcelas: number) => {
  switch (formaPagamento) {
    case "À vista":
      if (parcelas > 1) {
        throw new Error("À vista deve ter apenas 1 parcela");
      }
      break;

    case "PIX":
      if (parcelas > 2) {
        throw new Error("PIX suporta no máximo 2 parcelas");
      }
      break;

    case "Boleto":
      if (parcelas > 6) {
        throw new Error("Boleto suporta no máximo 6 parcelas");
      }
      break;

    case "Parcelado":
      if (parcelas > 12) {
        throw new Error("Parcelamento suporta no máximo 12x");
      }
      break;
  }
};
```

---

### 3. Adicionar Campo para Identificação de Boleto

**Sugestão de schema:**

```prisma
model ContaReceber {
  id             String   @id @default(uuid())
  vendaId        String
  descricao      String
  valorParcela   Float
  dataVencimento DateTime
  dataPagamento  DateTime?
  status         String
  numeroParcela  Int?
  totalParcelas  Int?
  observacoes    String?

  // NOVOS CAMPOS SUGERIDOS:
  numeroBoleto   String?  // Número da duplicata (ex: "001/003")
  codigoBarras   String?  // Código de barras do boleto
  linhaDigitavel String?  // Linha digitável
  nossoNumero    String?  // Número do banco

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  venda Venda @relation(fields: [vendaId], references: [id], onDelete: Cascade)
}
```

---

## 🎨 Frontend: Formulário Inteligente

### Comportamento Sugerido

```tsx
const FormularioVenda = () => {
  const [formaPagamento, setFormaPagamento] = useState("À vista");
  const [parcelas, setParcelas] = useState(1);

  // Ajustar limites por forma de pagamento
  const getMaxParcelas = () => {
    switch (formaPagamento) {
      case "À vista":
        return 1;
      case "PIX":
        return 2;
      case "Boleto":
        return 6;
      case "Parcelado":
        return 12;
      default:
        return 12;
    }
  };

  // Ajustar parcelas quando muda forma de pagamento
  useEffect(() => {
    const max = getMaxParcelas();
    if (parcelas > max) {
      setParcelas(max);
    }
  }, [formaPagamento]);

  return (
    <form>
      {/* Forma de Pagamento */}
      <select
        value={formaPagamento}
        onChange={(e) => setFormaPagamento(e.target.value)}
      >
        <option value="À vista">💵 À vista (30 dias)</option>
        <option value="Parcelado">💳 Parcelado (até 12x)</option>
        <option value="Boleto">📄 Boleto/Duplicata (até 6x)</option>
        <option value="PIX">⚡ PIX (instantâneo)</option>
      </select>

      {/* Número de Parcelas (desabilita para À vista) */}
      <input
        type="number"
        name="parcelas"
        value={parcelas}
        onChange={(e) => setParcelas(parseInt(e.target.value))}
        min={1}
        max={getMaxParcelas()}
        disabled={formaPagamento === "À vista"}
      />

      {/* Entrada (opcional para todas menos PIX) */}
      {formaPagamento !== "PIX" && (
        <input
          type="number"
          name="valorEntrada"
          placeholder="Valor de entrada (opcional)"
        />
      )}

      {/* Aviso por forma */}
      {formaPagamento === "PIX" && (
        <div className="bg-yellow-50 border border-yellow-200 p-3">
          ⚡ PIX: Pagamento será validado instantaneamente
        </div>
      )}

      {formaPagamento === "Boleto" && (
        <div className="bg-blue-50 border border-blue-200 p-3">
          📄 Boleto: Duplicatas serão geradas automaticamente
        </div>
      )}
    </form>
  );
};
```

---

## 📊 Exemplos Práticos

### Cenário 1: Obra Pequena - À Vista com Desconto

```json
{
  "orcamentoId": "ORC-2025-010",
  "clienteId": "CLI-005",
  "valorTotal": 15000.0,
  "formaPagamento": "À vista",
  "parcelas": 1,
  "valorEntrada": 0,
  "observacoes": "Desconto de 10% aplicado para pagamento à vista"
}
```

**Vantagem cliente:** Desconto  
**Vantagem S3E:** Recebe mais rápido, sem risco

---

### Cenário 2: Projeto Grande - Boleto 30/60/90

```json
{
  "orcamentoId": "ORC-2025-001",
  "clienteId": "CLI-001",
  "valorTotal": 150000.0,
  "formaPagamento": "Boleto",
  "parcelas": 3,
  "valorEntrada": 50000.0,
  "observacoes": "Entrada + 2 boletos (30/60 dias)"
}
```

**Vantagem cliente:** Prazo formal  
**Vantagem S3E:** Garantia bancária

---

### Cenário 3: Reforma Residencial - Parcelado 6x

```json
{
  "orcamentoId": "ORC-2025-002",
  "clienteId": "CLI-002",
  "valorTotal": 45000.0,
  "formaPagamento": "Parcelado",
  "parcelas": 6,
  "valorEntrada": 7500.0,
  "observacoes": "Parcelamento em cartão de crédito"
}
```

**Vantagem cliente:** Cabe no orçamento mensal  
**Vantagem S3E:** Facilita fechamento

---

### Cenário 4: Serviço Rápido - PIX

```json
{
  "orcamentoId": "ORC-2025-008",
  "clienteId": "CLI-004",
  "valorTotal": 3500.0,
  "formaPagamento": "PIX",
  "parcelas": 1,
  "valorEntrada": 0,
  "observacoes": "Pagamento via PIX - Chave: contato@s3e.com.br"
}
```

**Vantagem cliente:** Instantâneo, sem taxas  
**Vantagem S3E:** Recebe na hora, confirmação automática

---

## 🔧 Melhorias Futuras Sugeridas

### Fase 1: Vencimentos Personalizados

```typescript
// Permitir definir vencimentos customizados
interface VendaPayload {
    // ... campos existentes
    datasVencimento?: Date[];  // Array de datas específicas
}

// Uso:
{
  "formaPagamento": "Boleto",
  "datasVencimento": [
    "2025-11-15",  // Boleto 1
    "2025-12-20",  // Boleto 2
    "2026-01-30"   // Boleto 3
  ]
}
```

---

### Fase 2: Integração com Gateway de Pagamento

```typescript
// Gerar boleto automaticamente
if (formaPagamento === "Boleto") {
  const boletos = await BoletoService.gerarBoletos({
    vendaId: venda.id,
    contasReceber,
  });

  // Retorna com links dos boletos
  return { venda, contasReceber, boletos };
}

// Gerar QR Code PIX
if (formaPagamento === "PIX") {
  const qrCode = await PIXService.gerarQRCode({
    valor: valorTotal,
    descricao: `Venda ${numeroVenda}`,
  });

  return { venda, contasReceber, qrCode };
}
```

---

### Fase 3: Taxas e Descontos por Forma

```prisma
model Venda {
  // ... campos existentes

  taxaCartao      Float?   // Taxa do cartão (ex: 3.5%)
  descontoAVista  Float?   // Desconto à vista (ex: 10%)
  valorLiquido    Float?   // Valor após taxas/descontos
}
```

**Cálculo:**

```typescript
// À vista com desconto
if (formaPagamento === "À vista") {
  const desconto = valorTotal * 0.1; // 10%
  const valorLiquido = valorTotal - desconto;
}

// Parcelado com taxa
if (formaPagamento === "Parcelado") {
  const taxa = valorTotal * 0.035; // 3.5%
  const valorLiquido = valorTotal + taxa;
}
```

---

### Fase 4: Status Específicos

```typescript
enum StatusPagamento {
  Pendente = "Pendente",
  Pago = "Pago",
  Atrasado = "Atrasado",

  // Novos status específicos:
  AguardandoPIX = "Aguardando PIX",
  BoletoEmitido = "Boleto Emitido",
  BoletoVencido = "Boleto Vencido",
  CartaoAprovado = "Cartão Aprovado",
  CartaoRecusado = "Cartão Recusado",
  EmAnalise = "Em Análise",
}
```

---

## 📱 Interface Frontend Sugerida

### Seleção Inteligente

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Opção 1: À Vista */}
  <button
    onClick={() => setFormaPagamento("À vista")}
    className={`p-4 border-2 rounded-lg ${
      formaPagamento === "À vista"
        ? "border-green-500 bg-green-50"
        : "border-gray-300"
    }`}
  >
    <div className="text-3xl mb-2">💵</div>
    <h3 className="font-bold">À Vista</h3>
    <p className="text-sm text-gray-600">30 dias</p>
    <span className="text-green-600 font-semibold">-10% desconto</span>
  </button>

  {/* Opção 2: Parcelado */}
  <button
    onClick={() => setFormaPagamento("Parcelado")}
    className={`p-4 border-2 rounded-lg ${
      formaPagamento === "Parcelado"
        ? "border-blue-500 bg-blue-50"
        : "border-gray-300"
    }`}
  >
    <div className="text-3xl mb-2">💳</div>
    <h3 className="font-bold">Parcelado</h3>
    <p className="text-sm text-gray-600">até 12x</p>
    <span className="text-blue-600 font-semibold">Sem juros</span>
  </button>

  {/* Opção 3: Boleto */}
  <button
    onClick={() => setFormaPagamento("Boleto")}
    className={`p-4 border-2 rounded-lg ${
      formaPagamento === "Boleto"
        ? "border-orange-500 bg-orange-50"
        : "border-gray-300"
    }`}
  >
    <div className="text-3xl mb-2">📄</div>
    <h3 className="font-bold">Boleto</h3>
    <p className="text-sm text-gray-600">até 6x</p>
    <span className="text-orange-600 font-semibold">Duplicata</span>
  </button>

  {/* Opção 4: PIX */}
  <button
    onClick={() => setFormaPagamento("PIX")}
    className={`p-4 border-2 rounded-lg ${
      formaPagamento === "PIX"
        ? "border-purple-500 bg-purple-50"
        : "border-gray-300"
    }`}
  >
    <div className="text-3xl mb-2">⚡</div>
    <h3 className="font-bold">PIX</h3>
    <p className="text-sm text-gray-600">Instantâneo</p>
    <span className="text-purple-600 font-semibold">Imediato</span>
  </button>
</div>
```

---

## ✅ Status Atual

### O que JÁ funciona:

✅ **Aceita qualquer forma de pagamento** (string livre)  
✅ **Calcula parcelas** automaticamente  
✅ **Gera contas a receber** para todas as formas  
✅ **Armazena forma de pagamento** na venda  
✅ **Frontend tem seletor** com 4 opções

### O que PODE ser melhorado (opcional):

⏳ Vencimentos específicos por forma (PIX = 7 dias, Boleto = 30 dias)  
⏳ Validações de parcelas máximas por forma  
⏳ Integração com gateway de pagamento  
⏳ Geração automática de boletos  
⏳ QR Code PIX automático  
⏳ Taxas e descontos diferenciados

---

## 🚀 Quer que eu implemente as melhorias?

Posso adicionar:

1. **Vencimentos personalizados** por forma de pagamento
2. **Validações específicas** (ex: À vista = 1 parcela apenas)
3. **Descrições melhores** nas contas (ex: "Boleto 1/3" ao invés de "Parcela
   1/3")
4. **Enum de formas de pagamento** (type-safe)

Me avise se quer que eu implemente alguma dessas melhorias! 😊
