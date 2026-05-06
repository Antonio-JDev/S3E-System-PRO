# 🔐 Sistema RBAC - Controle de Acesso Baseado em Funções

## ✅ Implementação Completa do Sistema de Permissões

### 📋 Visão Geral

O sistema RBAC (Role-Based Access Control) foi implementado para controlar o
acesso às páginas e funcionalidades do sistema baseado no perfil de usuário.

---

## 👥 Roles e Permissões Implementadas

### 1. **Desenvolvedor** (`desenvolvedor`) 💻

- **Acesso**: UNIVERSAL a todas as páginas e funcionalidades
- **Páginas Exclusivas**:
  - ✅ **Logs** (Sistema de auditoria completo)
  - ✅ **Tarefas da Obra** (Pode visualizar todas as tarefas)
- **Permissões Especiais**:
  - ✅ Exclusão permanente de TODOS os recursos
  - ✅ CRUD completo em todas as entidades
  - ✅ Acesso a todas as subpáginas de Gerenciamento Empresarial

### 2. **Administrador** (`admin`) 👑

- **Acesso**: Todas as páginas EXCETO Logs
- **Permissões**:
  - ✅ CRUD completo de: materiais, projetos, serviços, orçamentos, kits, obras,
    usuários
  - ✅ Acesso a Financeiro, NF-e, Gerenciamento Empresarial (todas subpáginas)
  - ✅ Pode DELETAR (exclusão permanente) recursos
- **Restrições**:
  - ❌ SEM acesso à página de Logs

### 3. **Gerente** (`gerente`) 📊

- **Acesso**: Todas as páginas EXCETO Logs
- **Permissões**:
  - ✅ CRUD completo de: materiais, projetos, serviços, orçamentos, kits, obras,
    usuários
  - ✅ Acesso a Financeiro, NF-e, Gerenciamento Empresarial (todas subpáginas)
  - ✅ Pode DELETAR (exclusão permanente) recursos
- **Restrições**:
  - ❌ SEM acesso à página de Logs

### 4. **Comprador** (`comprador`) 🛒

- **Acesso**: Páginas operacionais e de suprimentos
- **Permissões**:
  - ✅ CRUD de: materiais, projetos, serviços, orçamentos, kits, obras
  - ✅ Acesso a: Obras, Movimentações, Catálogo, Comparação de Preços, Gestão de
    Obras, Vendas
  - ✅ Gerenciamento Empresarial: **APENAS subpágina de Frota**
  - ⚠️ Pode apenas DESATIVAR (não deletar permanentemente)
- **Restrições**:
  - ❌ SEM acesso a: Financeiro, Emissão NF-e, Logs
  - ❌ SEM outras subpáginas de Gerenciamento Empresarial (exceto Frota)
  - ❌ NÃO pode deletar permanentemente

### 5. **Engenheiro** (`engenheiro`) ⚙️

- **Acesso**: Páginas operacionais e de projetos
- **Permissões**:
  - ✅ CRUD de: materiais, projetos, serviços, orçamentos, kits, obras
  - ✅ Acesso a: Obras, Movimentações, Catálogo, Comparação de Preços, Gestão de
    Obras, Vendas, Projetos
  - ⚠️ Pode apenas DESATIVAR (não deletar permanentemente)
- **Restrições**:
  - ❌ SEM acesso a: Financeiro, Emissão NF-e, Logs, Gerenciamento Empresarial
  - ❌ NÃO pode deletar permanentemente

### 6. **Eletricista** (`eletricista`) ⚡

- **Acesso**: LIMITADO a funcionalidades de campo
- **Páginas Disponíveis**:
  - ✅ **Obras** (visualização das obras atribuídas)
  - ✅ **Tarefas da Obra** (registro de atividades diárias) 🆕
  - ✅ **Movimentações** (baixas e retornos de materiais)
- **Permissões**:
  - ✅ Visualizar obras atribuídas
  - ✅ Registrar atividades do dia (com fotos)
  - ✅ Atualizar status de tarefas
  - ✅ Movimentar materiais (baixas e devoluções)
- **Restrições**:
  - ❌ SEM acesso a TODAS as outras páginas do sistema

---

## 🆕 Nova Página: Tarefas da Obra

### Funcionalidades para Eletricistas

A nova página **Tarefas da Obra** foi criada especificamente para eletricistas
registrarem suas atividades diárias:

#### 📝 Campos Disponíveis:

1. **Nome da Obra** (readonly - atribuída pelo sistema)
2. **Endereço da Obra** (readonly)
3. **Tarefas a Executar** (readonly - definidas pelo gerente/engenheiro)
4. **Resumo do Dia** (textarea - eletricista preenche)
5. **Upload de Fotos** (múltiplas imagens do trabalho realizado)
6. **Data da Tarefa**
7. **Status** (Pendente/Concluída)

#### 🎯 Fluxo de Trabalho:

1. Eletricista acessa "Tarefas da Obra"
2. Visualiza lista de tarefas pendentes atribuídas
3. Clica em "Registrar Atividades do Dia"
4. Preenche resumo detalhado do que foi executado
5. Adiciona fotos do trabalho realizado
6. Salva o registro
7. Tarefa marcada como "Concluída"

#### 🔒 Segurança:

- ✅ Apenas eletricistas e desenvolvedores podem acessar
- ✅ Eletricistas veem apenas tarefas atribuídas a eles
- ✅ Não podem editar/excluir tarefas concluídas
- ✅ Todas as ações são registradas com timestamp

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:

1. **`frontend/src/utils/permissions.ts`**
   - Sistema completo de permissões RBAC
   - Funções auxiliares:
     - `hasPermission(userRole, permission)` - Verifica permissão específica
     - `canDelete(userRole, entityType)` - Verifica se pode deletar
     - `canOnlyDeactivate(userRole, entityType)` - Verifica se só pode desativar
     - `getRoleName(role)` - Nome formatado da role
     - `getRoleEmoji(role)` - Emoji representativo

2. **`frontend/src/components/TarefasObra.tsx`**
   - Página de Tarefas da Obra para eletricistas
   - Interface completa para registro de atividades
   - Upload de múltiplas imagens
   - Preview de fotos antes do envio
   - Validação de acesso por permissão

### Arquivos Modificados:

1. **`frontend/src/constants/index.tsx`**
   - Adicionado `TaskListIcon` para Tarefas
   - Adicionado `NavLink` interface com `requiredPermission`
   - Todas as rotas agora têm permissões específicas
   - Link "Tarefas da Obra" adicionado à navegação

2. **`frontend/src/components/Sidebar.tsx`**
   - Filtro de links baseado em permissões
   - Usa `hasPermission()` para validar acesso
   - Suporte a `devOnly` (legado) e `requiredPermission` (novo)

3. **`frontend/src/App.tsx`**
   - Importado `TarefasObra` component
   - Adicionado case `'Tarefas da Obra'` no switch
   - Adicionado rota no `routeMap`

---

## 🔧 Como Usar o Sistema de Permissões

### No Frontend:

```typescript
import { hasPermission, canDelete } from "../utils/permissions";

// Verificar se usuário tem permissão específica
if (hasPermission(user?.role, "view_financeiro")) {
  // Mostrar página de Financeiro
}

// Verificar se pode deletar
if (canDelete(user?.role, "projeto")) {
  // Mostrar botão "Excluir Permanentemente"
} else {
  // Mostrar apenas botão "Desativar"
}

// Verificar múltiplas permissões
if (hasAnyPermission(user?.role, ["view_obras", "view_tarefas_obra"])) {
  // Usuário pode ver pelo menos uma das duas
}
```

### Nos Componentes:

```typescript
// Controle de acesso na própria página
const canView = hasPermission(user?.role, 'view_tarefas_obra');

if (!canView) {
  return (
    <div>🚫 Acesso Negado</div>
  );
}
```

---

## 🎨 Indicadores Visuais de Permissão

### Sidebar:

- **Desenvolvedor**: Badge "DEV" pulsante vermelho + Indicador "🔓
  DESENVOLVEDOR" no link de Logs
- **Outras roles**: Links filtrados automaticamente

### Botões de Ação:

- **Admin/Gerente/Desenvolvedor**: Botão "Excluir" (vermelho)
- **Comprador/Engenheiro**: Botão "Desativar" (laranja)
- **Eletricista**: Sem botões de exclusão/desativação

---

## 📊 Matriz de Permissões

| Página/Funcionalidade  | Dev | Admin | Gerente | Comprador | Engenheiro | Eletricista |
| ---------------------- | --- | ----- | ------- | --------- | ---------- | ----------- |
| **Dashboard**          | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Clientes**           | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Orçamentos**         | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Vendas**             | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Fornecedores**       | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Compras**            | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Estoque**            | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Movimentações**      | ✅  | ✅    | ✅      | ✅        | ✅         | ✅          |
| **Catálogo**           | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Comparação Preços**  | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Projetos**           | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Obras**              | ✅  | ✅    | ✅      | ✅        | ✅         | ✅          |
| **Tarefas da Obra**    | ✅  | ❌    | ❌      | ❌        | ❌         | ✅          |
| **Gestão de Obras**    | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Serviços**           | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |
| **Financeiro**         | ✅  | ✅    | ✅      | ❌        | ❌         | ❌          |
| **Emissão NF-e**       | ✅  | ✅    | ✅      | ❌        | ❌         | ❌          |
| **Logs**               | ✅  | ❌    | ❌      | ❌        | ❌         | ❌          |
| **Ger. Empresarial**   | ✅  | ✅    | ✅      | 🟡\*      | ❌         | ❌          |
| **Deletar Permanente** | ✅  | ✅    | ✅      | ❌        | ❌         | ❌          |
| **Desativar**          | ✅  | ✅    | ✅      | ✅        | ✅         | ❌          |

_\* Comprador: apenas subpágina de **Frota**_

---

## 🚀 Próximos Passos (Backend)

### Endpoints a Implementar:

1. **`GET /api/obras/tarefas`**
   - Retorna tarefas do eletricista logado
   - Filtros: pendente/concluída, data

2. **`POST /api/obras/tarefas/resumo`**
   - Salva resumo do dia com fotos
   - Marca tarefa como concluída
   - Upload de imagens para storage

3. **`PUT /api/obras/tarefas/:id`**
   - Atualiza tarefa (apenas desenvolvedor/gerente)

4. **Middlewares RBAC:**
   - Validação de permissões em todos os endpoints sensíveis
   - Audit logging de ações críticas
   - Verificação de role para operações de DELETE

---

## ✅ Checklist de Implementação

- [x] Sistema de permissões criado (`permissions.ts`)
- [x] Página Tarefas da Obra implementada
- [x] Sidebar com filtros de permissão
- [x] Constants atualizados com novas permissões
- [x] Rotas configuradas no App.tsx
- [x] Interfaces de tipos atualizadas
- [x] Verificações de acesso nos componentes
- [ ] Backend: Endpoints de Tarefas da Obra ⚠️
- [ ] Backend: Middleware de validação RBAC ⚠️
- [ ] Testes de integração por role ⚠️

---

## 📚 Documentação de Referência

- **Permissões**: `frontend/src/utils/permissions.ts`
- **Tipos**: `frontend/src/constants/index.tsx` (NavLink interface)
- **Exemplo de Uso**: `frontend/src/components/TarefasObra.tsx`
- **Design System**: `frontend/DESIGN_SYSTEM.md`
- **Dark Mode**: `frontend/DARK_MODE_COMPLETO.md`

---

**Última Atualização**: 12/11/2025  
**Status**: ✅ Frontend 100% Implementado | ⚠️ Backend Pendente
