# 🎯 SISTEMA DE COTAÇÕES - BANCO FRIO DE MATERIAIS

## 📋 **RESUMO DA IMPLEMENTAÇÃO**

Sistema completo de cotações de fornecedores (banco frio) integrado com
orçamentos.

---

## ✅ **O QUE FOI IMPLEMENTADO:**

### **1. Database (Prisma Schema)** ✅ COMPLETO

**Novo Model:**

```prisma
model Cotacao {
  id                    String    @id @default(uuid())
  nome                  String
  ncm                   String?
  valorUnitario         Float
  fornecedorId          String?
  fornecedorNome        String?
  dataAtualizacao       DateTime  @default(now())
  observacoes           String?
  ativo                 Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  fornecedor            Fornecedor? @relation(fields: [fornecedorId], references: [id])
  itensOrcamento        OrcamentoItem[]

  @@index([fornecedorId])
  @@index([dataAtualizacao])
  @@index([ativo])
  @@map("cotacoes")
}
```

**Atualizações:**

- ✅ `Fornecedor`: Adicionado relação `cotacoes`
- ✅ `OrcamentoItem`: Adicionado campo `cotacaoId` e relação `cotacao`
- ✅ Migration criada e aplicada

---

### **2. Backend** ✅ COMPLETO

#### **Controller:** `backend/src/controllers/cotacoesController.ts`

**Endpoints criados:**

- ✅ `GET /api/cotacoes` - Listar todas
- ✅ `GET /api/cotacoes/:id` - Buscar por ID
- ✅ `POST /api/cotacoes` - Criar nova
- ✅ `PUT /api/cotacoes/:id` - Atualizar
- ✅ `DELETE /api/cotacoes/:id` - Deletar
- ✅ `GET /api/cotacoes/template` - Gerar template JSON
- ✅ `GET /api/cotacoes/exportar` - Exportar todas
- ✅ `POST /api/cotacoes/importar` - Importar JSON

#### **Routes:** `backend/src/routes/cotacoes.routes.ts`

- ✅ Configurado multer para upload
- ✅ Todas as rotas registradas
- ✅ Filtro para aceitar apenas JSON

#### **Registrado em** `app.ts`:

- ✅ Import da rota
- ✅ Adicionado ao uploadRoutes
- ✅ Registrado com `app.use('/api/cotacoes', cotacoesRoutes)`

---

## 🚀 **PRÓXIMOS PASSOS (FRONTEND):**

### **3. Componente Principal** ⏳ PENDENTE

**Arquivo:** `frontend/src/components/Cotacoes.tsx`

**Funcionalidades necessárias:**

- 📋 **Lista em formato tabela** (não grid de cards)
- 🔍 **Busca/filtros** (nome, fornecedor)
- 📥 **Botão importar JSON**
- 📤 **Botão exportar/template**
- 👁️ **Botão visualizar** (modal com detalhes)
- ✏️ **Botão atualizar valores** (modal de edição)
- 🗑️ **Botão excluir**
- 📅 **Exibir data de atualização**
- 🏢 **Exibir fornecedor**

**Campos na lista:**

- Nome do produto
- NCM
- Valor unitário
- Fornecedor
- Data de atualização
- Ações (visualizar, editar, deletar)

---

### **4. Sidebar** ⏳ PENDENTE

**Arquivo:** `frontend/src/constants/index.tsx`

**Adicionar na seção COMERCIAL:**

```tsx
{
  name: 'Cotações',
  icon: PriceTagIcon, // Criar ícone
  requiredPermission: 'view_cotacoes'
}
```

**Arquivo:** `frontend/src/App.tsx`

```tsx
case 'Cotações':
  return <Cotacoes toggleSidebar={toggleSidebar} />;
```

---

### **5. Integração com Orçamentos** ⏳ PENDENTE

**Componente:** `frontend/src/pages/NovoOrcamentoPage.tsx`

**Mudanças necessárias:**

1. **Adicionar toggle** "Banco de Cotações" ao lado de "Materiais"
2. **Buscar cotações** ao invés de materiais quando toggle ativo
3. **Exibir flag visual** nos itens:

   ```tsx
   {
     item.cotacaoId && (
       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
         📦 Banco Frio - Atualizado em {formatDate(item.dataAtualizacao)}
       </span>
     );
   }
   ```

4. **Salvar tipo** correto: `tipo: 'COTACAO'` e `cotacaoId`

---

### **6. PDF de Orçamento** ⏳ PENDENTE

**Arquivo:** `backend/src/controllers/orcamentosController.ts`

**Na função de gerar PDF:**

```typescript
// Não mostrar flag de "Banco Frio" no PDF
// Mostrar apenas:
// - Nome do material
// - Quantidade
// - Valor unitário
// - Subtotal

// Internamente (para o usuário do sistema):
// - Mostrar a flag
// - Mostrar data de atualização
// - Mostrar fornecedor
```

---

## 📝 **FORMATO JSON DE IMPORTAÇÃO:**

```json
{
  "versao": "1.0",
  "geradoEm": "2025-11-12T...",
  "empresa": "S3E Engenharia Elétrica",
  "instrucoes": "Preencha os campos das cotações abaixo",
  "cotacoes": [
    {
      "nome": "Cabo de Cobre 2,5mm",
      "ncm": "85444200",
      "valorUnitario": 100.5,
      "fornecedorNome": "Fornecedor Exemplo Ltda",
      "observacoes": "Cotação válida por 30 dias"
    }
  ]
}
```

---

## 🎨 **VISUAL DA LISTA DE COTAÇÕES:**

```
╔════════════════════════════════════════════════════════════════╗
║  🏷️ Cotações de Fornecedores                                   ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  [🔍 Buscar...] [📥 Importar] [📤 Exportar] [📄 Template]      ║
║                                                                 ║
║  ┌──────────────────────────────────────────────────────────┐  ║
║  │ Nome              │ NCM  │ Valor  │ Fornecedor │ Data   │  ║
║  ├──────────────────────────────────────────────────────────┤  ║
║  │ Cabo 2,5mm       │85444│R$100,50│ ABC Ltda   │12/11   │  ║
║  │ [👁️] [✏️] [🗑️]                                          │  ║
║  ├──────────────────────────────────────────────────────────┤  ║
║  │ Disjuntor 32A    │85362│R$150,00│ XYZ SA     │10/11   │  ║
║  │ [👁️] [✏️] [🗑️]                                          │  ║
║  └──────────────────────────────────────────────────────────┘  ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎯 **FLUXO DE USO:**

### **Cadastrar Cotações:**

```
1. Fornecedor envia lista de preços
2. Usuário baixa template JSON
3. Preenche com dados do fornecedor
4. Importa na tela de Cotações
5. Sistema valida e salva no banco frio
```

### **Usar em Orçamento:**

```
1. Criar novo orçamento
2. Toggle: "Banco de Cotações" ON
3. Buscar material
4. Adicionar ao orçamento
5. Sistema mostra flag "📦 Banco Frio"
6. Mostra data de atualização
7. Na impressão PDF: apenas nome + preço (sem flag)
```

---

## ✅ **STATUS ATUAL:**

```
✅ Database (schema + migration)
✅ Backend (controller + routes + app.ts)
⏳ Frontend - Componente Cotacoes.tsx
⏳ Frontend - Sidebar (adicionar menu)
⏳ Frontend - Integração com Orçamentos
⏳ Frontend - Atualizar PDF (ocultar flags)
```

---

## 📚 **ARQUIVOS CRIADOS:**

### **Backend:**

- ✅ `backend/src/controllers/cotacoesController.ts`
- ✅ `backend/src/routes/cotacoes.routes.ts`
- ✅ `backend/prisma/schema.prisma` (atualizado)
- ✅ `backend/src/app.ts` (atualizado)

### **Frontend (a criar):**

- ⏳ `frontend/src/components/Cotacoes.tsx`
- ⏳ `frontend/src/types/cotacoes.ts`
- ⏳ `frontend/src/services/cotacoesService.ts`
- ⏳ `frontend/src/constants/index.tsx` (atualizar)
- ⏳ `frontend/src/App.tsx` (atualizar)
- ⏳ `frontend/src/pages/NovoOrcamentoPage.tsx` (atualizar)

---

## 🔥 **TESTE DO BACKEND:**

```bash
# 1. Gerar template
GET http://localhost:3000/api/cotacoes/template

# 2. Listar cotações
GET http://localhost:3000/api/cotacoes

# 3. Criar cotação
POST http://localhost:3000/api/cotacoes
{
  "nome": "Cabo 2,5mm",
  "ncm": "85444200",
  "valorUnitario": 100.50,
  "fornecedorNome": "ABC Ltda"
}

# 4. Importar JSON
POST http://localhost:3000/api/cotacoes/importar
[FormData com arquivo JSON]

# 5. Exportar
GET http://localhost:3000/api/cotacoes/exportar
```

---

**🎊 BACKEND PRONTO! PRÓXIMO: CRIAR FRONTEND 🚀**

**Data:** 12/11/2025  
**Status:** Backend 100% | Frontend 0%
