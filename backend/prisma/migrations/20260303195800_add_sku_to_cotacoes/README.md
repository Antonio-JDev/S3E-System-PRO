# Migration: Adicionar SKU às Cotações

## 📋 **Descrição**

Esta migration adiciona o campo `sku` à tabela `cotacoes` para resolver o
problema do campo obrigatório `<cProd>` na geração de NF-e.

## 🎯 **Problema Resolvido**

- ❌ Campo `<cProd>` vazio na NF-e para itens de cotação
- ❌ XML inválido resultante
- ❌ Falha na emissão de NF-e

## ✅ **Solução Implementada**

- ✅ Campo `sku` único para cada cotação
- ✅ Geração automática de SKU no padrão `COT-XXX`
- ✅ Garantia de unicidade entre materiais e cotações

## 🔧 **Alterações no Banco**

1. **Adiciona coluna**: `sku TEXT` na tabela `cotacoes`
2. **Adiciona constraint**: `UNIQUE` no campo `sku`
3. **Adiciona índice**: Para performance nas consultas por SKU

## 📝 **Próximos Passos**

1. Aplicar migration no Docker: `docker-compose exec backend npx prisma db push`
2. Executar script de geração de SKUs: `npm run script:gerar-skus-cotacoes`
3. Testar emissão de NF-e com itens de cotação

## 🚀 **Impacto**

- **Backend**: Campo `cProd` sempre preenchido
- **NF-e**: XMLs válidos para todos os tipos de item
- **Performance**: Consultas otimizadas por índice SKU
