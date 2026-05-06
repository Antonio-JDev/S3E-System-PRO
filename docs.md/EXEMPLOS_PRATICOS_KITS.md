# 🎯 Exemplos Práticos - Construtor de Kits

## 📋 Casos de Uso Reais

---

## Exemplo 1: Quadro de Medição Residencial Padrão

### Cenário:

Prédio residencial com 8 apartamentos, instalação padrão bifásica.

### Configuração Passo a Passo:

#### **Etapa 1: Informações Básicas**

```
Nome: Kit Medição Residencial 8 Apartamentos
Tipo: Quadro de Medição
Descrição: Padrão de entrada bifásico para edifício residencial
```

#### **Etapa 2: Estrutura**

```
Material: Policarbonato
Quantidade de Medidores: 8
Caixas Selecionadas:
  - 8x Caixa de Policarbonato para 1 medidor
```

#### **Etapa 3: Disjuntor Geral**

```
Tipo: Disjuntor DIN
Polaridade: Bipolar
Modelo: Disjuntor DIN 63A Bipolar - 6KA
```

#### **Etapa 4: Disjuntores por Medidor**

```
Polaridade: Bipolar
Amperagem: 50A
Quantidade por Medidor: 1
Total: 8 disjuntores

Cabos Automáticos: 10mm² HEPR (rígido)
```

#### **Etapa 5: DPS**

```
Classe: DPS CLASSE 2
Quantidade: 3 unidades
TCM: 9 cm
Terra: 30 cm de cabo 6mm² verde
Barramento: 1 pente monofásico
Disjuntores DPS: 3x 25A Monopolar
```

#### **Etapa 6: Acabamentos**

```
Parafusos:
  - 24x Parafuso M4 x 40mm
  - 24x Arruela lisa M4
  - 24x Arruela de pressão M4

Terminais Tubulares: 12 unidades
Curva Box: 8 unidades (1 por caixa)
```

#### **Etapa 7: Terminais de Compressão**

```
Polaridade: Bipolar
Cálculo: 8 disjuntores × 3 terminais = 24 terminais
Tipo: Terminal Olhal 10mm²
```

### 💰 Resumo Financeiro:

```
Caixas Policarbonato: R$ 1.200,00
Disjuntor Geral 63A: R$ 180,00
8x Disjuntores 50A: R$ 560,00
DPS Classe 2: R$ 450,00
Cabos e Acabamentos: R$ 320,00
Terminais: R$ 120,00
─────────────────────────────
TOTAL: R$ 2.830,00
```

---

## Exemplo 2: Quadro de Medição Comercial de Grande Porte

### Cenário:

Shopping center com 20 lojas, instalação trifásica de alta potência.

### Configuração Passo a Passo:

#### **Etapa 1: Informações Básicas**

```
Nome: Kit Medição Shopping - Bloco A
Tipo: Quadro de Medição
Descrição: Entrada principal trifásica para área comercial
```

#### **Etapa 2: Estrutura**

```
Material: Alumínio
Quantidade de Medidores: 20
Modelo: Quadro de Alumínio 20 Medidores - IP65
```

#### **Etapa 3: Disjuntor Geral**

```
Tipo: Caixa Moldada
Polaridade: Tripolar (automático)
Modelo: Disjuntor Caixa Moldada 250A Tripolar - 25KA
```

#### **Etapa 4: Disjuntores por Medidor**

```
Polaridade: Tripolar
Configuração Mista:
  - 15x Disjuntor 63A (lojas pequenas)
  - 5x Disjuntor 100A (lojas âncora)

Cabos Automáticos:
  - 10mm² HEPR para 63A
  - 25mm² HEPR para 100A (flexível ou rígido)
```

#### **Etapa 5: DPS**

```
Classe: DPS CLASSE 1
Quantidade: 3 unidades
TCM: 9 cm
Terra: 30 cm de cabo 16mm² verde
Barramento: 2 pentes monofásicos
```

#### **Etapa 6: Acabamentos**

```
Parafusos:
  - 80x Parafuso M5 x 50mm
  - 80x Arruela lisa M5
  - 80x Arruela de pressão M5

Terminais Tubulares: 20 unidades
Curva Box: 1 unidade
```

#### **Etapa 7: Terminais de Compressão**

```
Polaridade: Tripolar
Cálculo: 20 disjuntores × 4 terminais = 80 terminais
Tipos Mistos:
  - 60x Terminal Olhal 10mm² (para 63A)
  - 20x Terminal Olhal 25mm² (para 100A)
```

### 💰 Resumo Financeiro:

```
Quadro Alumínio: R$ 4.500,00
Disjuntor Geral Caixa Moldada: R$ 2.800,00
Disjuntores 63A: R$ 1.125,00
Disjuntores 100A: R$ 750,00
DPS Classe 1: R$ 890,00
Cabos e Acabamentos: R$ 1.200,00
Terminais: R$ 480,00
─────────────────────────────
TOTAL: R$ 11.745,00
```

---

## Exemplo 3: Quadro de Medição Misto (Industrial)

### Cenário:

Condomínio industrial com 6 galpões, cargas variadas monofásicas e trifásicas.

### Configuração Passo a Passo:

#### **Etapa 1: Informações Básicas**

```
Nome: Kit Medição Condomínio Industrial
Tipo: Quadro de Medição
Descrição: Sistema misto com cargas monofásicas e trifásicas
```

#### **Etapa 2: Estrutura**

```
Material: Policarbonato
Quantidade de Medidores: 6
Caixas Selecionadas:
  - 4x Caixa para 1 medidor
  - 1x Caixa para 2 medidores
```

#### **Etapa 3: Disjuntor Geral**

```
Tipo: Disjuntor DIN
Polaridade: Tripolar
Modelo: Disjuntor DIN 125A Tripolar - 10KA
```

#### **Etapa 4: Disjuntores por Medidor**

```
Configuração Mista por Galpão:

Galpões 1-3 (monofásico):
  Polaridade: Monopolar
  Amperagem: 63A
  Quantidade: 1 por medidor
  Cabo: 10mm² HEPR

Galpões 4-6 (trifásico):
  Polaridade: Tripolar
  Configuração variada:
    - 1x 70A → Cabo 16mm²
    - 1x 90A → Cabo 25mm²
    - 1x 125A → Cabo 35mm² (flexível)
```

#### **Etapa 5: DPS**

```
Classe: DPS CLASSE 1
Quantidade: 3 unidades
TCM: 12 cm (ajustado para industrial)
Terra: 50 cm de cabo 16mm² verde (ajustado)
Barramento: 3 pentes monofásicos
```

#### **Etapa 6: Acabamentos**

```
Parafusos:
  - 40x Parafuso M6 x 60mm (reforçado)
  - 40x Arruela lisa M6
  - 40x Arruela de pressão M6

Terminais Tubulares: 18 unidades
Curva Box: 6 unidades
```

#### **Etapa 7: Terminais de Compressão**

```
Cálculo Detalhado:
  Monopolares (3 galpões): 3 × 2 = 6 terminais
  Tripolar 70A: 1 × 4 = 4 terminais
  Tripolar 90A: 1 × 4 = 4 terminais
  Tripolar 125A: 1 × 4 = 4 terminais
  ─────────────────────────────
  TOTAL: 18 terminais

Tipos Variados:
  - 6x Terminal Olhal 10mm²
  - 4x Terminal Olhal 16mm²
  - 4x Terminal Olhal 25mm²
  - 4x Terminal Olhal 35mm²
```

### 💰 Resumo Financeiro:

```
Caixas Policarbonato: R$ 900,00
Disjuntor Geral 125A: R$ 650,00
Disjuntores Variados: R$ 1.350,00
DPS Classe 1: R$ 890,00
Cabos Variados: R$ 980,00
Acabamentos: R$ 420,00
Terminais Variados: R$ 290,00
─────────────────────────────
TOTAL: R$ 5.480,00
```

---

## Exemplo 4: Quadro Elétrico Personalizado

### Cenário:

Painel de automação industrial customizado.

### Configuração:

#### **Etapa 1: Informações Básicas**

```
Nome: Painel Automação Linha Produção A
Tipo: Quadro Elétrico
Descrição: Painel customizado para controle de esteira
```

#### **Etapa 2: Estrutura (Personalizada)**

```
- Quadro metálico 800x600x300mm
- Porta frontal com visor
- Placa de montagem
- Ventilação forçada
```

#### **Etapa 3: Componentes (Personalizados)**

```
Adição Manual de:
- 1x CLP Siemens S7-1200
- 3x Contatores 25A
- 2x Relés temporizador
- 1x IHM 7" touch
- Borneiras e terminais
- Fonte 24VDC 10A
- Cabos e identificação
```

### 💰 Resumo Financeiro:

```
Estrutura: R$ 1.200,00
CLP: R$ 3.500,00
Componentes elétricos: R$ 2.100,00
IHM: R$ 1.800,00
Cabeamento e acabamento: R$ 450,00
─────────────────────────────
TOTAL: R$ 9.050,00
```

---

## 📊 Comparativo de Casos

| Aspecto      | Residencial | Comercial | Industrial | Automação     |
| ------------ | ----------- | --------- | ---------- | ------------- |
| Complexidade | ⭐⭐        | ⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐    |
| Tempo Config | 15 min      | 25 min    | 35 min     | 45 min        |
| Tipo Kit     | Medição     | Medição   | Medição    | Personalizado |
| Automação    | 80%         | 75%       | 60%        | 10%           |
| Custo Médio  | R$ 3K       | R$ 12K    | R$ 5-10K   | R$ 5-20K      |

---

## 💡 Dicas por Tipo de Projeto

### 🏢 Residencial

- ✅ Use policarbonato para economia
- ✅ DPS Classe 2 é suficiente
- ✅ Disjuntores DIN padrão
- ⚠️ Atenção ao espaço disponível

### 🏪 Comercial

- ✅ Prefira alumínio para durabilidade
- ✅ DPS Classe 1 para proteção superior
- ✅ Dimensione sobra para expansão
- ⚠️ Preveja manutenção facilitada

### 🏭 Industrial

- ✅ Avalie cargas mistas
- ✅ Reforce fixações
- ✅ Use cabos de qualidade superior
- ⚠️ Considere ambiente agressivo

### ⚙️ Automação

- ✅ Planeje layout interno
- ✅ Preveja espaço para expansão
- ✅ Use identificação profissional
- ⚠️ Documente tudo!

---

## 🎓 Casos de Aprendizado

### Caso 1: Erro de Dimensionamento

**Problema:** Cliente pediu 40A mas a carga real era 50A

**Solução com o Sistema:**

- Sistema alertou sobre subdimensionamento
- Sugeriu disjuntor 63A
- Recalculou cabos automaticamente

**Lição:** Sempre validar com cálculos de demanda!

### Caso 2: Economia Inteligente

**Problema:** Orçamento apertado em projeto residencial

**Solução:**

- Trocou alumínio por policarbonato: -R$ 800
- Usou DPS Classe 2: -R$ 440
- Manteve qualidade e segurança

**Lição:** Sistema permite otimização mantendo padrões!

### Caso 3: Expansão Futura

**Problema:** Shopping que crescerá em 2 anos

**Solução:**

- Configurou para 30 medidores
- Inicialmente usou apenas 20
- Preparado para crescimento

**Lição:** Planejamento evita retrabalho!

---

## 🔍 Checklist de Validação

Antes de finalizar qualquer kit, verifique:

### Técnico

- [ ] Disjuntor geral comporta soma das cargas
- [ ] Cabos dimensionados conforme NBR 5410
- [ ] DPS adequado ao nível de proteção
- [ ] Terminais compatíveis com cabos
- [ ] Espaço físico suficiente

### Financeiro

- [ ] Preço dentro do orçamento
- [ ] Comparado com concorrência
- [ ] Margem de lucro adequada
- [ ] Todos os itens em estoque

### Projeto

- [ ] Documentação completa
- [ ] Aprovações necessárias
- [ ] Prazo de entrega viável
- [ ] Cliente informado

---

## 📞 Suporte para Casos Especiais

Encontrou uma situação não coberta pelos exemplos?

**Entre em contato:**

- 📧 <projetos@s3e.com.br>
- 📱 WhatsApp Técnico: (XX) XXXX-XXXX
- 🌐 Portal de Projetos

**Nossa equipe pode ajudar com:**

- Cálculos de demanda
- Seleção de componentes especiais
- Normas e certificações
- Projetos customizados

---

**S3E Engenharia - Exemplos Práticos**  
_Atualizado: Outubro 2025_  
_Todos os valores são aproximados e sujeitos a alteração_
