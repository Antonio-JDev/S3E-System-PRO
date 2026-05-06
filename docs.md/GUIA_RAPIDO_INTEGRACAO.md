# 🚀 Guia Rápido de Integração - Flags de Validade de Preço

## 📍 Onde Integrar

### 1. Componente de Orçamentos (`NovoOrcamentoPage.tsx` ou `Orcamentos.tsx`)

#### Passo 1: Importar componentes (no topo do arquivo)

```typescript
import PrecoValidadeFlag from "../components/PrecoValidadeFlag";
import HistoricoPrecosModal from "../components/HistoricoPrecosModal";
```

#### Passo 2: Adicionar estados (dentro do componente)

```typescript
const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
  null
);
```

#### Passo 3: Atualizar interface Material (no início do arquivo)

```typescript
interface Material {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoque: number;
  unidadeMedida: string;
  ultimaAtualizacaoPreco?: string | null; // ← ADICIONAR ESTA LINHA
  // ... outros campos
}
```

#### Passo 4: Integrar na listagem de materiais

**ANTES:**

```typescript
{materiaisFiltrados.map(material => (
  <div key={material.id}>
    <h4>{material.nome}</h4>
    <p>R$ {material.preco.toFixed(2)}</p>
    <button onClick={() => handleAddItem(material)}>
      Adicionar
    </button>
  </div>
))}
```

**DEPOIS:**

```typescript
{materiaisFiltrados.map(material => (
  <div key={material.id}>
    <div className="flex items-center gap-3">
      <h4>{material.nome}</h4>

      {/* ✨ FLAG DE VALIDADE - ADICIONAR AQUI */}
      <PrecoValidadeFlag
        ultimaAtualizacao={material.ultimaAtualizacaoPreco}
        precoAtual={material.preco}
        materialNome={material.nome}
      />
    </div>

    <p>R$ {material.preco.toFixed(2)}</p>

    {/* 📊 BOTÃO DE HISTÓRICO - ADICIONAR AQUI */}
    <button
      onClick={() => {
        setSelectedMaterialId(material.id);
        setHistoricoModalOpen(true);
      }}
      className="text-sm text-gray-600 hover:text-indigo-600"
    >
      📊 Ver Histórico
    </button>

    <button onClick={() => handleAddItem(material)}>
      Adicionar
    </button>
  </div>
))}

{/* ✨ MODAL - ADICIONAR NO FINAL DO RETURN, FORA DO MAP */}
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

## 🎯 Localização Exata nos Arquivos

### `frontend/src/pages/NovoOrcamentoPage.tsx`

Procure por:

```typescript
// Linha ~1200-1300: Onde renderiza lista de materiais disponíveis
{materiaisFiltrados.map(material => (
```

Adicione acima deste map:

- Estados `historicoModalOpen` e `selectedMaterialId`
- Imports dos componentes

Adicione dentro do map:

- `<PrecoValidadeFlag />` ao lado do nome
- Botão "Ver Histórico"

Adicione no final do return:

- `<HistoricoPrecosModal />`

---

## 💡 Exemplo Completo - Card de Material

```typescript
<div className="bg-white border rounded-xl p-4 hover:shadow-lg transition-all">
  {/* Cabeçalho com Flag */}
  <div className="flex items-start justify-between mb-3">
    <div className="flex-1">
      <div className="flex items-center gap-3">
        <h4 className="font-bold text-gray-900">{material.nome}</h4>

        {/* FLAG DE VALIDADE */}
        <PrecoValidadeFlag
          ultimaAtualizacao={material.ultimaAtualizacaoPreco}
          precoAtual={material.preco}
          materialNome={material.nome}
        />
      </div>

      <p className="text-sm text-gray-600 mt-1">
        SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
      </p>
    </div>
  </div>

  {/* Preço e Informações */}
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs text-gray-500">Preço Unitário</p>
      <p className="text-2xl font-bold text-indigo-600">
        R$ {material.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
      {material.ultimaAtualizacaoPreco && (
        <p className="text-xs text-gray-500 mt-1">
          Atualizado em {new Date(material.ultimaAtualizacaoPreco).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>

    {/* Ações */}
    <div className="flex flex-col gap-2">
      {/* Botão Histórico */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedMaterialId(material.id);
          setHistoricoModalOpen(true);
        }}
        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold"
      >
        <ClockIcon className="w-4 h-4" />
        Histórico
      </button>

      {/* Botão Adicionar */}
      <button
        onClick={() => handleAddMaterial(material)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold"
      >
        ➕ Adicionar
      </button>
    </div>
  </div>
</div>
```

---

## 🔔 Alertas Automáticos ao Adicionar Material

Adicione esta validação na função `handleAddItem`:

```typescript
const handleAddItem = (material: Material) => {
  // ✨ VALIDAÇÃO DE PREÇO DESATUALIZADO
  const diasDesdeAtualizacao = material.ultimaAtualizacaoPreco
    ? Math.ceil(
        (new Date().getTime() -
          new Date(material.ultimaAtualizacaoPreco).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  if (diasDesdeAtualizacao > 27) {
    const confirmar = window.confirm(
      `⚠️ ATENÇÃO: Preço Desatualizado!\n\n` +
        `Material: ${material.nome}\n` +
        `Última atualização: há ${diasDesdeAtualizacao} dias\n\n` +
        `Recomenda-se atualizar o preço antes de adicionar ao orçamento.\n\n` +
        `Deseja continuar mesmo assim?`
    );

    if (!confirmar) {
      return; // Não adiciona se usuário cancelar
    }
  } else if (diasDesdeAtualizacao > 15) {
    toast.warning(
      `⚠️ Preço próximo de expirar (${diasDesdeAtualizacao} dias). ` +
        `Considere atualizar em breve.`,
      { duration: 5000 }
    );
  }

  // Continua com a adição normal do item
  const newItem: OrcamentoItem = {
    tipo: "MATERIAL",
    materialId: material.id,
    nome: material.nome,
    // ... resto da lógica
  };

  setItems((prev) => [...prev, newItem]);
};
```

---

## 🎨 Estilos Personalizados (Opcional)

Se quiser customizar as cores das flags:

```typescript
// Em PrecoValidadeFlag.tsx, ajuste:
const getStatusPreco = () => {
  if (dias <= 15) {
    return {
      cor: "bg-emerald-500", // ← Altere aqui
      texto: "Preço OK",
      // ...
    };
  }
  // ...
};
```

---

## 📱 Responsividade

Os componentes são totalmente responsivos:

- Desktop: Flags ao lado do nome
- Mobile: Flags abaixo do nome
- HoverCard adapta posição automaticamente
- Modal responsivo em todos os tamanhos

---

## 🧪 Testando a Integração

### 1. Gerar Template JSON

```bash
# No navegador:
Atualização de Preços → 📄 JSON
```

### 2. Editar JSON

```json
{
  "sku": "MAT001",
  "precoAtual": 2.5,
  "precoNovo": 2.7 // ← Altere para 2.70
}
```

### 3. Importar

```bash
Atualização de Preços → Importar JSON → Selecionar arquivo
```

### 4. Ver Histórico

```bash
Qualquer lista de materiais → Botão "Histórico" → Modal abre
```

### 5. Ver Flag em Orçamento

```bash
Novo Orçamento → Adicionar Material → Flag aparece ao lado do nome
```

---

## 🐛 Troubleshooting

### Problema: Flag não aparece

**Solução:** Certifique-se de que `ultimaAtualizacaoPreco` está sendo retornado
pela API

```typescript
// No backend, ao buscar materiais:
const materiais = await prisma.material.findMany({
  select: {
    id: true,
    nome: true,
    preco: true,
    ultimaAtualizacaoPreco: true, // ← Incluir este campo
    // ... outros campos
  },
});
```

### Problema: HoverCard não abre

**Solução:** Verifique se instalou o componente:

```bash
cd frontend
npx shadcn@latest add hover-card
```

### Problema: Modal de histórico não abre

**Solução:** Verifique se adicionou os estados necessários

### Problema: JSON corrompido ao importar

**Solução:** Valide o JSON em <https://jsonlint.com/> antes de importar

---

## ✅ Checklist de Integração

- [ ] Backend: Migration aplicada (`ultimaAtualizacaoPreco` +
      `historico_precos`)
- [ ] Backend: Endpoints de template JSON/PDF funcionando
- [ ] Backend: Endpoint de histórico funcionando
- [ ] Frontend: HoverCard do shadcn instalado
- [ ] Frontend: `PrecoValidadeFlag` importado no componente
- [ ] Frontend: `HistoricoPrecosModal` importado no componente
- [ ] Frontend: Estados `historicoModalOpen` e `selectedMaterialId` criados
- [ ] Frontend: Interface `Material` atualizada com `ultimaAtualizacaoPreco`
- [ ] Frontend: Flag adicionada na listagem de materiais
- [ ] Frontend: Botão "Ver Histórico" adicionado
- [ ] Frontend: Modal renderizado no final do componente
- [ ] Teste: Download de JSON funcionando
- [ ] Teste: Download de PDF funcionando
- [ ] Teste: Importação de JSON funcionando
- [ ] Teste: Preview mostrando alterações
- [ ] Teste: Histórico sendo salvo corretamente
- [ ] Teste: Flags mudando de cor conforme dias

---

## 📞 Exemplo Real de Uso

```typescript
// ==================== EXEMPLO COMPLETO ====================
import React, { useState } from 'react';
import PrecoValidadeFlag from './PrecoValidadeFlag';
import HistoricoPrecosModal from './HistoricoPrecosModal';

const MeuComponenteDeOrcamento = () => {
  // Estados necessários
  const [materiaisFiltrados, setMateriaisFiltrados] = useState([]);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Função para adicionar material ao orçamento
  const handleAddMaterial = (material: any) => {
    // Validar preço antes de adicionar
    const dias = calcularDias(material.ultimaAtualizacaoPreco);

    if (dias > 27) {
      alert('⚠️ Preço desatualizado! Atualize antes de usar.');
      return;
    }

    // Adicionar normalmente...
  };

  return (
    <div>
      {/* Lista de materiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materiaisFiltrados.map(material => (
          <div key={material.id} className="card">
            {/* Nome com Flag */}
            <div className="flex items-center gap-3 mb-2">
              <h3>{material.nome}</h3>
              <PrecoValidadeFlag
                ultimaAtualizacao={material.ultimaAtualizacaoPreco}
                precoAtual={material.preco}
                materialNome={material.nome}
              />
            </div>

            {/* Preço */}
            <p className="text-2xl font-bold">
              R$ {material.preco.toFixed(2)}
            </p>

            {/* Ações */}
            <div className="flex gap-2 mt-3">
              <button onClick={() => {
                setSelectedMaterialId(material.id);
                setHistoricoModalOpen(true);
              }}>
                📊 Histórico
              </button>

              <button onClick={() => handleAddMaterial(material)}>
                ➕ Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Histórico - NO FINAL */}
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

## 🎨 Customização de Cores

### Alterar cores das flags

Edite `frontend/src/components/PrecoValidadeFlag.tsx`:

```typescript
// Linha ~30-50
const getStatusPreco = () => {
  if (dias <= 15) {
    return {
      cor: "bg-emerald-500", // ← Sua cor aqui
      texto: "Preço Atualizado", // ← Seu texto aqui
      // ...
    };
  }
  // ...
};
```

### Alterar limites de dias

```typescript
// Linha ~25
if (dias <= 20) {        // ← Era 15, agora 20
  return { cor: 'bg-green-500', ... };
} else if (dias <= 30) { // ← Era 27, agora 30
  return { cor: 'bg-yellow-500', ... };
}
```

---

## 📊 Exemplo de Retorno da API

Quando você busca materiais, certifique-se de que a resposta inclui
`ultimaAtualizacaoPreco`:

```json
{
  "id": "abc123",
  "nome": "Cabo Flexível 2.5mm",
  "sku": "MAT001",
  "preco": 2.7,
  "estoque": 100,
  "unidadeMedida": "MT",
  "ultimaAtualizacaoPreco": "2024-11-12T15:30:00.000Z", // ← ESTE CAMPO
  "ativo": true
}
```

---

## 🔥 Dicas Avançadas

### 1. Alerta Proativo

```typescript
// No useEffect, verificar materiais críticos
useEffect(() => {
  const criticos = materiais.filter((m) => {
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias > 27;
  });

  if (criticos.length > 0) {
    toast.warning(`⚠️ ${criticos.length} materiais com preço desatualizado!`, {
      action: {
        label: "Atualizar",
        onClick: () => navigate("/atualizacao-precos"),
      },
    });
  }
}, [materiais]);
```

### 2. Badge no Menu

```typescript
// No sidebar, mostrar badge de alertas
<MenuItem href="/atualizacao-precos">
  Atualização de Preços
  {materiaisCriticos > 0 && (
    <span className="badge-red">{materiaisCriticos}</span>
  )}
</MenuItem>
```

### 3. Filtro por Validade

```typescript
const [filtroValidade, setFiltroValidade] = useState<
  "todos" | "criticos" | "ok"
>("todos");

const materiaisFiltrados = materiais.filter((m) => {
  if (filtroValidade === "criticos") {
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias > 27;
  }
  if (filtroValidade === "ok") {
    const dias = calcularDias(m.ultimaAtualizacaoPreco);
    return dias <= 15;
  }
  return true;
});
```

---

## 🚀 Deploy e Produção

### Antes de deploy:

1. ✅ Aplicar migration: `npx prisma migrate deploy`
2. ✅ Compilar backend: `npm run build`
3. ✅ Compilar frontend: `npm run build`
4. ✅ Testar importação JSON em ambiente de staging
5. ✅ Validar que histórico está sendo salvo

### Variáveis de ambiente:

Nenhuma variável adicional necessária! 🎉

---

## 📝 Notas Importantes

⚠️ **NÃO ALTERE** os campos `id` e `sku` no JSON - são usados para identificar
os materiais  
⚠️ **VALIDE** o JSON antes de importar (use um validador online)  
⚠️ **FAÇA BACKUP** do banco antes da primeira importação em produção  
⚠️ **TESTE** com poucos itens primeiro

✅ **PREFIRA JSON** ao invés de Excel - menos propenso a erros  
✅ **USE PDF** para enviar ao fornecedor - mais profissional  
✅ **CONSULTE HISTÓRICO** antes de alterar preços manualmente

---

## 🎓 Suporte

Arquivos de referência:

- `frontend/src/components/PrecoValidadeFlag.tsx` - Componente de flag
- `frontend/src/components/HistoricoPrecosModal.tsx` - Modal de histórico
- `frontend/src/components/MaterialCardComValidade.tsx` - Exemplo completo
- `backend/src/controllers/materiaisController.ts` - Lógica de backend
- `backend/docs/exemplo_template_precos.json` - Exemplo de JSON
- `SISTEMA_ATUALIZACAO_PRECOS.md` - Documentação completa

---

**Sistema criado com ❤️ para S3E Engenharia Elétrica**
