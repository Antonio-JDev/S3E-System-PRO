# 🔄 Migração: Chart.js → Recharts (Fluxo de Caixa)

## 🎯 Motivo da Migração

O componente `FluxoCaixa.tsx` foi originalmente desenvolvido com **Chart.js** e
**react-chartjs-2**, mas o sistema já utiliza **Recharts** (via shadcn/ui) em
outras páginas como o BI.

Para manter a **consistência** do projeto e evitar conflitos de dependências,
migramos os gráficos do Fluxo de Caixa para usar **Recharts**.

---

## ✅ Vantagens da Migração

### **1. Consistência no Projeto**

```
✅ BI já usa Recharts
✅ shadcn/ui usa Recharts
✅ Reduz número de bibliotecas de gráficos
```

### **2. Melhor Integração**

```
✅ Recharts é React-native (não usa Canvas)
✅ Melhor performance em SSR/SSG
✅ Componentes mais declarativos
```

### **3. Sem Conflitos**

```
✅ Evita conflitos entre Chart.js e Recharts
✅ Bundle menor (remove Chart.js)
✅ Menos dependências para gerenciar
```

---

## 🔧 Alterações Realizadas

### **Arquivo:** `frontend/src/components/FluxoCaixa.tsx`

#### **ANTES (Chart.js):**

```typescript
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
```

#### **DEPOIS (Recharts):**

```typescript
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
```

---

## 📊 Comparação de Gráficos

### **1. Gráfico de Barras (Entradas vs Saídas)**

#### **ANTES (Chart.js):**

```typescript
const configGraficoBarras = {
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [
        {
            label: 'Entradas (R$)',
            data: [1000, 2000, 3000],
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
        }
    ]
};

<Bar data={configGraficoBarras} options={opcoesGrafico} />
```

#### **DEPOIS (Recharts):**

```typescript
const dadosGrafico = [
    { periodo: 'Jan', entradas: 1000, saidas: 800 },
    { periodo: 'Fev', entradas: 2000, saidas: 1500 },
    { periodo: 'Mar', entradas: 3000, saidas: 2200 },
];

<ResponsiveContainer width="100%" height="100%">
    <BarChart data={dadosGrafico}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="periodo" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="entradas" name="Entradas" fill="#22c55e" />
        <Bar dataKey="saidas" name="Saídas" fill="#ef4444" />
    </BarChart>
</ResponsiveContainer>
```

---

### **2. Gráfico de Linha/Área (Saldo Acumulado)**

#### **ANTES (Chart.js):**

```typescript
const configGraficoLinha = {
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [
        {
            label: 'Saldo Acumulado (R$)',
            data: [5000, 7000, 9500],
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 1)',
            fill: true,
        }
    ]
};

<Line data={configGraficoLinha} options={opcoesGrafico} />
```

#### **DEPOIS (Recharts):**

```typescript
const dadosGrafico = [
    { periodo: 'Jan', saldo: 5000 },
    { periodo: 'Fev', saldo: 7000 },
    { periodo: 'Mar', saldo: 9500 },
];

<ResponsiveContainer width="100%" height="100%">
    <AreaChart data={dadosGrafico}>
        <defs>
            <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="periodo" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
            type="monotone"
            dataKey="saldo"
            name="Saldo Acumulado"
            stroke="#3b82f6"
            fill="url(#colorSaldo)"
        />
    </AreaChart>
</ResponsiveContainer>
```

---

## 🎨 Melhorias Visuais

### **1. Tooltip Customizado**

```typescript
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }} className="text-sm">
                        {entry.name}: {formatarMoeda(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};
```

**Resultado:**

- ✅ Design consistente com Tailwind CSS
- ✅ Formatação de moeda brasileira
- ✅ Cores personalizadas por série

---

### **2. Formatador de Moeda**

```typescript
const formatarMoeda = (valor: number) => {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};
```

Usado em:

- ✅ Eixo Y dos gráficos
- ✅ Tooltips
- ✅ Legendas

---

### **3. Gráfico de Área com Gradiente**

```typescript
<defs>
    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
    </linearGradient>
</defs>
<Area
    type="monotone"
    dataKey="saldo"
    fill="url(#colorSaldo)"
/>
```

**Resultado:**

- ✅ Preenchimento gradiente azul
- ✅ Transição suave (monotone)
- ✅ Visual mais moderno

---

### **4. Barras com Cantos Arredondados**

```typescript
<Bar
    dataKey="entradas"
    fill="#22c55e"
    radius={[8, 8, 0, 0]}  // ← Arredonda topo das barras
/>
```

---

## 📦 Estrutura de Dados

### **Formato Chart.js (Antigo):**

```typescript
{
    labels: ['01 jan', '02 jan', '03 jan'],
    datasets: [
        { label: 'Entradas', data: [1000, 2000, 3000] },
        { label: 'Saídas', data: [800, 1500, 2200] }
    ]
}
```

### **Formato Recharts (Novo):**

```typescript
[
  { periodo: "01 jan", entradas: 1000, saidas: 800, saldo: 5000 },
  { periodo: "02 jan", entradas: 2000, saidas: 1500, saldo: 7000 },
  { periodo: "03 jan", entradas: 3000, saidas: 2200, saldo: 9500 },
];
```

**Vantagens:**

- ✅ Estrutura mais simples e limpa
- ✅ Mais fácil de manipular em TypeScript
- ✅ Dados agrupados por período (não separados em arrays)

---

## 🔍 Comparação de Funcionalidades

| Funcionalidade      | Chart.js        | Recharts | Status         |
| ------------------- | --------------- | -------- | -------------- |
| Gráfico de Barras   | ✅              | ✅       | ✅ Migrado     |
| Gráfico de Linha    | ✅              | ✅       | ✅ Migrado     |
| Gráfico de Área     | ⚠️ (com plugin) | ✅       | ✅ Melhorado   |
| Tooltip Customizado | ✅              | ✅       | ✅ Mais bonito |
| Formatação Moeda    | ✅              | ✅       | ✅ Mantido     |
| Responsivo          | ✅              | ✅       | ✅ Mantido     |
| Gradientes          | ⚠️ (complexo)   | ✅       | ✅ Mais fácil  |
| Animações           | ✅              | ✅       | ✅ Mantido     |

---

## ✅ Checklist de Validação

Após a migração, teste:

- [ ] Gráfico de barras exibe Entradas e Saídas corretamente
- [ ] Gráfico de área exibe Saldo Acumulado com gradiente
- [ ] Tooltips aparecem ao passar o mouse
- [ ] Tooltips mostram valores formatados em R$
- [ ] Eixo Y mostra valores em R$
- [ ] Eixo X mostra períodos (dia/semana/mês)
- [ ] Filtros (30/60/90 dias) funcionam
- [ ] Modo (Confirmado/Previsão) funciona
- [ ] Agrupamento (Dia/Semana/Mês) funciona
- [ ] Gráficos são responsivos (desktop/mobile)
- [ ] Não há erros no console do navegador

---

## 🚀 Como Testar

1. **Acesse o Fluxo de Caixa:**
   - Financeiro → Fluxo de Caixa

2. **Teste os Filtros:**
   - Alterne entre 30, 60 e 90 dias
   - Alterne entre Confirmado e Previsão
   - Alterne entre Diário, Semanal e Mensal

3. **Teste os Gráficos:**
   - Passe o mouse sobre as barras (tooltips)
   - Passe o mouse sobre a linha (tooltips)
   - Verifique cores e formatação

4. **Teste Responsividade:**
   - Redimensione a janela do navegador
   - Gráficos devem se ajustar automaticamente

---

## 📚 Dependências

### **Antes:**

```json
{
  "chart.js": "^4.x.x",
  "react-chartjs-2": "^5.x.x"
}
```

### **Depois:**

```json
{
  "recharts": "^3.3.0" // ✅ Já estava instalado!
}
```

---

## 🎯 Resultado Final

```
✅ Gráficos funcionando com Recharts
✅ Visual moderno com gradientes
✅ Tooltips customizados
✅ Responsivo em todos os tamanhos
✅ Consistente com o resto do sistema (BI)
✅ Código mais limpo e declarativo
✅ Sem conflitos de bibliotecas
```

---

## 📝 Notas Técnicas

### **Por que AreaChart ao invés de LineChart?**

O `AreaChart` do Recharts permite:

- ✅ Preenchimento com gradiente
- ✅ Área sombreada abaixo da linha
- ✅ Visual mais impactante para saldo acumulado

### **ResponsiveContainer**

Sempre use `ResponsiveContainer` do Recharts para garantir que o gráfico se
ajuste ao tamanho do container:

```typescript
<ResponsiveContainer width="100%" height="100%">
    <BarChart data={dados}>
        {/* ... */}
    </BarChart>
</ResponsiveContainer>
```

---

## 🔗 Referências

- **Recharts Docs:** <https://recharts.org/>
- **shadcn/ui Charts:** <https://ui.shadcn.com/charts>
- **Recharts Examples:** <https://recharts.org/en-US/examples>

---

**Sistema S3E - Fluxo de Caixa com Recharts v1.0**  
_"Gráficos consistentes, código limpo!"_ ✅
