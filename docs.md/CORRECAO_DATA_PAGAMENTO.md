# 🐛 Correção: Data de Pagamento em Contas a Pagar

## 🎯 Problema Identificado

Ao registrar um pagamento com data passada (ex: 24/10/2025), o sistema estava
salvando com a data atual (21/01/2026) ao invés da data informada pelo usuário.

### **Exemplo:**

```
Usuário informa:     24/10/2025
Sistema salvava:     21/01/2026  ❌

Resultado esperado:  24/10/2025  ✅
```

---

## 🔍 Causa Raiz

O método `pagarConta` no backend estava **ignorando** a data fornecida pelo
usuário e sempre usando `new Date()` (data atual):

```typescript
// ❌ ANTES (backend/src/services/contasPagar.service.ts)
static async pagarConta(id: string) {
    await prisma.contaPagar.update({
        where: { id },
        data: {
            status: ContaStatus.Pago,
            dataPagamento: new Date(),  // ❌ Sempre data atual!
        }
    });
}
```

---

## ✅ Solução Implementada

### **1. Backend - Service Atualizado**

**Arquivo:** `backend/src/services/contasPagar.service.ts`

**Modificações:**

```typescript
// ✅ DEPOIS
static async pagarConta(
    id: string,
    dataPagamento?: string | Date,  // ✅ Aceita data do usuário
    valorPago?: number,
    observacoes?: string
) {
    // Parsear data corretamente (evita problema de timezone)
    let dataPagamentoFinal: Date;

    if (dataPagamento) {
        if (typeof dataPagamento === 'string') {
            // Se for YYYY-MM-DD, criar data local
            if (dataPagamento.includes('-') && !dataPagamento.includes('T')) {
                const [ano, mes, dia] = dataPagamento.split('-').map(Number);
                dataPagamentoFinal = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
            } else {
                dataPagamentoFinal = new Date(dataPagamento);
            }
        } else {
            dataPagamentoFinal = dataPagamento;
        }
    } else {
        // Se não informou, usar data atual
        dataPagamentoFinal = new Date();
    }

    await prisma.contaPagar.update({
        where: { id },
        data: {
            status: ContaStatus.Pago,
            dataPagamento: dataPagamentoFinal,  // ✅ Usa data do usuário!
            observacoes: observacoes || conta.observacoes,
        }
    });
}
```

**Melhorias:**

- ✅ Aceita data fornecida pelo usuário
- ✅ Se não informar data, usa data atual (default)
- ✅ Parse correto de datas (evita bug de timezone)
- ✅ Aceita observações opcionais

---

### **2. Backend - Controller Atualizado**

**Arquivo:** `backend/src/controllers/contasPagarController.ts`

**Modificações:**

```typescript
// ✅ DEPOIS
static async pagarConta(req: Request, res: Response) {
    const { id } = req.params;
    const { dataPagamento, valorPago, observacoes } = req.body;

    console.log('💳 Registrando pagamento:', {
        id,
        dataPagamento,    // ✅ Log para debug
        valorPago,
        observacoes
    });

    // ✅ Passar dados do formulário para o serviço
    const conta = await ContasPagarService.pagarConta(
        id,
        dataPagamento,    // ✅ Data do usuário
        valorPago,
        observacoes
    );

    res.json({
        success: true,
        message: 'Conta a pagar marcada como paga',
        data: conta
    });
}
```

**Melhorias:**

- ✅ Extrai dados do body da requisição
- ✅ Passa para o serviço corretamente
- ✅ Log de debug para rastreamento

---

### **3. Frontend - Já Estava Correto**

**Arquivo:** `frontend/src/components/ContasAPagar.tsx`

O frontend já estava enviando a data corretamente:

```typescript
// ✅ Estado inicial: data de hoje (sugestão)
const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().split('T')[0]
);

// ✅ Input permite editar a data
<input
    type="date"
    value={dataPagamento}
    onChange={(e) => setDataPagamento(e.target.value)}
/>

// ✅ Envia data para o backend
await financeiroService.pagarContaPagar(contaSelecionada.id, {
    dataPagamento,     // Data escolhida pelo usuário
    valorPago: parseFloat(valorPago),
    observacoes: observacoesPagamento
});
```

---

## 🧪 Como Testar

### **Teste 1: Pagamento com Data Passada**

1. Acesse **Contas a Pagar**
2. Clique em "Pagar" em uma conta pendente
3. No modal "Registrar Pagamento":
   - **Data do Pagamento:** Informe `24/10/2025` (data passada)
   - **Valor Pago:** Mantenha o valor sugerido
   - **Observações:** (opcional) "Pagamento efetuado no ano passado"
4. Clique em **"Confirmar Pagamento"**

**Resultado Esperado:**

```
✅ Conta marcada como paga
✅ Data salva no banco: 24/10/2025
✅ Aparece na listagem: "Pago: 24/10/2025"
```

---

### **Teste 2: Pagamento com Data Futura**

1. Registre pagamento com data futura: `15/03/2026`
2. Confirme

**Resultado Esperado:**

```
✅ Sistema aceita data futura
✅ Data salva: 15/03/2026
```

---

### **Teste 3: Pagamento Sem Alterar Data**

1. Abra modal de pagamento
2. **Não altere** o campo "Data do Pagamento" (mantém data de hoje)
3. Confirme

**Resultado Esperado:**

```
✅ Data salva: Data atual (21/01/2026)
```

---

## 📊 Comparação: Antes vs Depois

### **Cenário 1: Pagamento em 24/10/2025**

```
┌─────────────────────────────────────────────────┐
│ Antes (Bug):                                    │
│                                                 │
│ Usuário informa:    24/10/2025                 │
│ Sistema salvava:    21/01/2026  ❌             │
│ (Ignorava data do usuário!)                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Depois (Corrigido):                             │
│                                                 │
│ Usuário informa:    24/10/2025                 │
│ Sistema salva:      24/10/2025  ✅             │
│ (Respeita data do usuário!)                    │
└─────────────────────────────────────────────────┘
```

---

### **Cenário 2: Pagamento Hoje**

```
┌─────────────────────────────────────────────────┐
│ Antes:                                          │
│                                                 │
│ Campo sugere:       21/01/2026                 │
│ Usuário mantém:     21/01/2026                 │
│ Sistema salvava:    21/01/2026  ✅             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Depois:                                         │
│                                                 │
│ Campo sugere:       21/01/2026                 │
│ Usuário mantém:     21/01/2026                 │
│ Sistema salva:      21/01/2026  ✅             │
│ (Mesmo comportamento)                          │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Fluxo Completo

### **1. Usuário Abre Modal:**

```
Modal "Registrar Pagamento"
├─ Data do Pagamento: [21/01/2026]  ← Sugestão (hoje)
├─ Valor Pago: R$ 1.351,43
└─ Observações: (vazio)
```

### **2. Usuário Edita Data:**

```
Modal "Registrar Pagamento"
├─ Data do Pagamento: [24/10/2025]  ← Editada pelo usuário
├─ Valor Pago: R$ 1.351,43
└─ Observações: "Pagamento atrasado"
```

### **3. Sistema Processa:**

```
Frontend envia:
POST /api/contas-pagar/:id/pagar
{
    "dataPagamento": "2025-10-24",
    "valorPago": 1351.43,
    "observacoes": "Pagamento atrasado"
}

Backend processa:
├─ Extrai dataPagamento do body
├─ Converte para Date local
└─ Salva no banco: 24/10/2025 12:00:00
```

### **4. Resultado:**

```
Banco de Dados:
├─ status: "Pago"
├─ dataPagamento: 2025-10-24T15:00:00.000Z (UTC)
├─ observacoes: "Pagamento atrasado"
└─ updatedAt: 2026-01-21T...

Frontend exibe:
├─ Status: 🟢 Pago
└─ Pago: 24/10/2025  ✅
```

---

## ⚠️ Importante: Timezone

A função de parse de data usa o mesmo padrão da correção anterior:

```typescript
// Para strings YYYY-MM-DD
const [ano, mes, dia] = dataPagamento.split("-").map(Number);
const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);

// Cria data local às 12:00 (evita problema de timezone)
```

Isso garante que:

- ✅ Data informada = Data salva
- ✅ Sem bug de -1 dia
- ✅ Funciona em qualquer timezone

---

## 📋 Checklist de Validação

Após a correção:

- [ ] Registrar pagamento com data passada (24/10/2025)
- [ ] Verificar que salvou 24/10/2025 (não 21/01/2026)
- [ ] Registrar pagamento com data de hoje
- [ ] Verificar que salvou data de hoje
- [ ] Registrar pagamento com data futura
- [ ] Verificar que salvou data futura
- [ ] Ver listagem e confirmar datas corretas
- [ ] Verificar observações foram salvas

---

## 🔧 Arquivos Modificados

```
✅ backend/src/services/contasPagar.service.ts
   └─ Método pagarConta() atualizado
   └─ Aceita parâmetros opcionais (dataPagamento, valorPago, observacoes)
   └─ Parse correto de datas

✅ backend/src/controllers/contasPagarController.ts
   └─ Extrai dados do body
   └─ Passa para o serviço
   └─ Log de debug adicionado

✅ frontend/src/components/ContasAPagar.tsx
   └─ Já estava correto (não modificado)
```

---

## 💡 Melhorias Implementadas

Além de corrigir o bug, a solução também:

1. ✅ **Aceita observações**: Campo opcional para anotar detalhes do pagamento
2. ✅ **Aceita valor pago**: Preparado para validações futuras
3. ✅ **Parse seguro de datas**: Evita problemas de timezone
4. ✅ **Logs de debug**: Facilita rastreamento de problemas
5. ✅ **Documentação completa**: Código comentado e explicado

---

## ✅ Resultado Final

**Bug Corrigido!** Agora o sistema:

✅ Mostra data de **hoje como sugestão** no campo  
✅ Permite usuário **alterar** para qualquer data  
✅ **Salva exatamente** a data que o usuário informou  
✅ Aceita datas **passadas**, **presentes** e **futuras**  
✅ Exibe corretamente na listagem

---

**Sistema S3E - Correção de Data de Pagamento v1.0**  
_"Agora você registra o pagamento na data que realmente aconteceu!"_ ✅
