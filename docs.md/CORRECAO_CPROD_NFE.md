# 🔧 Correção Campo cProd NF-e - Guia de Aplicação Docker

## 📋 **Problema Resolvido**
- ❌ Campo `<cProd>` vazio na NF-e para itens de cotação
- ❌ XML inválido resultante
- ❌ Falha na emissão de NF-e

## ✅ **Solução Implementada**

### **1. Adição de Campo SKU às Cotações**
```sql
ALTER TABLE "cotacoes" ADD COLUMN "sku" TEXT;
CREATE UNIQUE INDEX "cotacoes_sku_key" ON "cotacoes"("sku");
CREATE INDEX "cotacoes_sku_idx" ON "cotacoes"("sku");
```

### **2. Lógica Robusta para cProd**
```typescript
// Prioridades para geração do código do produto:
1. SKU do material (estoque físico)
2. SKU da cotação (banco frio)  
3. COT- + ID da cotação
4. COT- + nome formatado da cotação
5. COT- + ID do item (fallback)
```

### **3. Geração Automática de SKU**
- ✅ Cotações novas: SKU gerado automaticamente
- ✅ Cotações existentes: Script para popular SKUs
- ✅ Formato padrão: `COT-XXX` (6 caracteres)

## 🚀 **Instruções para Aplicar no Docker**

### **Passo 1: Reconstruir Backend**
```bash
# Parar containers
docker-compose down

# Rebuild backend com correções
docker-compose build backend

# Subir containers
docker-compose up -d
```

### **Passo 2: Aplicar Migration**
```bash
# Aplicar migration do campo SKU
docker-compose exec backend npx prisma db push

# Verificar se aplicou corretamente
docker-compose exec backend npx prisma db pull
```

### **Passo 3: Gerar SKUs para Cotações Existentes**
```bash
# Executar script de geração de SKUs
docker-compose exec backend npm run gerar:skus-cotacoes
```

### **Passo 4: Verificar Funcionamento**
```bash
# Ver logs do backend
docker-compose logs backend -f

# Testar criação de nova cotação
curl -X POST http://localhost:3001/api/cotacoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "nome": "Teste SKU",
    "valorUnitario": 100.00,
    "ncm": "12345678"
  }'
```

## 🔍 **Validações**

### **1. Verificar Campo SKU Criado**
```sql
-- Conectar ao PostgreSQL do container
\d cotacoes

-- Deve mostrar coluna 'sku' do tipo text
```

### **2. Verificar SKUs Gerados**
```sql
SELECT nome, sku FROM cotacoes WHERE sku IS NOT NULL LIMIT 10;
```

### **3. Testar NF-e com Cotação**
1. Criar orçamento com item de cotação
2. Gerar venda do orçamento  
3. Emitir NF-e da venda
4. Verificar campo `<cProd>` preenchido no XML

## ⚠️ **Pontos de Atenção**

### **1. Backup antes da Migration**
```bash
# Fazer backup do banco antes de aplicar
docker-compose exec postgres pg_dump -U postgres s3e_portfolio_dev > backup_pre_sku.sql
```

### **2. Monitorar Logs Durante Script**
```bash
# Acompanhar execução do script
docker-compose logs backend -f | grep "SKU Cotações"
```

### **3. Rollback se Necessário**
Se algo der errado:
```bash
# Remover campo SKU se necessário
docker-compose exec backend npx prisma db push --schema=schema_backup.prisma
```

## 📊 **Estatísticas Esperadas**

Após aplicação completa:
- ✅ **100% das cotações** com SKU único
- ✅ **0 campos cProd vazios** na NF-e
- ✅ **XMLs válidos** para todos os tipos de item
- ✅ **Performance mantida** com índices apropriados

## 🎯 **Testes Recomendados**

### **1. Teste Cotação Nova**
```javascript
// Criar cotação via API
POST /api/cotacoes
{
  "nome": "Material Teste",
  "valorUnitario": 50.00
}

// Verificar se SKU foi gerado automaticamente
```

### **2. Teste NF-e com Cotação**
```javascript
// 1. Criar orçamento com item do banco frio
// 2. Gerar venda do orçamento
// 3. Emitir NF-e
// 4. Verificar XML gerado:
<cProd>COT-A1B2</cProd>
<xProd>Nome da Cotação</xProd>
<cEAN>SEM GTIN</cEAN>
<cEANTrib>SEM GTIN</cEANTrib>
```

### **3. Teste Kit Unificado**
```javascript
// 1. Criar orçamento com kit customizado
// 2. Incluir itens de cotação no kit
// 3. Gerar NF-e
// 4. Verificar todos os itens com cProd preenchido
```

## 🔧 **Troubleshooting**

### **Erro: "sku does not exist in type"**
```bash
# Regenerar cliente Prisma
docker-compose exec backend npx prisma generate
```

### **Erro: "duplicate key value violates unique constraint"**
```bash
# Limpar SKUs duplicados manualmente
docker-compose exec backend npx prisma db seed
```

### **Campo cProd ainda vazio**
```bash
# Verificar logs do nfe.service.ts
docker-compose logs backend | grep "cProd Fix"
```

## ✅ **Checklist Final**

- [ ] Migration aplicada com sucesso
- [ ] Cliente Prisma regenerado  
- [ ] Script de SKUs executado
- [ ] Cotações existentes com SKU
- [ ] Cotações novas gerando SKU automaticamente
- [ ] NF-e com campo cProd preenchido
- [ ] XMLs validando corretamente
- [ ] Performance mantida

---

## 📝 **Resumo das Alterações**

### **Arquivos Modificados:**
- ✅ `prisma/schema.prisma` - Campo SKU adicionado
- ✅ `nfe.service.ts` - Lógica robusta para cProd
- ✅ `cotacoesController.ts` - Geração automática de SKU
- ✅ `skuGenerator.ts` - Função para SKUs de cotação
- ✅ `package.json` - Script para popular SKUs

### **Arquivos Criados:**
- ✅ `migrations/20260303195800_add_sku_to_cotacoes/` - Migration SQL
- ✅ `scripts/gerarSKUsCotacoes.ts` - Script de população
- ✅ `docs.md/CORRECAO_CPROD_NFE.md` - Este guia

**🎉 Problema do cProd vazio completamente resolvido!**