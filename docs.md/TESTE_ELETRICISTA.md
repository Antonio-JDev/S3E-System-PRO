# 🧪 Teste do Sistema RBAC - Eletricista

## ⚡ Como Verificar se Eletricista Vê Apenas Páginas Corretas

### 📋 Páginas que o Eletricista DEVE Ver:

1. ✅ **Dashboard** - Visão geral básica
2. ✅ **Obras** - Visualizar obras atribuídas
3. ✅ **Tarefas da Obra** - Registrar atividades diárias
4. ✅ **Movimentações** - Dar baixa em materiais

### ❌ Páginas que o Eletricista NÃO DEVE Ver:

- ❌ Clientes
- ❌ Orçamentos
- ❌ Vendas
- ❌ Fornecedores
- ❌ Compras
- ❌ Estoque
- ❌ Catálogo
- ❌ Comparação de Preços
- ❌ Projetos
- ❌ Gestão de Obras
- ❌ Serviços
- ❌ Financeiro
- ❌ Emissão NF-e
- ❌ Logs
- ❌ Gerenciamento Empresarial

---

## 🔧 Correção Aplicada

### Arquivo: `frontend/src/constants/index.tsx`

**ANTES** (páginas sem permissão - apareciam para todos):

```typescript
{ name: 'Clientes', icon: ClientsIcon },  // ❌ SEM requiredPermission
{ name: 'Orçamentos', icon: BudgetIcon }, // ❌ SEM requiredPermission
{ name: 'Fornecedores', icon: SupplierIcon }, // ❌ SEM requiredPermission
```

**DEPOIS** (todas com permissões):

```typescript
{ name: 'Clientes', icon: ClientsIcon, requiredPermission: 'view_projetos' },
{ name: 'Orçamentos', icon: BudgetIcon, requiredPermission: 'view_projetos' },
{ name: 'Fornecedores', icon: SupplierIcon, requiredPermission: 'view_projetos' },
{ name: 'Compras', icon: ShoppingBagIcon, requiredPermission: 'view_projetos' },
{ name: 'Estoque', icon: CubeIcon, requiredPermission: 'view_catalogo' },
```

---

## ✅ Como Testar Agora

### 1. **Recarregar a Página**

- Faça logout
- Limpe o cache do navegador (Ctrl + Shift + Delete)
- Faça login novamente como eletricista

### 2. **Credenciais de Teste**:

```
Email: eletricista1@s3e.com
Senha: eletricista123
```

### 3. **Verificar Sidebar**:

Após login, a sidebar deve mostrar APENAS:

```
┌─────────────────────────┐
│ GERAL                   │
│ 📊 Dashboard            │
│                         │
│ OPERACIONAL             │
│ 🏗️ Obras               │
│ 📋 Tarefas da Obra      │
│                         │
│ SUPRIMENTOS             │
│ 📦 Movimentações        │
│                         │
│ ────────────────────    │
│ ⚡ João Silva          │
│    eletricista          │
│ → Sair                  │
└─────────────────────────┘
```

### 4. **Testar Navegação**:

- ✅ Clicar em "Dashboard" → Deve funcionar
- ✅ Clicar em "Obras" → Deve funcionar
- ✅ Clicar em "Tarefas da Obra" → Deve funcionar
- ✅ Clicar em "Movimentações" → Deve funcionar

### 5. **Tentar Acessar Página Bloqueada**:

Se tentar acessar URL diretamente (ex: digitando na barra):

- ❌ Não verá link na sidebar
- ❌ Página não renderiza (fica no Dashboard)

---

## 🔍 Debug - Se Ainda Aparecerem Páginas Extras

### Verificar Permissões do Usuário:

1. **Abrir Console do Navegador** (F12)
2. **Executar**:

```javascript
// Ver dados do usuário
const authData = localStorage.getItem("auth_token");
console.log("Token:", authData);

// Verificar role
const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log("Role:", user?.role);
```

3. **Verificar se role está correta**: Deve retornar `"eletricista"`

### Se a Role Estiver Errada:

```bash
# Recriar usuário no backend
cd backend
npx tsx prisma/seed.ts

# Fazer logout no frontend
# Limpar localStorage
# Fazer login novamente
```

---

## 🎯 Resultado Esperado

Após a correção, quando um **eletricista** faz login, ele deve ver:

### Sidebar Completa:

```
╔═══════════════════════════╗
║ S3E Engenharia            ║
║ Gestão de Estoque & Vendas║
╠═══════════════════════════╣
║                           ║
║ GERAL                     ║
║ 📊 Dashboard              ║
║                           ║
║ OPERACIONAL               ║
║ 🏗️  Obras                 ║
║ 📋 Tarefas da Obra        ║
║                           ║
║ SUPRIMENTOS               ║
║ 📦 Movimentações          ║
║                           ║
╠═══════════════════════════╣
║ ⚡ João Silva             ║
║    eletricista            ║
║ 🌙 ⚙️                     ║
║ → Sair                    ║
╚═══════════════════════════╝
```

**NADA MAIS deve aparecer!**

---

## 🚀 Próximas Ações

1. **Recarregue a página** no navegador
2. **Faça logout** do usuário atual
3. **Faça login** novamente como eletricista:
   - Email: `eletricista1@s3e.com`
   - Senha: `eletricista123`
4. **Verifique** se agora aparecem apenas 4 páginas

---

**Status**: ✅ Correção aplicada  
**Ação Necessária**: Recarregar navegador e fazer novo login
