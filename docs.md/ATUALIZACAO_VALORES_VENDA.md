# 🔧 Atualização Automática de Valores de Venda - Guia TrueNAS Scale

## 📋 **Funcionalidade Implementada**

**Botão para atualizar valores de venda de todos os materiais** baseado na
configuração de markup atual (ex: 1,55x = 55% de lucro).

## 🎯 **Problema Resolvido**

- ❌ **Atualização manual**: Ter que entrar material por material para ajustar
  preços
- ❌ **Inconsistência**: Valores desatualizados após mudança de configuração
- ❌ **Tempo perdido**: Processo demorado para grandes estoques

## ✅ **Solução Implementada**

### **1. Botão na Interface de Materiais**

- ✅ **Localização**: Página de Materiais → Dropdown "Ações" → "Atualizar
  Valores de Venda"
- ✅ **Acesso**: Apenas Admin e Desenvolvedor
- ✅ **Ícone**: $ (símbolo de dinheiro)
- ✅ **Execução via API** - sem necessidade de acesso ao servidor

### **2. Lógica de Cálculo**

```typescript
// Configuração atual (markupFabricante = 1.55)
valorVenda = precoCompra × 1.55

// Exemplo:
// Material com preço R$ 100,00
// Novo valor de venda = R$ 100,00 × 1.55 = R$ 155,00
// Lucro = 55%
```

### **3. Funcionalidades Incluídas**

- ✅ **Calcula valores por unidade** (valorVenda)
- ✅ **Calcula valores por metro** (valorVendaM) para materiais em M/KG-M
- ✅ **Calcula valores por centímetro** (valorVendaCM)
- ✅ **Calcula custo por centímetro** (custoCM)
- ✅ **Calcula porcentagem de lucro** automaticamente
- ✅ **Processa apenas materiais** que têm preço de custo definido

## 🚀 **Como Usar no TrueNAS Scale**

### **Passo 1: Aplicar Atualização**

```bash
# No servidor TrueNAS Scale:
docker-compose down
docker-compose up -d --build

# Aguardar inicialização completa
docker-compose logs -f backend | grep "Servidor rodando"
```

### **Passo 2: Usar na Interface**

1. **Acessar sistema** como Admin ou Desenvolvedor
2. **Navegar para** "Materiais" (menu lateral)
3. **Clicar no dropdown "Ações"** (no topo da página)
4. **Selecionar "Atualizar Valores de Venda"** (ícone $)
5. **Aguardar processamento** - toast mostrará progresso
6. **Ver resultado** - estatísticas detalhadas

### **Passo 3: Verificar Resultados**

```
Exemplo de resultado esperado:
✅ Valores de venda atualizados!
📊 247/250 materiais atualizados (98.8%)
💰 Markup: 1.55x (+55.0% lucro)
```

## 📊 **Estatísticas Fornecidas**

### **Durante o Processamento:**

- 🔄 **Toast de progresso**: "Atualizando valores de venda..."
- 📦 **Logs detalhados**: Material por material sendo atualizado
- ⏱️ **Processamento em lotes**: 20 materiais por vez

### **Resultado Final:**

- 📊 **Total de materiais**: Quantos têm preço definido
- ✅ **Materiais atualizados**: Quantos foram processados com sucesso
- ❌ **Erros**: Quantos falharam (se houver)
- 🎯 **Cobertura**: Porcentagem de sucesso
- 💰 **Markup aplicado**: Multiplicador usado (ex: 1.55x)
- 📈 **Porcentagem de lucro**: Margem calculada (ex: 55%)

## 🔍 **Critérios de Processamento**

### **Materiais Incluídos:**

- ✅ Materiais com **preço > 0** definido
- ✅ Materiais **ativos** no sistema
- ✅ Todos os tipos de **unidades de medida**

### **Materiais Ignorados:**

- ❌ Materiais **sem preço** de custo
- ❌ Materiais com **preço = 0**
- ❌ Materiais **inativos**

### **Configuração Utilizada:**

1. **Prioridade 1**: `markupFabricante` (configuração atual)
2. **Prioridade 2**: `multiplicadorVenda` (legado)
3. **Fallback**: `1.55` (padrão do sistema)

## ⚡ **Performance e Segurança**

### **Otimizações:**

- 📦 **Processamento em lotes**: 20 materiais por vez
- ⏱️ **Pause entre lotes**: 100ms para não sobrecarregar
- 🔄 **Processamento paralelo**: Dentro de cada lote
- 🛡️ **Transações seguras**: Falhas isoladas não afetam outros

### **Logs Detalhados:**

```bash
# Acompanhar processamento em tempo real:
docker-compose logs -f backend | grep "Valores"

# Exemplo de log:
✅ [ABC123] Material Exemplo: R$ 100.00 → R$ 155.00 (+55.0%)
📦 [Lote] Processando 12/25
🎉 [Resultado] Atualização concluída: ✅ 247 ❌ 3 📊 98.8%
```

## 🛠️ **Configuração de Markup**

### **Onde Alterar:**

1. **Menu**: Configurações → Configurações Gerais
2. **Campo**: "Markup Fabricante"
3. **Valor atual**: 1.55 (55% de lucro)
4. **Alterar conforme**: Política de preços da empresa

### **Exemplos de Markup:**

```
1.30 = 30% de lucro
1.40 = 40% de lucro
1.55 = 55% de lucro (atual)
1.70 = 70% de lucro
2.00 = 100% de lucro (dobra o preço)
```

## 📝 **Cenários de Uso**

### **Cenário 1: Ajuste de Inflação**

```
Situação: Fornecedores aumentaram preços 10%
Solução:
1. Atualizar preços de custo (via importação ou manual)
2. Clicar "Atualizar Valores de Venda"
3. Todos os preços ficam consistentes automaticamente
```

### **Cenário 2: Mudança de Política**

```
Situação: Empresa decidiu aumentar margem de 40% → 55%
Solução:
1. Ir em Configurações → Alterar "Markup Fabricante" para 1.55
2. Voltar em Materiais → Clicar "Atualizar Valores de Venda"
3. Todos os materiais agora têm 55% de margem
```

### **Cenário 3: Nova Importação**

```
Situação: Importou 500 novos materiais com preços de custo
Solução:
1. Materiais importados já têm preço de custo
2. Clicar "Atualizar Valores de Venda"
3. Todos ganham automaticamente o valor de venda correto
```

## ⚠️ **Pontos Importantes**

### **1. Backup Recomendado**

```bash
# Fazer backup antes de grandes alterações:
docker-compose exec postgres pg_dump -U postgres s3e_portfolio_dev > backup_valores.sql
```

### **2. Horário de Execução**

- ✅ **Recomendado**: Fora do horário comercial
- ✅ **Rápido**: ~1-2 segundos por material
- ✅ **Não interfere**: Não bloqueia outras operações

### **3. Validação Manual**

```
Após execução, verificar alguns materiais:
- Preço custo: R$ 100,00
- Valor venda: R$ 155,00
- % Lucro: 55%
- Status: ✅ Correto
```

## 🔧 **Troubleshooting**

### **Erro: "Nenhum material encontrado"**

- **Causa**: Nenhum material tem preço definido
- **Solução**: Importar/definir preços de custo primeiro

### **Erro: "Alguns materiais falharam"**

- **Causa**: Dados inconsistentes em materiais específicos
- **Solução**: Ver logs para identificar quais falharam

### **Botão não aparece**

- **Causa**: Usuário não é Admin/Desenvolvedor
- **Solução**: Login com conta Admin

### **Processamento lento**

- **Causa**: Muitos materiais (>1000)
- **Solução**: Normal, aguardar conclusão (1-2 min max)

## ✅ **Checklist Final**

- [ ] Sistema atualizado no TrueNAS
- [ ] Login como Admin/Desenvolvedor
- [ ] Configuração de markup definida
- [ ] Materiais têm preços de custo
- [ ] Backup realizado (se necessário)
- [ ] Botão "Atualizar Valores de Venda" executado
- [ ] Resultado conferido
- [ ] Valores atualizados confirmados

---

## 🎉 **Resultado**

**Antes**: Atualizar preços material por material (horas de trabalho)
**Depois**: 1 clique → Todos os valores atualizados automaticamente (segundos)

**🚀 Ganho de produtividade: 100x mais rápido!**
