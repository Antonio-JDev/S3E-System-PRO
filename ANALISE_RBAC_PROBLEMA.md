# 🔍 Análise do Problema RBAC - Engenheiros não conseguem criar serviços e orçamentos

## 📋 Problema Identificado

Engenheiros estão recebendo erro **403 (Forbidden)** ao tentar criar serviços e orçamentos em produção, enquanto admins e devs conseguem normalmente.

## 🔎 Causa Raiz

O sistema possui **DOIS sistemas de autorização diferentes** que estão conflitando:

### 1. Sistema RBAC (Correto) ✅
- **Arquivo**: `backend/src/middlewares/rbac.ts`
- **Middleware**: `checkPermission()`
- **Permissões definidas**: O role `engenheiro` TEM as permissões:
  - ✅ `create_servico` (linha 104)
  - ✅ `create_orcamento` (linha 105)

### 2. Sistema Antigo `authorize()` (Incorreto) ❌
- **Arquivo**: `backend/src/middlewares/auth.ts`
- **Middleware**: `authorize()`
- **Problema**: Verifica apenas roles hardcoded, não usa o sistema de permissões RBAC

## 🐛 Problemas Específicos Encontrados

### ❌ Rotas de Serviços (`backend/src/routes/servicos.ts`)
```typescript
// LINHA 29 - PROBLEMA
router.post('/', authorize('admin', 'gerente'), ServicosController.criarServico);
```
- Usa `authorize('admin', 'gerente')` - apenas admin e gerente
- **Deveria usar**: `checkPermission('create_servico')` do RBAC
- **Resultado**: Engenheiros são bloqueados mesmo tendo a permissão no RBAC

### ❌ Rotas de Orçamentos (`backend/src/routes/orcamentos.ts`)
```typescript
// LINHA 30 - PROBLEMA
router.post('/', createOrcamento);
```
- **NÃO TEM middleware de autorização!**
- **Deveria ter**: `checkPermission('create_orcamento')`
- **Resultado**: Qualquer usuário autenticado pode criar, mas pode haver verificação no controller

## 📊 Comparação: RBAC vs authorize()

| Aspecto | RBAC (`checkPermission`) | Antigo (`authorize`) |
|---------|---------------------------|----------------------|
| Verifica permissões | ✅ Sim | ❌ Não |
| Roles hardcoded | ❌ Não | ✅ Sim |
| Flexível | ✅ Sim | ❌ Não |
| Engenheiros podem criar | ✅ Sim (tem permissão) | ❌ Não (não está na lista) |

## ✅ Solução

Substituir `authorize()` por `checkPermission()` nas rotas que devem usar o sistema RBAC:

### Rotas que PRECISAM ser corrigidas:

1. **Serviços** (`backend/src/routes/servicos.ts`):
   - `POST /api/servicos` → `checkPermission('create_servico')`
   - `PUT /api/servicos/:id` → `checkPermission('update_servico')`
   - `DELETE /api/servicos/:id` → `checkDeletePermission('servico')`

2. **Orçamentos** (`backend/src/routes/orcamentos.ts`):
   - `POST /api/orcamentos` → `checkPermission('create_orcamento')`
   - `PUT /api/orcamentos/:id` → `checkPermission('update_orcamento')`
   - `DELETE /api/orcamentos/:id` → `checkDeletePermission('orcamento')`

## 🔧 Permissões do Role Engenheiro (RBAC)

Segundo `backend/src/middlewares/rbac.ts` (linhas 99-108):

```typescript
engenheiro: [
  'view_obras', 'view_movimentacoes', 'view_catalogo', 'view_comparacao_precos',
  'view_projetos', 'view_gestao_obras', 'view_servicos', 'view_vendas',
  'create_material', 'update_material', 'deactivate_material',
  'create_projeto', 'update_projeto', 'deactivate_projeto',
  'create_servico', 'update_servico', 'deactivate_servico',  // ✅ TEM
  'create_orcamento', 'update_orcamento', 'deactivate_orcamento',  // ✅ TEM
  'create_kit', 'update_kit', 'deactivate_kit',
  'create_obra', 'update_obra', 'deactivate_obra'
]
```

**Conclusão**: Engenheiros DEVEM poder criar serviços e orçamentos segundo o RBAC!

## 📝 Outras Rotas que Podem Ter o Mesmo Problema

Verificar se outras rotas também usam `authorize()` em vez de `checkPermission()`:
- Rotas de materiais
- Rotas de projetos
- Rotas de kits
- Rotas de obras

## 🎯 Ação Imediata

1. ✅ Corrigir rotas de serviços
2. ✅ Corrigir rotas de orçamentos
3. ⚠️ Verificar outras rotas críticas
4. ✅ Testar com usuário engenheiro

