# 📊 Comparação de Preços - Documentação Completa

## 🎯 Visão Geral

A funcionalidade de **Comparação de Preços** permite que a S3E System compare
preços de fornecedores com o histórico de compras anterior, facilitando a tomada
de decisão em novas aquisições.

---

## 🔄 Fluxo de Trabalho

```
1. LEVANTAMENTO DE MATERIAIS
   ↓
2. ENVIO PARA FORNECEDOR (sem preços)
   ↓
3. FORNECEDOR RETORNA CSV COM PREÇOS
   ↓
4. UPLOAD DO CSV NO SISTEMA
   ↓
5. SISTEMA COMPARA COM HISTÓRICO
   ↓
6. VISUALIZAÇÃO DA COMPARAÇÃO
   ↓
7. CRIAÇÃO DE ORÇAMENTO COM NOVOS PREÇOS
```

---

## 📋 Funcionalidades Implementadas

### ✅ **1. Upload de Arquivo CSV**

- Interface intuitiva com drag-and-drop visual
- Validação de formato de arquivo (.csv)
- Informações sobre fornecedor
- Instruções claras sobre formato esperado

### ✅ **2. Processamento e Comparação**

- Leitura automática do CSV
- Comparação com última compra
- Verificação de estoque atual
- Cálculo de diferenças percentuais e absolutas

### ✅ **3. Visualização Comparativa**

- Tabela detalhada com todos os itens
- Indicadores visuais de variação:
  - 🟢 **Verde**: Preço menor que anterior
  - 🔴 **Vermelho**: Preço maior que anterior
  - 🔵 **Azul**: Preço igual
  - ⚪ **Cinza**: Sem histórico de compra

### ✅ **4. Estatísticas e Métricas**

- Total de itens na comparação
- Valor total da compra
- Economia total (soma dos itens com preço menor)
- Aumento total (soma dos itens com preço maior)
- Contadores por categoria

### ✅ **5. Filtros e Busca**

- Busca por nome ou código do material
- Filtro por status de comparação
- Resultados em tempo real

### ✅ **6. Integração com Orçamentos**

- Botão para criar orçamento com preços novos
- Navegação automática para módulo de orçamentos
- Dados pré-preenchidos (via localStorage)

### ✅ **7. Histórico de Importações**

- Lista de comparações anteriores
- Acesso rápido a importações passadas
- Informações resumidas (fornecedor, data, valor)

---

## 📁 Estrutura de Arquivos

### **Componentes Criados:**

```
frontend/src/
├── components/
│   └── ComparacaoPrecos.tsx    (Componente principal - 800+ linhas)
├── types/
│   └── index.ts                (Tipos adicionados)
└── constants/
    └── index.tsx               (Ícone CompareIcon adicionado)
```

### **Integração:**

- `App.tsx`: Rota adicionada no switch case
- `constants/index.tsx`: Novo item no `navLinks`
- Sidebar atualizado automaticamente

---

## 🎨 Interface do Usuário

### **Estado Inicial (Sem Importação)**

- Tela de boas-vindas com instruções
- Botão destacado para primeira importação
- Lista de importações anteriores (se houver)

### **Tela de Comparação Ativa**

- **Cards de Estatísticas** (4 cards):
  1. Total de Itens
  2. Valor Total
  3. Economia Total (verde)
  4. Aumento Total (vermelho)

- **Barra de Filtros**:
  - Campo de busca
  - Dropdown de status
  - Botão "Voltar"

- **Tabela Comparativa**: | Material | Qtd | Estoque | Preço Atual | Novo Preço
  | Diferença | Total | Status |
  |----------|-----|---------|-------------|------------|-----------|-------|--------|

- **Ações Finais**:
  - Informações da importação
  - Botão "Criar Orçamento com Estes Preços"

---

## 🔢 Formato do CSV

### **Colunas Obrigatórias:**

```csv
codigo,nome,unidade,quantidade,preco_unitario
MAT-001,Cabo 2.5mm² - Rolo 100m,Rolo,5,295.00
MAT-002,Disjuntor 20A Bipolar,Unidade,10,42.50
MAT-003,Tomada 2P+T 10A,Unidade,20,12.50
```

### **Descrição dos Campos:**

| Campo            | Tipo   | Descrição                     | Exemplo              |
| ---------------- | ------ | ----------------------------- | -------------------- |
| `codigo`         | String | Código interno do material    | MAT-001              |
| `nome`           | String | Nome/descrição do material    | Cabo 2.5mm²          |
| `unidade`        | String | Unidade de medida             | Rolo, Unidade, Barra |
| `quantidade`     | Number | Quantidade solicitada         | 5                    |
| `preco_unitario` | Number | Preço por unidade (use ponto) | 295.00               |

---

## 💾 Tipos TypeScript

```typescript
// Status de comparação
export enum PriceComparisonStatus {
  Higher = "Higher", // Novo preço maior
  Lower = "Lower", // Novo preço menor
  Equal = "Equal", // Preços iguais
  NoHistory = "NoHistory", // Sem histórico de compra
}

// Item individual da comparação
export interface PriceComparisonItem {
  id: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  currentPrice: number | null; // Preço atual (última compra)
  newPrice: number | null; // Preço do novo orçamento
  difference: number | null; // Diferença em %
  differenceValue: number | null; // Diferença em R$
  status: PriceComparisonStatus;
  supplierName?: string;
  lastPurchaseDate?: string;
  stockQuantity?: number;
}

// Importação completa
export interface PriceComparisonImport {
  id: string;
  fileName: string;
  uploadDate: string;
  supplierName: string;
  itemsCount: number;
  totalValue: number;
  items: PriceComparisonItem[];
  status: "pending" | "approved" | "rejected";
}
```

---

## 🔌 Integração Backend (Futuro)

### **Endpoints a Implementar:**

#### **1. Upload e Processamento do CSV**

```typescript
POST /api/price-comparison/import
Content-Type: multipart/form-data

Body:
- file: CSV file
- supplierName: string

Response:
{
  id: string,
  fileName: string,
  supplierName: string,
  itemsCount: number,
  totalValue: number,
  items: PriceComparisonItem[]
}
```

**Lógica Backend:**

1. Receber arquivo CSV
2. Parsear CSV usando biblioteca (ex: `papaparse`, `csv-parser`)
3. Para cada item do CSV:
   - Buscar no banco por `materialCode`
   - Se encontrado:
     - Buscar última compra (`PurchaseOrder` mais recente)
     - Verificar estoque atual (`MaterialItem.stock`)
     - Calcular diferença entre preços
   - Se não encontrado:
     - Marcar como `NoHistory`
4. Retornar comparação completa

---

#### **2. Listar Importações**

```typescript
GET /api/price-comparison

Response:
{
  imports: PriceComparisonImport[]
}
```

---

#### **3. Buscar Importação Específica**

```typescript
GET /api/price-comparison/:id

Response:
{
  import: PriceComparisonImport
}
```

---

#### **4. Criar Orçamento a Partir da Comparação**

```typescript
POST /api/price-comparison/:id/create-budget

Body:
{
  clientId?: string,
  notes?: string
}

Response:
{
  budgetId: string,
  message: "Orçamento criado com sucesso"
}
```

**Lógica Backend:**

1. Buscar importação por ID
2. Criar novo `Budget`
3. Para cada item da comparação:
   - Criar `BudgetItem` com `newPrice`
4. Retornar ID do orçamento criado

---

### **Schema Prisma (Adicionar ao schema.prisma)**

```prisma
model PriceComparison {
  id           String   @id @default(uuid())
  fileName     String
  supplierName String
  uploadDate   DateTime @default(now())
  itemsCount   Int
  totalValue   Float
  status       String   @default("pending") // pending, approved, rejected
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  items        PriceComparisonItem[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model PriceComparisonItem {
  id                 String            @id @default(uuid())
  comparisonId       String
  comparison         PriceComparison   @relation(fields: [comparisonId], references: [id], onDelete: Cascade)
  materialCode       String
  materialName       String
  unit               String
  quantity           Float
  currentPrice       Float?
  newPrice           Float?
  difference         Float?
  differenceValue    Float?
  status             String            // Higher, Lower, Equal, NoHistory
  supplierName       String?
  lastPurchaseDate   DateTime?
  stockQuantity      Float?
  createdAt          DateTime          @default(now())
}
```

---

## 🎨 Cores e Estilo

### **Paleta de Cores:**

- **Verde** (`bg-green-50`, `text-green-700`): Economia/Preço menor
- **Vermelho** (`bg-red-50`, `text-red-700`): Aumento/Preço maior
- **Azul** (`bg-blue-50`, `text-blue-700`): Preço igual
- **Cinza** (`bg-gray-50`, `text-gray-700`): Sem histórico
- **Brand S3E** (`bg-brand-s3e`): Botões principais

### **Ícones:**

- 📊 Comparação de Preços (header)
- 📤 Upload de arquivo
- 💰 Economia total
- 📈 Aumento total
- 🔍 Busca
- 📝 Criar orçamento

---

## 📊 Cálculos Implementados

### **1. Diferença Percentual**

```typescript
difference = ((newPrice - currentPrice) / currentPrice) * 100;
```

### **2. Diferença em Valor Absoluto**

```typescript
differenceValue = newPrice - currentPrice;
```

### **3. Economia Total**

```typescript
totalSavings = items
  .filter((item) => item.status === "Lower")
  .reduce((sum, item) => sum + abs(item.differenceValue) * item.quantity, 0);
```

### **4. Aumento Total**

```typescript
totalIncrease = items
  .filter((item) => item.status === "Higher")
  .reduce((sum, item) => sum + item.differenceValue * item.quantity, 0);
```

### **5. Valor Total**

```typescript
totalValue = items.reduce(
  (sum, item) => sum + item.newPrice * item.quantity,
  0
);
```

---

## 🔄 Estados da Aplicação

### **Estado do Componente:**

```typescript
const [imports, setImports] = useState<PriceComparisonImport[]>([]);
const [selectedImport, setSelectedImport] =
  useState<PriceComparisonImport | null>(null);
const [searchTerm, setSearchTerm] = useState("");
const [filterStatus, setFilterStatus] = useState<PriceComparisonStatus | "all">(
  "all"
);
const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
const [supplierName, setSupplierName] = useState("");
const [selectedFile, setSelectedFile] = useState<File | null>(null);
```

### **Fluxo de Estados:**

1. **Inicial**: `selectedImport = null` → Tela de boas-vindas
2. **Upload**: `isUploadModalOpen = true` → Modal de upload
3. **Processamento**: CSV é parseado → Novo import criado
4. **Visualização**: `selectedImport = import` → Tabela comparativa
5. **Navegação**: Dados salvos no localStorage → Redirect para Orçamentos

---

## 🧪 Casos de Teste

### **Cenário 1: Upload de CSV Válido**

1. Clicar em "Importar CSV"
2. Preencher nome do fornecedor
3. Selecionar arquivo .csv válido
4. Clicar em "Processar e Comparar"
5. **Resultado**: Tabela com comparação aparece

### **Cenário 2: Filtro por Status**

1. Ter uma comparação ativa
2. Selecionar filtro "Preço Menor"
3. **Resultado**: Apenas itens com preço menor aparecem

### **Cenário 3: Busca por Material**

1. Digitar "Cabo" na busca
2. **Resultado**: Apenas materiais com "Cabo" no nome aparecem

### **Cenário 4: Criar Orçamento**

1. Ter uma comparação ativa
2. Clicar em "Criar Orçamento com Estes Preços"
3. **Resultado**: Redirecionado para Orçamentos com dados pré-preenchidos

### **Cenário 5: Histórico de Importações**

1. Fazer múltiplas importações
2. Voltar à tela inicial
3. **Resultado**: Lista de importações anteriores aparece
4. Clicar em uma importação
5. **Resultado**: Comparação é recarregada

---

## 🚀 Melhorias Futuras

### **Fase 2 - Backend Integration:**

- [ ] API de upload e processamento de CSV
- [ ] Persistência no banco de dados
- [ ] Histórico real de importações
- [ ] Busca real de última compra

### **Fase 3 - Funcionalidades Avançadas:**

- [ ] Exportação da comparação para PDF
- [ ] Gráficos de variação de preços
- [ ] Alertas de aumento significativo
- [ ] Comparação entre múltiplos fornecedores
- [ ] Sugestão automática de fornecedor mais barato

### **Fase 4 - Inteligência:**

- [ ] Machine Learning para previsão de preços
- [ ] Análise de tendência de preços
- [ ] Recomendações automáticas
- [ ] Alertas de oportunidade de compra

---

## 📝 Exemplo de Uso Completo

### **1. Preparação**

```
Engenheiro faz levantamento:
- 5 rolos de cabo 2,5mm²
- 10 disjuntores 20A
- 20 tomadas 2P+T
- 30 eletrodutos 3/4"
- 2 quadros de distribuição
```

### **2. Solicitação ao Fornecedor**

```
Email enviado para fornecedor com lista de materiais
(sem preços, apenas códigos e quantidades)
```

### **3. Retorno do Fornecedor**

```
Fornecedor retorna arquivo CSV com preços preenchidos:
orcamento_fornecedor_xyz.csv
```

### **4. Upload no Sistema**

```
- Acessar "Comparação de Preços"
- Clicar em "Importar CSV"
- Nome do Fornecedor: "Eletro Materiais XYZ"
- Selecionar arquivo: orcamento_fornecedor_xyz.csv
- Clicar em "Processar e Comparar"
```

### **5. Análise**

```
Sistema mostra:
✅ Economia de R$ 75,00 (3 itens mais baratos)
⚠️ Aumento de R$ 120,00 (2 itens mais caros)
ℹ️ Diferença líquida: +R$ 45,00 (aumento total)
```

### **6. Decisão**

```
Gerente analisa:
- Itens com aumento: pode negociar?
- Itens com economia: aproveitar!
- Itens novos: sem comparação disponível
```

### **7. Criação de Orçamento**

```
- Clicar em "Criar Orçamento com Estes Preços"
- Sistema redireciona para Orçamentos
- Orçamento pré-preenchido com novos preços
- Finalizar orçamento para cliente
```

---

## 🎉 Conclusão

A funcionalidade de **Comparação de Preços** está 100% implementada no frontend
e pronta para uso! 🚀

### **✅ O que está funcionando:**

- Interface completa e responsiva
- Upload e processamento de CSV (mock)
- Tabela comparativa com filtros
- Cálculos de economia e aumentos
- Integração com módulo de orçamentos
- Histórico de importações

### **🔄 Próximos passos:**

1. Implementar endpoints no backend
2. Integrar com banco de dados real
3. Conectar frontend com API
4. Testes de integração completos

**Documentação atualizada em:** Outubro 2025 **Versão:** 1.0.0 **Desenvolvido
para:** S3E System PRO
