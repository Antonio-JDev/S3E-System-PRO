# Relatório: Varredura e Correção - Atualização de Preço de Materiais pela Última Compra

## Data: 2025-01-20

## Objetivo
Verificar se o sistema está salvando o valor de custo sempre pela última compra para todos os materiais.

## Análise Realizada

### Funções Analisadas

1. **`registrarCompra`** (linhas 55-437)
   - ✅ **Status**: Funcionando corretamente
   - Atualiza o preço do material quando:
     - Material já existe e foi encontrado por match automático
     - Preço é diferente do valor da compra OU preço é null
   - Considera fracionamento (calcula preço unitário quando aplicável)

2. **`atualizarStatusCompra`** (linhas 673-853)
   - ❌ **Status**: **PROBLEMA IDENTIFICADO E CORRIGIDO**
   - **Problema**: Quando uma compra era recebida (mudança de status para "Recebido"), o sistema atualizava o estoque mas NÃO atualizava o preço do material com o valor da última compra
   - **Correção aplicada**: Adicionada lógica para atualizar o preço do material antes de atualizar o estoque
   - Agora atualiza o preço mesmo quando:
     - Material já está vinculado à compra (item.materialId existe)
     - Material foi encontrado por match automático
     - Material foi criado novo

3. **`receberRemessaParcial`** (linhas 858-1096)
   - ❌ **Status**: **PROBLEMA IDENTIFICADO E CORRIGIDO**
   - **Problema**: Quando uma remessa parcial era recebida, o sistema atualizava o estoque mas NÃO atualizava o preço do material
   - **Correção aplicada**: Adicionada lógica para atualizar o preço do material antes de atualizar o estoque
   - Agora atualiza o preço mesmo quando:
     - Material já está vinculado à compra
     - Material foi encontrado ou criado durante o recebimento

4. **`receberComAssociacoes`** (linhas 1102-1264)
   - ✅ **Status**: Funcionando corretamente
   - Atualiza o preço quando associa a um material existente (linhas 1167-1180)

## Correções Implementadas

### 1. Função `atualizarStatusCompra`
**Localização**: `backend/src/services/compras.service.ts` (linhas ~779-823)

**Mudança**: Adicionada lógica para atualizar o preço do material antes de atualizar o estoque:

```typescript
// ✅ ATUALIZAR PREÇO DO MATERIAL COM O VALOR DA ÚLTIMA COMPRA
const materialAtual = await tx.material.findUnique({
    where: { id: materialIdFinal },
    select: { preco: true, fornecedorId: true }
});

if (materialAtual) {
    // ✅ PROCESSAR FRACIONAMENTO para calcular preço unitário
    const temFracionamento = item.quantidadeFracionada && item.quantidadeFracionada > 0;
    const precoParaUsar = temFracionamento 
        ? item.valorUnit / item.quantidadeFracionada // Preço unitário quando fracionado
        : item.valorUnit; // Preço normal
    
    // Atualizar preço se for diferente (sempre usar o valor da última compra)
    if (materialAtual.preco !== precoParaUsar) {
        await tx.material.update({
            where: { id: materialIdFinal },
            data: {
                preco: precoParaUsar,
                fornecedorId: compra.fornecedorId
            }
        });
        console.log(`💰 Preço atualizado na recepção: R$ ${materialAtual.preco} → R$ ${precoParaUsar}`);
    } else if (materialAtual.preco === null) {
        // Se material não tinha preço, definir agora
        await tx.material.update({
            where: { id: materialIdFinal },
            data: {
                preco: precoParaUsar,
                fornecedorId: compra.fornecedorId
            }
        });
        console.log(`💰 Preço definido na recepção: R$ ${precoParaUsar}`);
    }
}
```

### 2. Função `receberRemessaParcial`
**Localização**: `backend/src/services/compras.service.ts` (linhas ~1019-1050)

**Mudança**: Adicionada lógica similar para atualizar o preço do material:

```typescript
// ✅ ATUALIZAR PREÇO DO MATERIAL COM O VALOR DA ÚLTIMA COMPRA
const materialAtual = await tx.material.findUnique({
    where: { id: materialIdFinal },
    select: { preco: true, fornecedorId: true, estoque: true, nome: true }
});

if (materialAtual) {
    // ✅ PROCESSAR FRACIONAMENTO para calcular preço unitário
    const temFracionamento = item.quantidadeFracionada && item.quantidadeFracionada > 0;
    const precoParaUsar = temFracionamento 
        ? item.valorUnit / item.quantidadeFracionada // Preço unitário quando fracionado
        : item.valorUnit; // Preço normal
    
    // Atualizar preço se for diferente (sempre usar o valor da última compra)
    if (materialAtual.preco !== precoParaUsar) {
        await tx.material.update({
            where: { id: materialIdFinal },
            data: {
                preco: precoParaUsar,
                fornecedorId: compra.fornecedorId
            }
        });
        console.log(`💰 Preço atualizado na remessa parcial: R$ ${materialAtual.preco} → R$ ${precoParaUsar}`);
    } else if (materialAtual.preco === null) {
        // Se material não tinha preço, definir agora
        await tx.material.update({
            where: { id: materialIdFinal },
            data: {
                preco: precoParaUsar,
                fornecedorId: compra.fornecedorId
            }
        });
        console.log(`💰 Preço definido na remessa parcial: R$ ${precoParaUsar}`);
    }
}
```

## Comportamento Após Correções

### Cenários Cobertos

1. ✅ **Compra criada com status "Recebido"**
   - Preço atualizado na função `registrarCompra`

2. ✅ **Compra criada como "Pendente" e depois recebida**
   - Preço atualizado na função `atualizarStatusCompra` (CORRIGIDO)

3. ✅ **Remessa parcial recebida**
   - Preço atualizado na função `receberRemessaParcial` (CORRIGIDO)

4. ✅ **Compra recebida com associações explícitas**
   - Preço atualizado na função `receberComAssociacoes`

5. ✅ **Materiais com fracionamento**
   - Preço unitário calculado corretamente (preço da embalagem / quantidade por embalagem)

6. ✅ **Materiais já vinculados à compra**
   - Preço atualizado mesmo quando material já estava vinculado

7. ✅ **Materiais encontrados por match automático**
   - Preço atualizado quando material é encontrado automaticamente

8. ✅ **Materiais criados novos**
   - Preço definido na criação

## Considerações Importantes

1. **Fracionamento**: O sistema agora calcula corretamente o preço unitário quando há fracionamento (ex: caixa com 100 unidades)

2. **Fornecedor**: O fornecedorId também é atualizado junto com o preço para manter a referência do último fornecedor

3. **Logs**: Adicionados logs para facilitar o rastreamento de atualizações de preço

4. **Transações**: Todas as atualizações são feitas dentro de transações para garantir consistência

## Conclusão

✅ **Sistema corrigido**: Agora o sistema atualiza o preço de custo (`preco`) de todos os materiais sempre que uma compra é recebida, garantindo que o valor sempre reflita a última compra realizada.

### Resumo das Correções
- ✅ 2 funções corrigidas (`atualizarStatusCompra` e `receberRemessaParcial`)
- ✅ Todos os cenários de recebimento de compra agora atualizam o preço
- ✅ Suporte completo a fracionamento
- ✅ Logs adicionados para rastreamento

## Próximos Passos Recomendados

1. Testar as correções em ambiente de desenvolvimento
2. Verificar se há materiais com preços desatualizados no banco de dados
3. Considerar criar um script de migração para atualizar preços históricos se necessário
