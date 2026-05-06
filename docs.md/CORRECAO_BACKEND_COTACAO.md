# ✅ BACKEND - INCLUIR DADOS DA COTAÇÃO

## 🔧 **PROBLEMA:**

Quando o backend retornava os itens do orçamento, **NÃO** incluía os dados da
cotação (relação `cotacao`). Por isso, no frontend não tinha acesso a:

- `item.cotacao.dataAtualizacao` (para exibir a flag)
- `item.tipo` (para saber se é cotação)

---

## ✅ **CORREÇÃO APLICADA:**

**Arquivo:** `backend/src/controllers/orcamentosController.ts`

### **1. Listar Orçamentos (linha ~15-29):**

**ANTES:**

```typescript
items: {
  include: {
    material: { select: { id, nome, sku } },
    kit: { select: { id, nome } }
    // ❌ Faltava cotacao
  }
}
```

**DEPOIS:**

```typescript
items: {
  include: {
    material: { select: { id, nome, sku } },
    kit: { select: { id, nome } },
    cotacao: {  // ✅ NOVO
      select: {
        id: true,
        nome: true,
        dataAtualizacao: true,
        fornecedorNome: true
      }
    }
  }
}
```

### **2. Buscar Orçamento por ID (linha ~43-61):**

**ANTES:**

```typescript
items: {
  include: {
    material: true,
    kit: { ... }
    // ❌ Faltava cotacao
  }
}
```

**DEPOIS:**

```typescript
items: {
  include: {
    material: true,
    kit: { ... },
    cotacao: true  // ✅ NOVO: Todos os campos
  }
}
```

---

## 🎯 **RESULTADO:**

Agora o backend retorna:

```json
{
  "items": [
    {
      "id": "uuid",
      "tipo": "COTACAO",
      "cotacaoId": "uuid",
      "nome": "Cabo de Cobre 2,5mm",
      "quantidade": 1,
      "precoUnit": 540,
      "cotacao": {           ← ✅ NOVO!
        "id": "uuid",
        "nome": "Cabo de Cobre 2,5mm - Rolo 100m",
        "dataAtualizacao": "2025-11-12T...",
        "fornecedorNome": "Eletromar"
      }
    }
  ]
}
```

---

## 📄 **FRONTEND PODE USAR:**

```tsx
// Agora funciona!
{
  item.cotacao && (
    <div>
      📦 Banco Frio •{" "}
      {new Date(item.cotacao.dataAtualizacao).toLocaleDateString()}
    </div>
  );
}
```

---

**Status:** ✅ BACKEND CORRIGIDO
