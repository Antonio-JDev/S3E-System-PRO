# 🌙 GUIA RÁPIDO - APLICAR DARK MODE EM TODOS OS COMPONENTES

## 📋 PADRÕES DE SUBSTITUIÇÃO

Para cada arquivo `.tsx`, aplique as seguintes substituições:

### **1. Backgrounds de Página**

```tsx
// ANTES:
className = "min-h-screen bg-gray-50";
className = "bg-gray-50";
className = "p-4 bg-gray-50";

// DEPOIS:
className = "min-h-screen bg-gray-50 dark:bg-dark-bg";
className = "bg-gray-50 dark:bg-dark-bg";
className = "p-4 bg-gray-50 dark:bg-dark-bg";
```

### **2. Cards e Containers**

```tsx
// ANTES:
className = "bg-white";
className = "bg-white rounded";
className = "bg-white shadow";

// DEPOIS:
className = "bg-white dark:bg-dark-card";
className = "bg-white dark:bg-dark-card rounded";
className = "bg-white dark:bg-dark-card shadow";
```

### **3. Bordas**

```tsx
// ANTES:
border-gray-200
border-gray-300

// DEPOIS:
border-gray-200 dark:border-dark-border
border-gray-300 dark:border-dark-border
```

### **4. Títulos**

```tsx
// ANTES:
text-gray-900
text-gray-800
text-brand-gray-800

// DEPOIS:
text-gray-900 dark:text-dark-text
text-gray-800 dark:text-dark-text
text-brand-gray-800 dark:text-dark-text
```

### **5. Subtítulos e Texto Secundário**

```tsx
// ANTES:
text-gray-600
text-gray-500
text-brand-gray-500

// DEPOIS:
text-gray-600 dark:text-dark-text-secondary
text-gray-500 dark:text-dark-text-secondary
text-brand-gray-500 dark:text-dark-text-secondary
```

### **6. Inputs e Formulários**

```tsx
// ANTES:
className = "border border-gray-300 px-4 py-2";

// DEPOIS:
className =
  "bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary px-4 py-2";
```

### **7. Modais**

```tsx
// ANTES:
<div className="fixed inset-0 bg-black/50">
  <div className="bg-white rounded-lg">

// DEPOIS:
<div className="fixed inset-0 bg-black/70 dark:bg-black/80">
  <div className="bg-white dark:bg-dark-card rounded-lg">
```

### **8. Badges de Status**

```tsx
// Verde (Ativo):
className="bg-green-100 text-green-800"
→ "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"

// Amarelo (Pendente):
className="bg-yellow-100 text-yellow-800"
→ "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"

// Vermelho (Inativo):
className="bg-red-100 text-red-800"
→ "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
```

---

## 📂 ARQUIVOS PRIORITÁRIOS

Atualizar nesta ordem:

1. **ClientesAPI.tsx** ← Mostrado no print
2. **Dashboard.tsx** / **DashboardAPI.tsx**
3. **Projetos.tsx** / **ProjetosAPI.tsx** / **ProjetosModerno.tsx**
4. **Orcamentos.tsx**
5. **Vendas.tsx**
6. **Estoque.tsx**
7. **Fornecedores.tsx** / **FornecedoresAPI.tsx**
8. **Compras.tsx**
9. **Catalogo.tsx**
10. **ComparacaoPrecos.tsx**
11. **Obras.tsx**
12. **GestaoObras.tsx**
13. **Servicos.tsx**
14. **Financeiro.tsx**
15. **ContasAPagar.tsx** / **ContasAReceber.tsx**

---

## 🔍 CHECKLIST POR ARQUIVO

Para cada componente, verificar:

- [ ] `<div className="min-h-screen bg-gray-50">` → add `dark:bg-dark-bg`
- [ ] `<div className="bg-white">` → add `dark:bg-dark-card`
- [ ] `border-gray-xxx` → add `dark:border-dark-border`
- [ ] `text-gray-900` (títulos) → add `dark:text-dark-text`
- [ ] `text-gray-500/600` (subtítulos) → add `dark:text-dark-text-secondary`
- [ ] `<input>` → add bg, border, text dark classes
- [ ] `<select>` → add bg, border, text dark classes
- [ ] `<textarea>` → add bg, border, text dark classes
- [ ] Modais → add `dark:bg-dark-card` no conteúdo
- [ ] Badges → add dark variants
- [ ] Hover states → add `dark:hover:bg-dark-bg`

---

## ⚡ ATALHO - USAR FIND & REPLACE

No VSCode:

```
Ctrl + Shift + H (Find & Replace in Files)

1. Find: bg-white(?! dark:)
   Replace: bg-white dark:bg-dark-card

2. Find: text-gray-900(?! dark:)
   Replace: text-gray-900 dark:text-dark-text

3. Find: text-gray-500(?! dark:)
   Replace: text-gray-500 dark:text-dark-text-secondary

4. Find: border-gray-200(?! dark:)
   Replace: border-gray-200 dark:border-dark-border
```

**CUIDADO:** Revisar cada substituição antes de aplicar!

---

## 📝 EXEMPLO COMPLETO

### ANTES (ClientesAPI.tsx):

```tsx
<div className="min-h-screen bg-gray-50">
  <div className="bg-white shadow">
    <h1 className="text-gray-900">Clientes</h1>
    <p className="text-gray-500">Gerencie seus clientes</p>

    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <input
        type="text"
        placeholder="Nome..."
        className="border border-gray-300 px-4 py-2"
      />
    </div>
  </div>
</div>
```

### DEPOIS (Com Dark Mode):

```tsx
<div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
  <div className="bg-white dark:bg-dark-card shadow">
    <h1 className="text-gray-900 dark:text-dark-text">Clientes</h1>
    <p className="text-gray-500 dark:text-dark-text-secondary">
      Gerencie seus clientes
    </p>

    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-4">
      <input
        type="text"
        placeholder="Nome..."
        className="bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary px-4 py-2"
      />
    </div>
  </div>
</div>
```

---

Isso é muito trabalhoso manualmente. Vou aplicar automaticamente nos principais.
