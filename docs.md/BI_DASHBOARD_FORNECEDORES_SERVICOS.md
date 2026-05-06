# BI Dashboard - Gráficos de Fornecedores e Serviços Rentáveis

## 📊 Implementação Completa

### **Novos Gráficos Adicionados**

#### **1. Distribuição de Gastos por Fornecedor (Pizza)**
- **Localização**: Seção 6 do BI Dashboard
- **Tipo**: Gráfico de Pizza (Donut)
- **Dados**: Top 8 fornecedores por volume de compras
- **Características**:
  - Percentuais exibidos diretamente no gráfico
  - Legenda lateral com barras de progresso coloridas
  - Mostra quantidade de compras e valor total por fornecedor
  - Card de resumo com total gasto (Top 8)

#### **2. Gastos por Fornecedor (Barras Horizontais)**
- **Localização**: Seção 6 do BI Dashboard (ao lado do gráfico de pizza)
- **Tipo**: Gráfico de Barras Horizontal
- **Dados**: Top 10 fornecedores com maior volume de compras
- **Características**:
  - Ordenado do maior para o menor gasto
  - Cores consistentes com o gráfico de pizza
  - Tooltip mostrando valor e quantidade de compras
  - Cards de resumo: Total Gasto e Média por Fornecedor

#### **3. Serviços Mais Rentáveis**
- **Localização**: Seção 7 do BI Dashboard
- **Tipo**: Cards Top 3 + Tabela Completa
- **Dados**: Ranking de serviços por lucratividade
- **Características**:
  - **Pódio**: 3 cards destacados (🥇 Ouro, 🥈 Prata, 🥉 Bronze)
  - **Tabela**: Ranking completo com todas as métricas
  - **Métricas**: Receita, Custo, Lucro, Markup %, Quantidade

---

## 🔧 Implementação Backend

### **Novos Endpoints**

#### **1. GET /api/bi/gastos-fornecedor**
```typescript
// Já existia - apenas ajustado o frontend para usar corretamente
Query params: dataInicio, dataFim (formato: YYYY-MM-DD)

Response:
{
  "success": true,
  "data": [
    {
      "fornecedorId": "uuid",
      "fornecedorNome": "Nome do Fornecedor",
      "total": 26731.39,
      "quantidadeCompras": 15
    }
  ]
}
```

#### **2. GET /api/bi/servicos-rentaveis**
```typescript
// NOVO - criado nesta implementação
Query params: dataInicio, dataFim (formato: YYYY-MM-DD)

Response:
{
  "success": true,
  "data": [
    {
      "servicoNome": "Instalação Elétrica",
      "classificacao": "Mão de Obra",
      "receita": 50000,
      "custo": 30000,
      "lucro": 20000,
      "markup": 66.67,
      "quantidade": 10
    }
  ]
}
```

### **Arquivos Modificados no Backend**

1. **`backend/src/services/bi.service.ts`**
   - Adicionado método `getServicosRentaveis()`
   - Calcula lucro e markup por serviço
   - Ordena por lucro (maior para menor)

2. **`backend/src/controllers/biController.ts`**
   - Adicionado `getServicosRentaveis()`
   - Validação de parâmetros
   - Tratamento de erros

3. **`backend/src/routes/bi.routes.ts`**
   - Adicionada rota `/servicos-rentaveis`

---

## 🎨 Implementação Frontend

### **Arquivos Modificados**

1. **`frontend/src/services/biService.ts`**
   - Adicionado método `getServicosRentaveis()`
   - Melhorado `getGastosFornecedor()` com logs detalhados
   - Tratamento de erros aprimorado

2. **`frontend/src/components/BIDashboard.tsx`**
   - Adicionados estados: `gastosFornecedor`, `servicosRentaveis`
   - Carregamento paralelo de todos os dados
   - Seção 6: Gráficos de Fornecedores (Pizza + Barras)
   - Seção 7: Serviços Rentáveis (Cards + Tabela)
   - Mensagens de "sem dados" quando arrays vazios

### **Cores Utilizadas**

```typescript
const CHART_COLORS = [
  '#6366F1', // indigo-500
  '#8B5CF6', // purple-500
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
];
```

---

## 🧪 Como Testar

### **1. Verificar Logs no Console do Navegador**

Abra o DevTools (F12) e vá para a aba Console. Você deve ver:

```
📊 Carregando dados de BI: { dataInicio: "...", dataFim: "...", periodoMarkup: "mes" }
📊 [biService] Response getGastosFornecedor: { ... }
✅ Gastos por fornecedor carregados: [...]
📊 [biService] Response getServicosRentaveis: { ... }
✅ Serviços rentáveis carregados: [...]
```

### **2. Verificar Dados no Backend**

```bash
# Testar endpoint de fornecedores
curl "http://localhost:3001/api/bi/gastos-fornecedor?dataInicio=2024-01-01&dataFim=2024-12-31" \
  -H "Authorization: Bearer SEU_TOKEN"

# Testar endpoint de serviços rentáveis
curl "http://localhost:3001/api/bi/servicos-rentaveis?dataInicio=2024-01-01&dataFim=2024-12-31" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### **3. Verificar Dados no Banco**

```sql
-- Verificar compras de fornecedores
SELECT 
  f.nome as fornecedor,
  COUNT(c.id) as quantidade_compras,
  SUM(c.valorTotal) as total_gasto
FROM "Compra" c
JOIN "Fornecedor" f ON c.fornecedorId = f.id
WHERE c.status != 'Cancelado'
  AND c.dataCompra >= '2024-01-01'
  AND c.dataCompra <= '2024-12-31'
GROUP BY f.id, f.nome
ORDER BY total_gasto DESC
LIMIT 10;

-- Verificar vendas de serviços
SELECT 
  s.nome as servico,
  s.tipoServico as classificacao,
  COUNT(*) as quantidade,
  SUM(oi.precoUnit) as receita,
  SUM(s.custo) as custo
FROM "Venda" v
JOIN "Orcamento" o ON v.orcamentoId = o.id
JOIN "OrcamentoItem" oi ON oi.orcamentoId = o.id
JOIN "Servico" s ON s.nome = oi.servicoNome
WHERE v.status != 'Cancelada'
  AND oi.tipo = 'SERVICO'
  AND v.dataVenda >= '2024-01-01'
  AND v.dataVenda <= '2024-12-31'
GROUP BY s.id, s.nome, s.tipoServico
ORDER BY (SUM(oi.precoUnit) - SUM(s.custo)) DESC;
```

---

## 🐛 Troubleshooting

### **Problema: Gráficos não aparecem**

**Possíveis causas:**

1. **Sem dados no período selecionado**
   - Solução: Selecione um período maior ou verifique se há compras/vendas registradas

2. **Erro no backend**
   - Verifique os logs do backend: `docker-compose logs backend`
   - Procure por erros nas rotas `/api/bi/gastos-fornecedor` ou `/api/bi/servicos-rentaveis`

3. **Erro no frontend**
   - Abra o DevTools (F12) e veja se há erros no Console
   - Verifique a aba Network para ver se as requisições estão sendo feitas

4. **Dados retornando vazios**
   - Verifique no console se aparece: `⚠️ Array de fornecedores vazio`
   - Isso significa que não há dados no período selecionado

### **Problema: Cores inconsistentes**

- Todas as cores são definidas no array `CHART_COLORS`
- Os mesmos índices são usados em ambos os gráficos de fornecedores
- Se as cores estiverem diferentes, limpe o cache do navegador (Ctrl + F5)

### **Problema: Dados incorretos**

1. Verifique se o período selecionado está correto
2. Confirme se há compras e vendas no banco de dados
3. Verifique se os status das compras/vendas não estão como "Cancelado/Cancelada"

---

## 📈 Estrutura Final do BI Dashboard

1. ✅ Cards de Resumo (Aprovados, Pendentes, Expirados, Declinados)
2. ✅ Distribuição de Orçamentos por Status (Pizza + Barras)
3. ✅ Orçamentos por Tipo de Serviço (Cards + Barras + Tabela)
4. ✅ Evolução Mensal por Classificação (Linhas)
5. ✅ DRE de Markup por Tipo de Serviço (Tabela + Gráficos)
6. ✅ **NOVO**: Gastos com Fornecedores (Pizza Top 8 + Barras Top 10)
7. ✅ **NOVO**: Serviços Mais Rentáveis (Cards Top 3 + Tabela Completa)

---

## ✅ Checklist de Implementação

- [x] Backend: Método `getServicosRentaveis()` no `bi.service.ts`
- [x] Backend: Controller `getServicosRentaveis()` no `biController.ts`
- [x] Backend: Rota `/servicos-rentaveis` no `bi.routes.ts`
- [x] Frontend: Método `getServicosRentaveis()` no `biService.ts`
- [x] Frontend: Método `getGastosFornecedor()` melhorado com logs
- [x] Frontend: Estado `gastosFornecedor` no componente
- [x] Frontend: Estado `servicosRentaveis` no componente
- [x] Frontend: Carregamento paralelo de dados
- [x] Frontend: Gráfico de Pizza (Top 8 Fornecedores)
- [x] Frontend: Gráfico de Barras (Top 10 Fornecedores)
- [x] Frontend: Cards Top 3 Serviços Rentáveis
- [x] Frontend: Tabela Completa de Serviços Rentáveis
- [x] Frontend: Mensagens de "sem dados"
- [x] Frontend: Tratamento de erros
- [x] Frontend: Logs detalhados para debug

---

## 🎯 Próximos Passos (Opcional)

1. **Filtros Adicionais**
   - Filtrar fornecedores por categoria
   - Filtrar serviços por classificação

2. **Exportação**
   - Exportar dados de fornecedores para Excel
   - Exportar ranking de serviços para PDF

3. **Comparações**
   - Comparar períodos diferentes
   - Mostrar variação percentual mês a mês

4. **Alertas**
   - Alertar quando um fornecedor ultrapassar um limite de gastos
   - Alertar quando um serviço estiver com markup negativo

---

## 📝 Notas Importantes

- Os gráficos são **responsivos** e se adaptam a diferentes tamanhos de tela
- Suporte completo para **Dark Mode**
- Cores **consistentes** entre todos os gráficos
- **Tooltips informativos** em todos os gráficos
- **Animações suaves** ao carregar os dados
- **Ordenação automática** por valor (maior para menor)

---

**Data de Implementação**: 09/02/2026  
**Versão**: 1.0.0  
**Status**: ✅ Completo e Funcional
