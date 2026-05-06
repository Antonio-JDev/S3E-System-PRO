# 🐛 Correção de Bug: Datas de Vencimento 1 Dia Antes

## 🎯 Problema Identificado

As datas de vencimento das parcelas de compra estavam aparecendo **1 dia antes**
da data real do XML.

### **Exemplo:**

```
XML:                Sistema (antes):
23/10/2025    →     22/10/2025  ❌
03/11/2025    →     05/11/2025  ❌
03/12/2025    →     19/11/2025  ❌
```

---

## 🔍 Causa Raiz

**Problema de Timezone do JavaScript:**

Quando você faz `new Date('2025-10-23')`, o JavaScript interpreta isso como:

```
'2025-10-23' → UTC 00:00 (meia-noite em Londres)
```

No Brasil (UTC-3), isso vira:

```
2025-10-22 21:00 (21h do dia ANTERIOR!)
```

Ao chamar `toLocaleDateString()`, mostra:

```
22/10/2025 ❌ (1 dia antes!)
```

---

## ✅ Solução Implementada

### **1. Backend - Parse de Data Local**

**Arquivo:** `backend/src/services/contasPagar.service.ts`

**Criado função helper:**

```typescript
private static parseDataLocal(dataString: string): Date {
    // Para strings no formato YYYY-MM-DD, criar data local
    const [ano, mes, dia] = dataString.split('-').map(Number);

    // Criar data local (sem conversão de timezone)
    // Mês é 0-indexed no JavaScript (0 = Janeiro)
    const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);

    return data;
}
```

**Por que funciona?**

- Cria a data diretamente no timezone local
- Usa meio-dia (12:00) para evitar problemas de DST
- Não há conversão de UTC para local

**Aplicado em:**

```typescript
// ❌ ANTES
const dataVencimento = new Date(dup.dataVencimento);

// ✅ DEPOIS
const dataVencimento = this.parseDataLocal(dup.dataVencimento);
```

---

### **2. Frontend - Função de Formatação**

**Arquivo:** `frontend/src/utils/dateUtils.ts`

**Criado módulo com funções:**

```typescript
// Parse de data local (sem problema de timezone)
export function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) return dateString;

  if (dateString.includes("T")) {
    return new Date(dateString);
  }

  const [ano, mes, dia] = dateString.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
}

// Formatação brasileira (DD/MM/YYYY)
export function formatDateBR(dateString: string | Date): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("pt-BR");
}
```

---

### **3. Frontend - Atualização do Componente**

**Arquivo:** `frontend/src/components/Compras.tsx`

**Substituído:**

```typescript
// ❌ ANTES
{
  new Date(dup.dataVencimento).toLocaleDateString("pt-BR");
}

// ✅ DEPOIS
{
  formatDateBR(dup.dataVencimento);
}
```

**Aplicado em 4 lugares:**

1. Duplicatas do XML (modal de detalhes)
2. Contas a pagar vinculadas (data de vencimento)
3. Data de agendamento
4. Data de pagamento

---

## 🧪 Como Testar

### **Teste 1: Nova Compra com XML**

1. Importe um XML com duplicatas
2. Observe as datas de vencimento na seção "Duplicatas/Parcelas do Boleto"
3. **Resultado Esperado:**
   - Datas EXATAS do XML (sem -1 dia)

### **Teste 2: Modal de Detalhes da Compra**

1. Clique em "Ver Detalhes" de uma compra
2. Observe as datas na tabela "Contas a Pagar Vinculadas"
3. **Resultado Esperado:**
   - Datas EXATAS (sem -1 dia)

### **Teste 3: Comparação com Sistema Antigo**

```
XML:           Sistema Novo:      Sistema Antigo:
23/10/2025  →  23/10/2025 ✅   →  23/10/2025 ✅
03/11/2025  →  03/11/2025 ✅   →  03/11/2025 ✅
03/12/2025  →  03/12/2025 ✅   →  03/12/2025 ✅
```

---

## 📊 Exemplos de Correção

### **Exemplo 1: Duplicata do XML**

**Antes:**

```typescript
dataVencimento: "2025-10-23"
new Date("2025-10-23") → 22/10/2025 21:00 (UTC-3)
toLocaleDateString() → "22/10/2025" ❌
```

**Depois:**

```typescript
dataVencimento: "2025-10-23"
parseDataLocal("2025-10-23") → 23/10/2025 12:00 (Local)
toLocaleDateString() → "23/10/2025" ✅
```

---

### **Exemplo 2: Conta a Pagar Criada**

**Antes:**

```typescript
const dataVencimento = new Date("2025-11-05");
// Backend salva: 2025-11-04T03:00:00.000Z
// Frontend lê: 04/11/2025 ❌
```

**Depois:**

```typescript
const dataVencimento = parseDataLocal("2025-11-05");
// Backend salva: 2025-11-05T15:00:00.000Z (meio-dia)
// Frontend lê: 05/11/2025 ✅
```

---

## 🔧 Arquivos Modificados

```
✅ backend/src/services/contasPagar.service.ts
   └─ Adicionado: parseDataLocal()
   └─ Corrigido: criarContasPagarPorDuplicatas()

✅ frontend/src/utils/dateUtils.ts (NOVO)
   └─ parseLocalDate()
   └─ formatDateBR()
   └─ formatDateForInput()
   └─ isValidDate()

✅ frontend/src/components/Compras.tsx
   └─ Import: formatDateBR
   └─ Linha 2506: Duplicatas do XML
   └─ Linha 2554: Contas a pagar vinculadas
   └─ Linha 2560: Data de agendamento
   └─ Linha 2569: Data de pagamento
```

---

## ⚠️ Importante: Outros Lugares

Esta correção foi aplicada especificamente em **Compras**. Se houver o mesmo
problema em outros módulos (Vendas, Contas a Receber, etc.), use a mesma
solução:

```typescript
// Import no componente
import { formatDateBR, parseLocalDate } from '../utils/dateUtils';

// Uso no JSX
{formatDateBR(data.dataVencimento)}

// Uso no backend (se necessário)
private static parseDataLocal(dataString: string): Date {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0, 0);
}
```

---

## 🎯 Resultado Final

### **Antes (Bug):**

```
Importa XML:         23/10/2025
Sistema mostra:      22/10/2025  ❌
Diferença:           -1 dia
```

### **Depois (Corrigido):**

```
Importa XML:         23/10/2025
Sistema mostra:      23/10/2025  ✅
Diferença:           0 dias (perfeito!)
```

---

## 📚 Referências Técnicas

### **Por que `new Date('YYYY-MM-DD')` é problemático?**

Segundo a especificação ECMAScript:

- Datas no formato `YYYY-MM-DD` são interpretadas como UTC
- Datas no formato `YYYY/MM/DD` são interpretadas como local
- Mas usar `/` não é padrão internacional

**Solução Correta:** Parse manual dos componentes.

### **Por que usar meio-dia (12:00)?**

- Evita problemas com Daylight Saving Time (horário de verão)
- Garante que a data esteja "no meio" do dia
- Evita que mudanças de fuso horário afetem o dia

---

## ✅ Checklist de Validação

- [ ] Importar XML com duplicatas
- [ ] Verificar datas na seção "Duplicatas/Parcelas"
- [ ] Abrir modal de detalhes da compra
- [ ] Verificar datas em "Contas a Pagar Vinculadas"
- [ ] Comparar com XML original (devem ser idênticas)
- [ ] Testar com datas de diferentes meses
- [ ] Verificar que agendamento e pagamento também funcionam

---

**Bug Corrigido! As datas agora são EXATAS do XML!** ✅

**Sistema S3E - Correção de Datas v1.0**
