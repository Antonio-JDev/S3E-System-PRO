# 💰 Fluxo de Caixa Futuro - Guia Completo

## 🎯 A Peça Final do Quebra-Cabeça

Com o **Fluxo de Caixa Futuro** implementado, o sistema agora oferece a **tríade
completa de gestão financeira**:

| Ferramenta            | O que mostra                            | Quando usar                           |
| --------------------- | --------------------------------------- | ------------------------------------- |
| **📈 DRE**            | Se a empresa é **lucrativa**            | Avaliar rentabilidade por competência |
| **💎 Lucro Real**     | Quanto **ganha por produto**            | Identificar produtos mais rentáveis   |
| **💰 Fluxo de Caixa** | Quando o dinheiro vai **cair na conta** | Saber se terá caixa para pagar contas |

---

## 🔧 O Que Foi Implementado

### **1. Backend - Serviço de Projeção**

**Arquivo:** `backend/src/services/fluxoCaixa.service.ts`

**Funcionalidades:**

✅ **Cálculo de Fluxo Futuro (30, 60, 90 dias)**

```typescript
calcularFluxoCaixaFuturo(dias: number, modo: 'confirmado' | 'previsao')
```

**Entradas Projetadas:**

- Baseadas em `data_vencimento` das parcelas (Contas a Receber)
- Filtradas por status do PV:
  - **Confirmado**: Apenas vendas concluídas/faturadas
  - **Previsão**: Inclui todas as vendas (até em negociação)

**Saídas Projetadas:**

- Contas a Pagar com vencimento futuro
- Despesas Fixas distribuídas diariamente

**Agrupamentos:**

- 📅 **Por Dia**: Visão granular (ideal para próximos 30 dias)
- 📆 **Por Semana**: Visão intermediária (bom para 60 dias)
- 📊 **Por Mês**: Visão macro (recomendado para 90 dias)

✅ **Saldo Acumulado**

```typescript
Saldo Dia N = Saldo Dia N-1 + Entradas - Saídas
```

✅ **Identificação de Dias Críticos**

- Dias onde `saldoAcumulado < 0`
- Alerta vermelho para falta de liquidez

✅ **Comparação Confirmado vs Previsão**

```typescript
compararConfirmadoVsPrevisao(dias: number)
```

- Mostra diferença entre cenário conservador e otimista
- Ajuda a decidir quando fazer compras grandes

---

### **2. Rotas da API**

```bash
# Calcular fluxo de caixa
GET /api/financeiro/fluxo-caixa?dias=90&modo=confirmado

# Comparar cenários
GET /api/financeiro/fluxo-caixa/comparacao?dias=90

# Buscar movimentações de um dia específico
GET /api/financeiro/fluxo-caixa/dia/2026-01-25
```

---

### **3. Frontend - Interface Visual**

**Arquivo:** `frontend/src/components/FluxoCaixa.tsx`

**Características:**

✅ **Cards de Resumo**

```
┌─────────────────────────────────────────────────────┐
│ SALDO INICIAL │ ENTRADAS │ SAÍDAS │ SALDO FINAL   │
│ R$ 50.000     │ R$ 120K  │ R$ 80K │ R$ 90.000     │
└─────────────────────────────────────────────────────┘
```

✅ **Gráficos Interativos (Chart.js)**

**Gráfico de Barras:**

- Verde: Entradas por período
- Vermelho: Saídas por período
- Comparação visual lado a lado

**Gráfico de Linha:**

- Azul: Saldo acumulado ao longo do tempo
- Área preenchida para melhor visualização
- Linha vermelha no zero (alerta)

✅ **Filtros Dinâmicos**

```
Período:      [ 30 dias ] [ 60 dias ] [ 90 dias ]
Modo:         [ ✅ Confirmado ] [ 📊 Previsão ]
Visualização: [ Diário ] [ Semanal ] [ Mensal ]
```

✅ **Alertas de Liquidez**

```
⚠️ Alerta: 3 Dia(s) com Saldo Negativo

Foram identificados dias onde o saldo acumulado
ficará negativo. Considere renegociar prazos com
fornecedores ou antecipar recebimentos.
```

✅ **Tabela de Movimentações Detalhadas**

```
┌──────────────────────────────────────────────────────┐
│ Data       │ Cliente      │ Descrição  │ Valor      │
├──────────────────────────────────────────────────────┤
│ 25/01/2026 │ COPEL        │ Parcela 1/3│ R$ 5.000   │
│ 28/01/2026 │ SANEPAR      │ Parcela 2/5│ R$ 3.200   │
│ 05/02/2026 │ Prefeitura   │ Entrada    │ R$ 10.000  │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 Como Usar

### **Cenário 1: Planejamento de Compras**

```
1. Acesse Financeiro → Fluxo de Caixa
2. Selecione: 60 dias | Confirmado
3. Observe o gráfico de saldo acumulado

Decisão:
✅ Saldo sempre positivo? → Pode fazer compra grande
❌ Saldo negativo em 15 dias? → Adiar compra ou negociar prazo
```

---

### **Cenário 2: Negociação com Fornecedor**

```
Fornecedor: "Preciso de 50% agora e 50% em 30 dias"
Você: (Abre Fluxo de Caixa)

Gráfico mostra:
├─ Hoje: Saldo R$ 20.000
├─ Em 30 dias: Saldo R$ 45.000 (após receber parcelas)

Decisão:
✅ Aceito! Em 30 dias terei R$ 45K para pagar os 50%
```

---

### **Cenário 3: Identificação de Crise de Liquidez**

```
Alerta aparece:
⚠️ 5 Dia(s) com Saldo Negativo
├─ Dia 15: Saldo -R$ 2.000
├─ Dia 16: Saldo -R$ 5.500
└─ Dia 20: Saldo -R$ 1.200

Ações Possíveis:
1. Antecipar recebimento de parcela grande (dia 25)
2. Renegociar vencimento de conta a pagar (dia 14)
3. Pegar empréstimo curto prazo
4. Pedir entrada maior em nova venda
```

---

### **Cenário 4: Comparação Conservador vs Otimista**

```
Modo Confirmado (apenas vendas fechadas):
└─ Saldo Final: R$ 50.000

Modo Previsão (incluindo em negociação):
└─ Saldo Final: R$ 85.000

Diferença: +R$ 35.000

Decisão:
"Se fechar aqueles 2 orçamentos em negociação,
terei R$ 35K a mais. Posso já encomendar o
material que o cliente pediu, sem arriscar."
```

---

## 📊 Lógica de Cálculo

### **Entradas (Contas a Receber)**

```sql
SELECT * FROM conta_receber
WHERE dataVencimento BETWEEN :dataInicio AND :dataFim
  AND status = 'Pendente'
  AND venda.status = 'Concluida' -- modo confirmado
ORDER BY dataVencimento ASC
```

### **Saídas (Contas a Pagar + Despesas Fixas)**

```sql
SELECT * FROM conta_pagar
WHERE dataVencimento BETWEEN :dataInicio AND :dataFim
  AND status = 'Pendente'

-- Plus:
Despesas Fixas Mensais / 30 (distribuição diária)
```

### **Saldo Acumulado**

```typescript
let saldoAcumulado = saldoInicial; // Caixa disponível hoje

for (cada dia no período) {
    entradas = somaParcelasDoDia();
    saidas = somaContasPagarDoDia() + despesasFixasDiarias;

    saldoDia = entradas - saidas;
    saldoAcumulado += saldoDia;

    if (saldoAcumulado < 0) {
        marcarDiaComoCritico();
    }
}
```

---

## 🎨 Diferencial: Confirmado vs Previsão

### **Modo Confirmado (Conservador)** ✅

```
Inclui APENAS:
├─ Vendas com status "Concluída"
├─ Vendas já faturadas
└─ Parcelas de vendas fechadas

Ideal para:
├─ Planejamento conservador
├─ Decisões de pagamentos imediatos
└─ Análise de liquidez real
```

### **Modo Previsão (Otimista)** 📊

```
Inclui:
├─ Vendas concluídas
├─ Vendas em negociação
├─ Orçamentos aprovados
└─ Todas as parcelas futuras

Ideal para:
├─ Cenário "melhor caso"
├─ Planejamento de compras grandes
└─ Decisão de contratar mais equipe
```

---

## 💡 Dicas de Uso

### **1. Use Modo Confirmado para:**

- ✅ Decidir se pode pagar fornecedor hoje
- ✅ Verificar se terá caixa para folha de pagamento
- ✅ Analisar se pode assumir nova despesa fixa

### **2. Use Modo Previsão para:**

- ✅ Decidir se vale encomendar material para estoque
- ✅ Avaliar se pode contratar mais um funcionário
- ✅ Planejar investimento em veículo ou equipamento

### **3. Compare os Dois para:**

- ✅ Entender quanto depende de vendas em negociação
- ✅ Avaliar risco de tomar decisões grandes
- ✅ Identificar margem de segurança financeira

---

## 🚫 Como Evitar a "Morte da Empresa Lucrativa"

### **O Problema Clássico:**

```
DRE mostra: Lucro de R$ 30.000 no mês ✅
Fluxo de Caixa mostra: Saldo negativo em 15 dias ❌

Por quê?
├─ Cliente paga em 90 dias (parcelas longas)
├─ Fornecedor cobra em 30 dias
└─ Folha de pagamento vence em 5 dias

Resultado: Empresa lucrativa, mas sem caixa = FALÊNCIA
```

### **A Solução:**

```
1. Abrir Fluxo de Caixa toda semana
2. Identificar dias críticos com antecedência
3. Tomar ações preventivas:
   ├─ Antecipar recebíveis
   ├─ Renegociar prazos com fornecedor
   ├─ Pedir entrada maior em novas vendas
   └─ Usar capital de giro estrategicamente
```

---

## 📈 Integração com DRE e Lucro Real

### **Workflow Completo:**

```
Segunda-feira:
├─ Abrir DRE → Verificar se empresa é lucrativa
└─ Ver Lucro Real → Identificar produtos mais rentáveis

Terça-feira:
├─ Abrir Fluxo de Caixa → Ver próximos 60 dias
└─ Identificar: Terei R$ 25K em 20 dias

Quarta-feira:
├─ Fornecedor liga pedindo pagamento
└─ Fluxo mostra: Posso pagar em 25 dias
    └─ Negociar: "Pago em 25 dias com desconto?"

Decisão Final:
✅ DRE: Empresa lucrativa (+30%)
✅ Lucro Real: Produto X dá +50% de margem
✅ Fluxo de Caixa: Terei dinheiro em 25 dias
→ DECISÃO CONSCIENTE E SEGURA
```

---

## 🎯 Resultado Final

### **Antes (Sem Fluxo de Caixa):**

```
Dono: "Tenho lucro, mas não sei se posso comprar material..."
└─ Compra por impulso
    └─ Cheque especial estourado
        └─ Juros altos
            └─ Lucro comido pelos juros
```

### **Depois (Com Fluxo de Caixa):**

```
Dono: "Vejo que em 15 dias recebo R$ 30K..."
└─ Espera 15 dias
    └─ Compra com dinheiro à vista
        └─ Negocia desconto
            └─ Lucro preservado
```

---

## 📋 Checklist de Uso Semanal

- [ ] Segunda: Abrir Fluxo de Caixa modo Confirmado (60 dias)
- [ ] Terça: Verificar alertas de dias críticos
- [ ] Quarta: Se houver alerta, tomar ação preventiva
- [ ] Quinta: Abrir modo Previsão para avaliar novos investimentos
- [ ] Sexta: Comparar Confirmado vs Previsão para planejamento

---

## 🚀 Próximos Passos (Opcionais)

### **Melhorias Futuras:**

1. **Integração Bancária**
   - Importar extrato automático
   - Conciliar entradas reais vs previstas

2. **Alertas Automáticos**
   - Email quando dia crítico se aproximar
   - Notificação de margem de segurança baixa

3. **Cenários Personalizados**
   - "E se eu fechar venda X?"
   - "E se fornecedor Y aumentar prazo?"

4. **Machine Learning**
   - Prever inadimplência de clientes
   - Sugerir melhor data para compras

---

**Sistema S3E - Fluxo de Caixa Futuro v1.0**  
_"Agora você sabe QUANDO o dinheiro vai cair na conta!"_ 💰✅

**Tríade Completa de Gestão Financeira:**

- ✅ DRE (Lucro por competência)
- ✅ Lucro Real (Margem por produto)
- ✅ Fluxo de Caixa (Liquidez futura)

**🎉 Parabéns! Seu ERP agora é completo!** 🎉
