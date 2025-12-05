# 📊 Gráfico de Gantt para Gestão de Obras

## 🎯 Visão Geral

Implementado um gráfico de Gantt profissional na página de **Gestão de Obras** usando a biblioteca `vis.js` (react-visjs-timeline). A visualização permite acompanhar o andamento de todas as obras organizadas por equipe em uma timeline interativa.

---

## ✨ Funcionalidades

### 1. **Visualização por Equipe**
- Cada equipe tem sua própria linha no timeline
- Cores distintas para cada equipe (paleta profissional)
- Contador de obras por equipe

### 2. **Status das Obras**
- **BACKLOG** - Cinza (aguardando início)
- **A FAZER** - Azul claro (planejada)
- **ANDAMENTO** - Verde (em execução)
- **CONCLUIDO** - Verde escuro (finalizada)
- **ATRASADA** - Vermelho (vencida e não concluída)

### 3. **Controles de Zoom**
- Botões de zoom: **1M**, **2M**, **3M**, **6M**
- Alterna entre 1, 2, 3 ou 6 meses de visualização
- Botão ativo destacado em branco
- Interface intuitiva e responsiva

### 4. **Navegação Temporal**
- Botões para navegar entre períodos (anterior/próximo)
- Botão "Hoje" para voltar ao mês atual
- Navegação ajustada automaticamente ao zoom selecionado

### 5. **Informações Detalhadas**
- Tooltip ao passar o mouse sobre cada obra mostrando:
  - Nome da obra
  - Cliente
  - Status atual
  - Progresso (%)
  - Equipe alocada
  - Datas de início e fim
  - Indicador de atraso (se aplicável)

### 6. **Toggle Kanban ↔ Timeline**
- Botão para alternar entre visualização Kanban e Gantt
- Interface intuitiva com ícones
- Mantém dados sincronizados

---

## 🎨 Design e UX

### Interface
- Design moderno com gradientes e sombras
- Totalmente responsivo (desktop/tablet/mobile)
- Suporte a dark mode
- Animações suaves de transição
- Legenda de status sempre visível

### Interatividade
- Clique nas barras para selecionar obras
- Hover para ver detalhes completos
- Arrastar para navegar no tempo
- Scroll para zoom in/out

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
1. **`frontend/src/components/ObrasGanttChart.tsx`**
   - Componente principal do Gantt Chart
   - 400+ linhas de código
   - Totalmente tipado (TypeScript)

2. **`frontend/src/styles/gantt.css`**
   - Estilos personalizados para vis.js
   - Temas light/dark
   - Animações e transições

3. **`GANTT_CHART_OBRAS.md`**
   - Documentação completa (este arquivo)

### Arquivos Modificados
1. **`frontend/src/pages/ObrasKanban.tsx`**
   - Importação do componente Gantt
   - Estado para controlar view mode
   - Toggle button entre Kanban/Timeline
   - Renderização condicional

2. **`frontend/package.json`** (via npm)
   - Dependência `react-visjs-timeline` adicionada

---

## 🛠️ Tecnologias Utilizadas

- **react-visjs-timeline** - Biblioteca de timeline/Gantt
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Hooks** - useState, useRef, useEffect
- **Sonner** - Toast notifications

---

## 🚀 Como Funciona

### Fluxo de Dados

```
ObrasKanban.tsx
    ↓
carregarObrasKanban()
    ↓
kanbanData (state)
    ↓
Combinar arrays: [...BACKLOG, ...A_FAZER, ...ANDAMENTO, ...CONCLUIDO]
    ↓
ObrasGanttChart.tsx (props: obras)
    ↓
prepararDados()
    ↓
{
  groups: [ /* Equipes agrupadas */ ],
  items: [ /* Obras como barras */ ]
}
    ↓
Timeline (vis.js)
```

### Lógica de Agrupamento

1. **Extrai obras** de todos os status
2. **Agrupa por equipe** usando `equipesMap`
3. **Cria grupos** (linhas do timeline por equipe)
4. **Cria items** (barras representando obras)
5. **Aplica cores** baseadas em equipe e status
6. **Detecta atrasos** comparando data fim com hoje

---

## 📊 Estrutura de Dados

### Interface Obra (esperada)
```typescript
interface Obra {
  id: string;
  nomeObra: string;
  status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
  clienteNome: string;
  dataPrevistaFim?: string;
  progresso: number;
  equipe?: {
    id: string;
    nome: string;
  };
  dataInicio?: string;
}
```

### Cores por Equipe
```typescript
const equipeCores = {
  default: '#3B82F6',  // Azul
  equipe1: '#10B981',  // Verde
  equipe2: '#F59E0B',  // Laranja
  equipe3: '#8B5CF6',  // Roxo
  equipe4: '#EF4444',  // Vermelho
  equipe5: '#06B6D4',  // Ciano
  equipe6: '#EC4899',  // Rosa
  equipe7: '#14B8A6',  // Teal
};
```

---

## 🎯 Casos de Uso

### 1. Gerente de Obras
- Visualizar todas as obras em andamento
- Identificar rapidamente obras atrasadas
- Planejar alocação de equipes
- Analisar carga de trabalho por período

### 2. Coordenador de Equipe
- Ver todas as obras da sua equipe
- Acompanhar progresso temporal
- Identificar conflitos de prazo

### 3. Administração
- Visão geral do portfólio de obras
- Análise de capacidade instalada
- Relatórios visuais para stakeholders

---

## 🔍 Controles de Zoom

O Gantt Chart possui **4 níveis de zoom** para diferentes necessidades de visualização:

### **1 Mês (1M)** - Visão Detalhada
- Ideal para: Acompanhamento diário, microgestão
- Mostra: Todas as obras do mês em alta resolução
- Use quando: Gerenciar obras de curto prazo

### **2 Meses (2M)** - Visão Balanceada
- Ideal para: Planejamento semanal
- Mostra: Duas semanas de obras com boa visualização
- Use quando: Coordenar múltiplas equipes

### **3 Meses (3M)** - Visão Trimestral (Padrão)
- Ideal para: Gestão geral do trimestre
- Mostra: Overview do período mais comum de projetos
- Use quando: Relatórios mensais e planejamento

### **6 Meses (6M)** - Visão Estratégica
- Ideal para: Planejamento de longo prazo
- Mostra: Panorama semestral completo
- Use quando: Análise de capacidade futura

### Como Usar:
- Clique nos botões **1M**, **2M**, **3M** ou **6M** no header
- O botão ativo fica destacado em branco
- A timeline se ajusta automaticamente

---

## 🔧 Configurações e Personalizações

### Modificar Zoom Padrão
No arquivo `ObrasGanttChart.tsx`, linha ~44:
```typescript
const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3 | 6>(3); // Altere para 1, 2 ou 6
```

### Adicionar Novas Cores de Equipe
No arquivo `ObrasGanttChart.tsx`, linha ~36:
```typescript
const equipeCores: { [key: string]: string } = {
  // ... cores existentes
  equipe8: '#0EA5E9', // Nova cor para equipe 8
};
```

### Modificar Altura do Timeline
No arquivo `ObrasGanttChart.tsx`, linha ~158:
```typescript
height: '600px', // Altere para '800px', etc.
```

---

## 🐛 Troubleshooting

### Obras não aparecem?
- Verifique se as obras têm `dataInicio` e `dataPrevistaFim`
- Se não tiverem, o sistema usa datas padrão (hoje + 30 dias)
- Certifique-se que `kanbanData` está populado

### Equipes não estão separadas?
- Verifique se o campo `equipe.id` existe nas obras
- Obras sem equipe vão para "Sem Equipe"

### Timeline não renderiza?
- Abra o console do navegador (F12)
- Verifique se há erros de importação do `react-visjs-timeline`
- Confirme que o CSS foi importado

### Estilos não aplicados?
- Verifique se `gantt.css` foi importado no componente
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se há conflitos com outros estilos globais

---

## 🚀 Melhorias Futuras (Opcional)

1. **Filtros Avançados**
   - Filtrar por status
   - Filtrar por equipe
   - Filtrar por cliente

2. **Edição Inline**
   - Arrastar barras para alterar datas
   - Redimensionar para ajustar duração

3. **Exportação**
   - Exportar como PNG/PDF
   - Exportar dados como Excel

4. **Dependências**
   - Mostrar dependências entre obras
   - Setas conectando obras relacionadas

5. **Marcos (Milestones)**
   - Adicionar marcos importantes
   - Entregas parciais
   - Aprovações

6. **Recursos**
   - Visualizar alocação de recursos
   - Conflitos de equipamento
   - Disponibilidade de materiais

---

## 📝 Observações Importantes

1. **Performance**: Para mais de 100 obras, considere paginação ou virtualização
2. **Dados**: O componente é "stateless" - recebe dados via props
3. **Sincronização**: Alterações no Kanban refletem automaticamente no Gantt
4. **Navegação**: O botão "Hoje" centraliza a visualização no mês atual
5. **Responsividade**: Em mobile, use dois dedos para zoom

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a documentação acima
2. Consulte os comentários no código
3. Revise os logs do console do navegador
4. Teste com dados de exemplo primeiro

---

**Desenvolvido com ❤️ usando React + vis.js + TypeScript**
**Versão: 1.0.0**
**Data: 04/12/2024**

