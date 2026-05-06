# 🚀 Sistema Completo de Atualização Dinâmica de Preços

## 📋 Visão Geral

Sistema robusto para gestão dinâmica de preços com validade de 30 dias,
permitindo atualizações em massa via arquivos JSON e visualização completa de
histórico.

---

## ✨ Funcionalidades Principais

### 1. **Geração de Templates** 📄

- **JSON**: Arquivo estruturado com todos os materiais para edição
- **PDF**: Documento estilizado para enviar ao fornecedor

### 2. **Importação Inteligente** 📥

- Aceita arquivos JSON, XLSX e CSV
- Preview automático antes de aplicar alterações
- Validação completa de dados
- Registro de histórico automático

### 3. **Sistema de Validade** 🚦

- **Verde** (✅): 0-15 dias - Preço atualizado
- **Amarelo** (⚠️): 16-27 dias - Atualizar em breve
- **Vermelho** (❌): 28+ dias - Preço desatualizado

### 4. **Histórico Completo** 📊

- Todas as alterações de preço registradas
- Data, preço anterior, preço novo
- Variação percentual
- Motivo e usuário responsável

---

## 🔧 Backend - Endpoints

### 1. Gerar Template

```typescript
GET /api/materiais/template-importacao?formato=json&tipo=todos
GET /api/materiais/template-importacao?formato=pdf&tipo=criticos
```

**Parâmetros:**

- `formato`: `json` | `pdf`
- `tipo`: `todos` | `criticos` (apenas estoque baixo)

**Resposta JSON:**

```json
{
  "versao": "1.0",
  "geradoEm": "2024-11-12T...",
  "empresa": "S3E Engenharia Elétrica",
  "instrucoes": "Atualize apenas o campo 'precoNovo'...",
  "materiais": [
    {
      "id": "abc123",
      "sku": "MAT001",
      "nome": "Cabo Flexível 2.5mm",
      "categoria": "MaterialEletrico",
      "unidadeMedida": "MT",
      "estoque": 100,
      "precoAtual": 2.5,
      "precoNovo": 2.5, // ← EDITAR ESTE CAMPO
      "ultimaAtualizacao": "2024-10-15T...",
      "fornecedor": "Fornecedor XYZ"
    }
  ]
}
```

### 2. Preview de Importação

```typescript
POST /api/materiais/preview-importacao
Content-Type: multipart/form-data
Body: { arquivo: File }
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "totalItens": 150,
    "totalAlteracoes": 145,
    "totalErros": 5,
    "preview": [
      {
        "sku": "MAT001",
        "nome": "Cabo Flexível 2.5mm",
        "precoAtual": 2.5,
        "precoNovo": 2.7,
        "diferenca": 8.0,
        "status": "aumento",
        "mensagem": "Pronto para atualizar"
      }
    ]
  }
}
```

### 3. Importar e Atualizar Preços

```typescript
POST /api/materiais/importar-precos
Content-Type: multipart/form-data
Body: { arquivo: File }
```

### 4. Buscar Histórico de Preços

```typescript
GET /api/materiais/:id/historico-precos
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "material": {
      "nome": "Cabo Flexível 2.5mm",
      "sku": "MAT001",
      "preco": 2.7,
      "ultimaAtualizacaoPreco": "2024-11-12T..."
    },
    "historico": [
      {
        "id": "hist123",
        "precoAntigo": 2.5,
        "precoNovo": 2.7,
        "motivo": "Importação de arquivo",
        "usuario": "Sistema",
        "createdAt": "2024-11-12T..."
      }
    ]
  }
}
```

---

## 🎨 Frontend - Componentes

### 1. **PrecoValidadeFlag** 🚦

Componente que mostra uma flag colorida indicando validade do preço.

**Uso:**

```typescript
import PrecoValidadeFlag from './PrecoValidadeFlag';

<PrecoValidadeFlag
  ultimaAtualizacao={material.ultimaAtualizacaoPreco}
  precoAtual={material.preco}
  materialNome={material.nome}
/>
```

**Funcionalidades:**

- Flag colorida (verde/amarelo/vermelho)
- HoverCard com informações detalhadas
- Cálculo automático de dias desde atualização
- Recomendações personalizadas

### 2. **HistoricoPrecosModal** 📊

Modal que exibe histórico completo de alterações de preço.

**Uso:**

```typescript
import HistoricoPrecosModal from './HistoricoPrecosModal';

const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

// Botão para abrir
<button onClick={() => {
  setSelectedMaterialId(material.id);
  setHistoricoModalOpen(true);
}}>
  Ver Histórico
</button>

// Modal
<HistoricoPrecosModal
  materialId={selectedMaterialId || ''}
  isOpen={historicoModalOpen}
  onClose={() => {
    setHistoricoModalOpen(false);
    setSelectedMaterialId(null);
  }}
/>
```

### 3. **MaterialCardComValidade** 🎴

Componente completo de exemplo com flag, preço e histórico integrados.

**Uso:**

```typescript
import MaterialCardComValidade from './MaterialCardComValidade';

<MaterialCardComValidade
  material={material}
  onSelect={(m) => handleAddMaterial(m)}
  showHistorico={true}
/>
```

---

## 📝 Como Integrar em Orçamentos

### Passo 1: Importar componentes

```typescript
import PrecoValidadeFlag from "../components/PrecoValidadeFlag";
import HistoricoPrecosModal from "../components/HistoricoPrecosModal";
```

### Passo 2: Adicionar estados

```typescript
const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
  null
);
```

### Passo 3: Atualizar interface Material

```typescript
interface Material {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoque: number;
  ultimaAtualizacaoPreco?: string | null; // ← ADICIONAR
  // ... outros campos
}
```

### Passo 4: Adicionar flag na lista de materiais

```typescript
{materiaisFiltrados.map(material => (
  <div key={material.id} className="p-4 border rounded-lg">
    <div className="flex items-center gap-3">
      <h4>{material.nome}</h4>

      {/* FLAG DE VALIDADE */}
      <PrecoValidadeFlag
        ultimaAtualizacao={material.ultimaAtualizacaoPreco}
        precoAtual={material.preco}
        materialNome={material.nome}
      />
    </div>

    <p>R$ {material.preco.toFixed(2)}</p>

    {/* BOTÃO DE HISTÓRICO */}
    <button onClick={() => {
      setSelectedMaterialId(material.id);
      setHistoricoModalOpen(true);
    }}>
      <ClockIcon className="w-5 h-5" /> Ver Histórico
    </button>

    <button onClick={() => handleAddMaterial(material)}>
      Adicionar ao Orçamento
    </button>
  </div>
))}

{/* MODAL DE HISTÓRICO */}
<HistoricoPrecosModal
  materialId={selectedMaterialId || ''}
  isOpen={historicoModalOpen}
  onClose={() => {
    setHistoricoModalOpen(false);
    setSelectedMaterialId(null);
  }}
/>
```

---

## 🔄 Fluxo Completo de Uso

### 1️⃣ Gerar Template

```
Usuário → "Atualização de Preços" → Botão "📄 JSON"
↓
Sistema baixa arquivo template-precos-YYYY-MM-DD.json
```

### 2️⃣ Enviar ao Fornecedor (Opcional)

```
Usuário → Botão "📑 PDF"
↓
Sistema abre PDF em nova aba (para imprimir/enviar)
```

### 3️⃣ Editar JSON

```json
{
  "sku": "MAT001",
  "nome": "Cabo Flexível 2.5mm",
  "precoAtual": 2.5,
  "precoNovo": 2.7 // ← EDITAR AQUI
}
```

### 4️⃣ Importar JSON Atualizado

```
Usuário → "Importar JSON" → Seleciona arquivo → "Processar"
↓
Sistema mostra preview com todas as alterações
↓
Usuário confirma
↓
Sistema atualiza preços + salva histórico + atualiza data
```

### 5️⃣ Usar no Orçamento

```
Usuário cria orçamento → Adiciona material
↓
Sistema mostra flag de validade:
  ✅ Verde = OK
  ⚠️ Amarelo = Verificar em breve
  ❌ Vermelho = ATUALIZAR URGENTE
↓
Usuário pode ver histórico completo clicando no botão
```

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: `materiais`

```sql
ALTER TABLE materiais
ADD COLUMN ultimaAtualizacaoPreco TIMESTAMP;
```

### Tabela: `historico_precos`

```sql
CREATE TABLE historico_precos (
  id VARCHAR PRIMARY KEY,
  materialId VARCHAR REFERENCES materiais(id),
  precoAntigo DECIMAL,
  precoNovo DECIMAL NOT NULL,
  motivo VARCHAR,
  usuario VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_historico_material ON historico_precos(materialId);
CREATE INDEX idx_historico_data ON historico_precos(createdAt);
```

---

## 🎯 Lógica de Validade de Preços

```typescript
const calcularValidadePreco = (
  ultimaAtualizacao: Date | null
): "verde" | "amarelo" | "vermelho" => {
  if (!ultimaAtualizacao) return "vermelho";

  const dias = calcularDiasDesde(ultimaAtualizacao);

  if (dias <= 15) return "verde"; // 0-15 dias
  if (dias <= 27) return "amarelo"; // 16-27 dias
  return "vermelho"; // 28+ dias
};
```

---

## 📦 Dependências Instaladas

**Backend:**

- `exceljs` - Geração de Excel
- `csv-parser` - Parse de CSV
- `papaparse` - Parse avançado
- `joi` - Validação de dados

**Frontend:**

- `xlsx` - Leitura de Excel
- `papaparse` - Parse de CSV
- `@mui/material` - Componentes UI
- `@radix-ui/react-hover-card` - HoverCard (via shadcn)

---

## 🧪 Exemplo de Arquivo JSON

```json
{
  "versao": "1.0",
  "geradoEm": "2024-11-12T15:30:00.000Z",
  "empresa": "S3E Engenharia Elétrica",
  "instrucoes": "Atualize apenas o campo 'precoNovo' de cada material. Não altere os demais campos!",
  "materiais": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sku": "MAT001",
      "nome": "Cabo Flexível 2.5mm",
      "descricao": "Cabo flexível de cobre 2.5mm²",
      "categoria": "MaterialEletrico",
      "tipo": "Fio e Cabo",
      "unidadeMedida": "MT",
      "estoque": 250,
      "estoqueMinimo": 50,
      "precoAtual": 2.5,
      "precoNovo": 2.5,
      "ultimaAtualizacao": "2024-10-15T10:00:00.000Z",
      "fornecedor": "Distribuidora ABC",
      "localizacao": "Prateleira A1"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "sku": "MAT002",
      "nome": "Disjuntor Bipolar 20A",
      "descricao": "Disjuntor termomagnético 20A",
      "categoria": "MaterialEletrico",
      "tipo": "Proteção",
      "unidadeMedida": "UN",
      "estoque": 30,
      "estoqueMinimo": 10,
      "precoAtual": 15.0,
      "precoNovo": 15.0,
      "ultimaAtualizacao": "2024-11-01T14:30:00.000Z",
      "fornecedor": "Elétrica Sul",
      "localizacao": "Prateleira B3"
    }
  ]
}
```

---

## 🎨 Exemplo de Integração Completa

### Componente: `MeuOrcamento.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import PrecoValidadeFlag from '../components/PrecoValidadeFlag';
import HistoricoPrecosModal from '../components/HistoricoPrecosModal';
import { axiosApiService } from '../services/axiosApi';

const MeuOrcamento = () => {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  useEffect(() => {
    loadMateriais();
  }, []);

  const loadMateriais = async () => {
    const response = await axiosApiService.get('/api/materiais');
    setMateriais(response.data);
  };

  const handleAddMaterial = (material: Material) => {
    // Verificar validade do preço antes de adicionar
    const dias = calcularDias(material.ultimaAtualizacaoPreco);

    if (dias > 27) {
      if (!confirm('⚠️ Este material tem preço desatualizado. Deseja continuar?')) {
        return;
      }
    }

    // Adicionar ao orçamento...
  };

  return (
    <div>
      {/* Lista de materiais */}
      {materiais.map(material => (
        <div key={material.id} className="card">
          <div className="flex items-center gap-3">
            <h3>{material.nome}</h3>

            {/* FLAG DE VALIDADE */}
            <PrecoValidadeFlag
              ultimaAtualizacao={material.ultimaAtualizacaoPreco}
              precoAtual={material.preco}
              materialNome={material.nome}
            />
          </div>

          <p className="price">R$ {material.preco.toFixed(2)}</p>

          {/* BOTÃO HISTÓRICO */}
          <button onClick={() => {
            setSelectedMaterialId(material.id);
            setHistoricoModalOpen(true);
          }}>
            📊 Ver Histórico
          </button>

          {/* BOTÃO ADICIONAR */}
          <button onClick={() => handleAddMaterial(material)}>
            ➕ Adicionar
          </button>
        </div>
      ))}

      {/* MODAL DE HISTÓRICO */}
      <HistoricoPrecosModal
        materialId={selectedMaterialId || ''}
        isOpen={historicoModalOpen}
        onClose={() => {
          setHistoricoModalOpen(false);
          setSelectedMaterialId(null);
        }}
      />
    </div>
  );
};
```

---

## 🔍 Funções Utilitárias

### Calcular dias desde atualização

```typescript
const calcularDiasDesdeAtualizacao = (
  ultimaAtualizacao: string | Date | null
): number => {
  if (!ultimaAtualizacao) return 999;

  const dataAtualizacao = new Date(ultimaAtualizacao);
  const hoje = new Date();
  const diffTime = Math.abs(hoje.getTime() - dataAtualizacao.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
```

### Verificar se preço está válido

```typescript
const precoEstaValido = (ultimaAtualizacao: string | Date | null): boolean => {
  const dias = calcularDiasDesdeAtualizacao(ultimaAtualizacao);
  return dias <= 30;
};
```

### Obter status do preço

```typescript
type StatusPreco = "atualizado" | "alerta" | "critico";

const getStatusPreco = (
  ultimaAtualizacao: string | Date | null
): StatusPreco => {
  const dias = calcularDiasDesdeAtualizacao(ultimaAtualizacao);

  if (dias <= 15) return "atualizado";
  if (dias <= 27) return "alerta";
  return "critico";
};
```

---

## 📊 Métricas e Relatórios

### Dashboard de Preços

- Total de materiais com preço atualizado (verde)
- Total de materiais em alerta (amarelo)
- Total de materiais críticos (vermelho)
- Gráfico de evolução de preços

### Exemplo de Query:

```typescript
const getMetricasPrecos = async () => {
  const materiais = await prisma.material.findMany({
    select: {
      id: true,
      nome: true,
      preco: true,
      ultimaAtualizacaoPreco: true,
    },
  });

  const agora = new Date();

  const atualizados = materiais.filter((m) => {
    if (!m.ultimaAtualizacaoPreco) return false;
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias <= 15;
  }).length;

  const alerta = materiais.filter((m) => {
    if (!m.ultimaAtualizacaoPreco) return false;
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias > 15 && dias <= 27;
  }).length;

  const criticos = materiais.filter((m) => {
    if (!m.ultimaAtualizacaoPreco) return true;
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias > 27;
  }).length;

  return { atualizados, alerta, criticos };
};
```

---

## 🛡️ Validações e Segurança

### Backend

- ✅ Validação de formato de arquivo
- ✅ Validação de estrutura JSON
- ✅ Verificação de materiais existentes
- ✅ Transações atômicas (update + histórico)
- ✅ Logs de alterações
- ✅ Limite de tamanho de arquivo (10MB)

### Frontend

- ✅ Validação de tipo de arquivo
- ✅ Preview antes de aplicar
- ✅ Confirmação do usuário
- ✅ Alertas para preços desatualizados
- ✅ Indicadores visuais claros

---

## 🚀 Próximos Passos Recomendados

1. **Alertas Automáticos**
   - Notificações quando preços passam de 27 dias
   - Email automático para responsável

2. **Dashboard de Gestão**
   - Painel com métricas de validade
   - Gráficos de evolução de preços
   - Materiais que precisam atualização urgente

3. **Integração com Fornecedores**
   - API para fornecedores enviarem preços
   - Portal de fornecedores

4. **Relatórios Avançados**
   - Histórico comparativo de preços
   - Análise de variação por fornecedor
   - Tendências de mercado

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:

- `frontend/src/components/MaterialCardComValidade.tsx` - Exemplo completo
- `backend/src/controllers/materiaisController.ts` - Endpoints disponíveis
- `backend/prisma/schema.prisma` - Estrutura de dados

---

## 🎉 Recursos Implementados

✅ Template JSON com todos os dados  
✅ PDF estilizado para fornecedores  
✅ Importação com preview inteligente  
✅ Histórico completo de preços  
✅ Flags visuais de validade (30 dias)  
✅ HoverCard com informações detalhadas  
✅ Modal de histórico interativo  
✅ Registro automático em histórico  
✅ Transações atômicas no banco  
✅ Suporte a JSON, XLSX e CSV

**Sistema 100% Funcional e Pronto para Produção! 🚀**
