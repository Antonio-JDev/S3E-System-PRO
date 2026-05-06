# 🎨 VISUAL DO MODAL DE PREVIEW

## 📋 **MODAL PRINCIPAL**

```
╔════════════════════════════════════════════════════════════╗
║                                                             ║
║  📋 Preview de Atualização de Preços                 [✕]   ║
║  Revise as alterações antes de confirmar a atualização     ║
║                                                             ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     ║
║  │ Total    │ │ Anterior │ │ Novo     │ │ Diferença│     ║
║  │   5      │ │ R$ 500   │ │ R$ 550   │ │  +10%    │     ║
║  │ itens    │ │          │ │          │ │   🔴     │     ║
║  └──────────┘ └──────────┘ └──────────┘ └──────────┘     ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ SKU     │ Material        │ Anterior │ Novo │ Dif. │  ║
║  ├─────────────────────────────────────────────────────┤  ║
║  │ MAT-001 │ Cabo 2,5mm     │ R$ 100   │ R$110│ +10% │  ║
║  │         │                 │          │      │  🔴  │  ║
║  ├─────────────────────────────────────────────────────┤  ║
║  │ MAT-002 │ Disjuntor 32A  │ R$ 150   │ R$160│ +7%  │  ║
║  │         │                 │          │      │  🔴  │  ║
║  ├─────────────────────────────────────────────────────┤  ║
║  │ MAT-003 │ Tomada 2P+T    │ R$ 80    │ R$75 │ -6%  │  ║
║  │         │                 │          │      │  🟢  │  ║
║  ├─────────────────────────────────────────────────────┤  ║
║  │ MAT-004 │ Interruptor    │ R$ 50    │ R$55 │ +10% │  ║
║  │         │                 │          │      │  🔴  │  ║
║  ├─────────────────────────────────────────────────────┤  ║
║  │ MAT-005 │ Fita Isolante  │ R$ 20    │ R$20 │  0%  │  ║
║  │         │                 │          │      │  ⚪  │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
║                  [ ❌ Cancelar ]  [ ✅ Confirmar ]         ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
```

---

## ⚠️ **ALERTDIALOG DE CONFIRMAÇÃO**

Quando clicar em "✅ Confirmar Atualização":

```
╔════════════════════════════════════════════════════╗
║                                                     ║
║  ⚠️ Confirmar Atualização de Preços?               ║
║                                                     ║
║  Você está prestes a atualizar os preços de        ║
║  5 materiais.                                      ║
║                                                     ║
║  ┌─────────────────────────────────────────────┐  ║
║  │ ⚠️ Atenção:                                 │  ║
║  │ • Esta ação não pode ser desfeita           │  ║
║  │ • Os preços antigos ficam no histórico      │  ║
║  │ • Orçamentos futuros usam os novos preços   │  ║
║  └─────────────────────────────────────────────┘  ║
║                                                     ║
║  ┌──────────────────┐  ┌──────────────────┐       ║
║  │ Valor Anterior:  │  │ Valor Novo:      │       ║
║  │   R$ 500,00      │  │   R$ 550,00      │       ║
║  └──────────────────┘  └──────────────────┘       ║
║                                                     ║
║  Deseja realmente continuar?                       ║
║                                                     ║
║         [ ❌ Cancelar ] [ ✅ Sim, Atualizar ]      ║
║                                                     ║
╚════════════════════════════════════════════════════╝
```

---

## 🎨 **LEGENDA DE CORES:**

### **Cards de Resumo:**

```
┌─────────────┐
│ 🔵 AZUL     │ → Total de Itens
└─────────────┘

┌─────────────┐
│ ⚪ CINZA    │ → Valor Anterior
└─────────────┘

┌─────────────┐
│ 🟢 VERDE    │ → Valor Novo
└─────────────┘

┌─────────────┐
│ 🔴 VERMELHO │ → Diferença (se aumento)
└─────────────┘

┌─────────────┐
│ 🟢 VERDE    │ → Diferença (se redução)
└─────────────┘
```

### **Badges na Tabela:**

```
🔴 ↑ +10%  → Preço AUMENTOU (vermelho)
🟢 ↓ -6%   → Preço DIMINUIU (verde)
⚪ = 0%    → Preço IGUAL (cinza)
```

---

## 📱 **RESPONSIVIDADE:**

### **Desktop (>1024px):**

```
- Modal ocupa 80% da largura
- 4 cards lado a lado
- Tabela completa visível
- Scroll apenas se muitos itens
```

### **Tablet (768px - 1024px):**

```
- Modal ocupa 90% da largura
- 2 cards por linha
- Tabela scroll horizontal
```

### **Mobile (<768px):**

```
- Modal tela cheia
- 1 card por linha
- Tabela compacta
- Scroll vertical e horizontal
```

---

## ⚡ **ANIMAÇÕES E INTERAÇÕES:**

### **Abertura:**

```
1. Fade in do backdrop (fundo escuro)
2. Slide up do modal (de baixo para cima)
3. Fade in do conteúdo
```

### **Hover:**

```
- Linhas da tabela: fundo muda para cinza claro
- Botões: sombra aumenta
- Cards: sem hover (estáticos)
```

### **Loading:**

```
- Botões ficam desabilitados
- Texto muda: "Processando..."
- Cursor: not-allowed
```

---

## 🔥 **CASOS DE USO:**

### **Caso 1: Apenas Aumentos**

```
┌──────────┐
│ +15%     │ ← Card vermelho
│   🔴     │
└──────────┘

Todas as linhas com badges vermelhos ↑
```

### **Caso 2: Apenas Reduções**

```
┌──────────┐
│ -8%      │ ← Card verde
│   🟢     │
└──────────┘

Todas as linhas com badges verdes ↓
```

### **Caso 3: Misto**

```
┌──────────┐
│ +5%      │ ← Card vermelho (total aumentou)
│   🔴     │
└──────────┘

Linhas: algumas 🔴↑ outras 🟢↓
```

---

## ✅ **ESTADOS DO MODAL:**

### **1. Carregando Preview:**

```
[Ainda não implementado - preview é instantâneo]
```

### **2. Mostrando Preview:**

```
✅ Modal aberto
✅ Dados visíveis
✅ Botões ativos
```

### **3. Confirmando (AlertDialog aberto):**

```
✅ Modal de fundo ainda visível (desfocado)
✅ AlertDialog no topo
✅ Botões de confirmação ativos
```

### **4. Processando Atualização:**

```
✅ AlertDialog fechado
✅ Modal ainda aberto
✅ Botões desabilitados
✅ Texto: "⏳ Atualizando..."
```

### **5. Sucesso:**

```
✅ Modal fechado
✅ Alert de sucesso
✅ Lista limpa
```

---

## 🎊 **EXEMPLO COMPLETO:**

Imagine que você editou 3 materiais:

```
ANTES:
┌─────────────────────────────────────┐
│ Cabo 2,5mm     → R$ 100,00         │
│ Disjuntor 32A  → R$ 150,00         │
│ Tomada 2P+T    → R$ 80,00          │
└─────────────────────────────────────┘
TOTAL: R$ 330,00

DEPOIS:
┌─────────────────────────────────────┐
│ Cabo 2,5mm     → R$ 110,00 (+10%)  │
│ Disjuntor 32A  → R$ 160,00 (+7%)   │
│ Tomada 2P+T    → R$ 75,00 (-6%)    │
└─────────────────────────────────────┘
TOTAL: R$ 345,00 (+4.5%)
```

**Modal mostrará:**

```
Cards:
- Total: 3 itens
- Anterior: R$ 330,00
- Novo: R$ 345,00
- Diferença: +4.5% 🔴

Tabela:
Linha 1: Cabo → R$ 100 → R$ 110 | 🔴 ↑ +10%
Linha 2: Disj → R$ 150 → R$ 160 | 🔴 ↑ +7%
Linha 3: Toma → R$ 80  → R$ 75  | 🟢 ↓ -6%
```

---

**VISUAL MODERNO, LIMPO E PROFISSIONAL! 🎨**
