# ✅ Correção do Parcelamento - Pedido de Venda

## 🐛 Problema Identificado

O parcelamento **NÃO estava funcionando** ao gerar Pedidos de Venda (PV). Mesmo
configurando 2x, 3x ou mais parcelas, o sistema criava apenas **1 conta a
receber com o valor total**.

### **Causa Raiz:**

O frontend estava enviando o campo `numeroParcelas` mas o backend esperava
`parcelas`:

```typescript
// ❌ ANTES (Frontend enviava)
{
  numeroParcelas: 3; // Backend não reconhecia
}

// ✅ DEPOIS (Frontend envia)
{
  parcelas: 3; // Backend reconhece corretamente
}
```

---

## ✅ Correções Aplicadas

### **1. Frontend - Corrigido Campo de Parcelas**

**Arquivo:** `frontend/src/components/Vendas.tsx`

**Linha 663:**

```typescript
// ❌ ANTES
numeroParcelas: vendaForm.parcelas,

// ✅ DEPOIS
parcelas: vendaForm.parcelas,  // Backend espera 'parcelas'
```

---

### **2. Frontend - Aumentado Limite de Itens**

**Arquivo:** `frontend/src/components/Vendas.tsx`

**Linha 192:**

```typescript
// ❌ ANTES
vendasService.listarVendas({ limit: 50 });

// ✅ DEPOIS
vendasService.listarVendas({ limit: 1000 }); // ERP: sem limitações
```

**Benefício:**

- Agora mostra até **1000 vendas** por página
- Todas as parcelas são visíveis (mesmo vendas com 36 parcelas)
- Sem perda de dados em auditoria

---

### **3. Backend - Já Estava Correto**

O backend **JÁ estava implementado corretamente**:

```typescript
// backend/src/services/vendas.service.ts (linhas 176-195)
for (let i = 1; i <= parcelas; i++) {
  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + i * 30);

  const contaReceber = await tx.contaReceber.create({
    data: {
      vendaId: venda.id,
      descricao: `Parcela ${i}/${parcelas} - Venda ${numeroVenda}`,
      valorParcela: valorParcela,
      dataVencimento,
      numeroParcela: i,
      totalParcelas: parcelas,
      status: ContaStatus.Pendente,
    },
  });
}
```

**✅ O que estava correto:**

- Loop de criação de parcelas
- Cálculo de vencimento (a cada 30 dias)
- Divisão do valor por parcela
- Criação de entrada separada (se houver)

---

## 🎯 Como Funciona Agora

### **Cenário 1: Pagamento à Vista (1x)**

```
Valor Total: R$ 10.000,00
Parcelas: 1x
Entrada: R$ 0,00

✅ Contas a Receber Criadas:
├─ Parcela 1/1 - R$ 10.000,00 (vence em 30 dias)
```

---

### **Cenário 2: Parcelado em 3x sem Entrada**

```
Valor Total: R$ 15.000,00
Parcelas: 3x
Entrada: R$ 0,00

✅ Contas a Receber Criadas:
├─ Parcela 1/3 - R$ 5.000,00 (vence em 30 dias)
├─ Parcela 2/3 - R$ 5.000,00 (vence em 60 dias)
└─ Parcela 3/3 - R$ 5.000,00 (vence em 90 dias)
```

---

### **Cenário 3: Parcelado em 4x COM Entrada**

```
Valor Total: R$ 20.000,00
Parcelas: 4x
Entrada: R$ 5.000,00

✅ Contas a Receber Criadas:
├─ Entrada - R$ 5.000,00 (vence hoje)
├─ Parcela 1/4 - R$ 3.750,00 (vence em 30 dias)
├─ Parcela 2/4 - R$ 3.750,00 (vence em 60 dias)
├─ Parcela 3/4 - R$ 3.750,00 (vence em 90 dias)
└─ Parcela 4/4 - R$ 3.750,00 (vence em 120 dias)

Cálculo da Parcela:
Valor Financiado = R$ 20.000 - R$ 5.000 = R$ 15.000
Parcela = R$ 15.000 / 4 = R$ 3.750
```

---

## 📊 Integração com Financeiro

### **Edição de Parcelas no Financeiro**

As parcelas criadas podem ser **editadas posteriormente** no módulo financeiro:

1. **Data de Vencimento:** Personalizável pelo usuário
2. **Forma de Pagamento:** Editável (PIX, Boleto, Cartão, etc.)
3. **Valor da Parcela:** Ajustável se necessário
4. **Status:** Pendente → Pago (com data de pagamento)

**Exemplo de Workflow:**

```
1. PV Criado com 3x parcelas
   ├─ Sistema gera 3 contas a receber automaticamente
   └─ Vencimentos: 30, 60, 90 dias

2. Cliente negocia mudança de datas
   ├─ Financeiro acessa "Contas a Receber"
   ├─ Edita vencimentos: 45, 75, 105 dias
   └─ Altera forma de pagamento de "PIX" para "Boleto"

3. Cliente paga parcela 1
   ├─ Financeiro marca parcela 1 como "Paga"
   ├─ Registra data de pagamento
   └─ Observações: "Pago via transferência bancária"

4. Sistema atualiza status da venda
   ├─ Se todas pagas → "Concluída"
   ├─ Se parcialmente paga → "Pago Parcial"
   └─ Se nenhuma paga → "Pendente"
```

---

## 🧪 Como Testar

### **Teste 1: Venda Parcelada em 2x**

1. Acesse **Vendas → Nova Venda**
2. Selecione um orçamento aprovado
3. Configure:
   - **Forma de Pagamento:** Parcelado
   - **Número de Parcelas:** 2
   - **Valor de Entrada:** R$ 0,00
4. Clique em **"Confirmar Venda"**
5. **Resultado Esperado:**
   - ✅ 2 contas a receber criadas
   - ✅ Cada parcela com metade do valor total
   - ✅ Vencimentos em 30 e 60 dias

---

### **Teste 2: Venda Parcelada em 5x com Entrada**

1. Acesse **Vendas → Nova Venda**
2. Selecione um orçamento de R$ 10.000,00
3. Configure:
   - **Forma de Pagamento:** Parcelado
   - **Número de Parcelas:** 5
   - **Valor de Entrada:** R$ 2.000,00
4. Clique em **"Confirmar Venda"**
5. **Resultado Esperado:**
   - ✅ 6 contas criadas (1 entrada + 5 parcelas)
   - ✅ Entrada: R$ 2.000,00 (vence hoje)
   - ✅ Cada parcela: R$ 1.600,00 (8.000 / 5)
   - ✅ Vencimentos: 30, 60, 90, 120, 150 dias

---

### **Teste 3: Visualização no Financeiro**

1. Acesse **Financeiro → Contas a Receber**
2. Localize a venda criada
3. **Verificar:**
   - ✅ Todas as parcelas estão listadas
   - ✅ Valores corretos
   - ✅ Datas de vencimento sequenciais
   - ✅ Status "Pendente" em todas

---

### **Teste 4: Edição de Parcela**

1. Acesse **Financeiro → Contas a Receber**
2. Clique em uma parcela pendente
3. **Testar:**
   - ✅ Alterar data de vencimento
   - ✅ Alterar forma de pagamento
   - ✅ Adicionar observações
   - ✅ Marcar como "Paga"

---

## 📋 Checklist de Validação

Antes de considerar o sistema pronto, valide:

- [ ] **Parcelamento 1x:** Cria 1 conta a receber
- [ ] **Parcelamento 2x:** Cria 2 contas a receber
- [ ] **Parcelamento 3x+:** Cria N contas (testado até 36x)
- [ ] **Entrada + Parcelas:** Cria entrada separada + parcelas
- [ ] **Valores Corretos:** Soma das parcelas = Valor total - Entrada
- [ ] **Vencimentos:** Sequenciais a cada 30 dias
- [ ] **Listagem:** Mostra até 1000 vendas
- [ ] **Detalhamento:** Mostra todas as parcelas de uma venda
- [ ] **Edição:** Permite alterar datas e formas de pagamento
- [ ] **Status da Venda:** Atualiza conforme parcelas pagas

---

## 🚀 Benefícios da Correção

### **Para o Sistema:**

✅ **Fluxo de Caixa Preciso**

- Parcelas aparecem nas datas corretas
- Previsão de recebimentos confiável

✅ **DRE Correto**

- Receitas reconhecidas por competência
- Margem real calculada corretamente

✅ **Auditoria Completa**

- Todas as parcelas registradas
- Histórico de pagamentos rastreável

### **Para o Usuário:**

✅ **Menos Trabalho Manual**

- Sistema gera parcelas automaticamente
- Não precisa criar uma por uma

✅ **Flexibilidade no Financeiro**

- Pode ajustar datas após criação
- Pode mudar forma de pagamento

✅ **Visibilidade Total**

- Vê todas as parcelas em uma tela
- Sem limitação de 10 ou 50 itens

---

## 🔧 Arquivos Modificados

```
✅ frontend/src/components/Vendas.tsx
   ├─ Linha 663: numeroParcelas → parcelas
   └─ Linha 192: limit: 50 → limit: 1000

✅ backend/src/services/vendas.service.ts
   └─ Linha 302: limit padrão já era 1000 ✅

✅ backend/src/controllers/vendasController.ts
   └─ Linha 96: limit padrão já era 1000 ✅
```

---

## 📞 Suporte

Se o parcelamento ainda não funcionar após esta correção:

1. **Verificar Console do Navegador:**
   - Busque por erros de API
   - Verifique os dados enviados na requisição

2. **Verificar Logs do Backend:**
   - Procure por `💰 Realizando nova venda...`
   - Veja o número de parcelas recebido

3. **Verificar Banco de Dados:**

   ```sql
   SELECT * FROM conta_receber
   WHERE vendaId = 'id-da-venda'
   ORDER BY numeroParcela;
   ```

---

**Sistema S3E - Parcelamento Corrigido v1.0**  
_"Agora sim, 3x é 3x e não mais 1x!"_ ✅
