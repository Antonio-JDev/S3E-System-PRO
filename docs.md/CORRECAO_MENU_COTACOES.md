# ✅ CORREÇÃO - MENU COTAÇÕES ADICIONADO!

## 🐛 **PROBLEMA:**

O botão "Cotações" não aparecia na sidebar porque o link não foi adicionado no
array `navLinks`.

---

## 🔧 **CORREÇÃO APLICADA:**

**Arquivo:** `frontend/src/constants/index.tsx`

**ANTES:**

```tsx
{ name: 'Clientes', icon: ClientsIcon },
{ name: 'Orçamentos', icon: BudgetIcon },
{ name: 'Vendas', icon: SalesIcon },
// ← Faltava Cotações aqui!

// ========== SUPRIMENTOS ==========
```

**DEPOIS:**

```tsx
{ name: 'Clientes', icon: ClientsIcon },
{ name: 'Orçamentos', icon: BudgetIcon },
{ name: 'Vendas', icon: SalesIcon },
{ name: 'Cotações', icon: PriceTagIcon },  ← ✅ ADICIONADO!

// ========== SUPRIMENTOS ==========
```

---

## 🚀 **TESTE AGORA:**

### **1. Recarregue o Frontend:**

```
Ctrl + Shift + R (hard reload)
```

### **2. Verifique Sidebar:**

```
Seção COMERCIAL:
✓ Clientes
✓ Orçamentos
✓ Vendas
✓ Cotações  ← ✅ DEVE APARECER AGORA!
```

### **3. Clique em Cotações:**

```
Deve abrir a página:
🏷️ Cotações de Fornecedores
Banco frio de materiais cotados
```

---

## ✅ **VERIFICAÇÃO:**

Se aparecer o menu:

```
📦 COMERCIAL
   👤 Clientes
   📄 Orçamentos
   💰 Vendas
   🏷️ Cotações  ← NOVO!
```

**Funcionou! 🎉**

---

**RECARREGUE E VERIFIQUE! 🚀**
