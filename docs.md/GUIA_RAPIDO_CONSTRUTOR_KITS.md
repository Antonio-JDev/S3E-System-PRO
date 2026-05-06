# 🔧 Guia Rápido - Construtor de Kits

## Como Criar um Quadro de Medição (Modo Assistido)

### 📋 Passo 1: Informações Básicas

1. Clique em **"Criar Kit"**
2. Preencha o **nome do kit**
3. Selecione **"Quadro de Medição"**
4. Adicione uma descrição (opcional)
5. Clique em **"Avançar"**

💡 **Dica:** Você verá um aviso azul indicando que está no modo assistido com
campos pré-preenchidos.

---

### 🏗️ Passo 2: Estrutura do Quadro

1. Escolha o **material**:
   - **Alumínio:** Selecione o modelo adequado à quantidade de medidores
   - **Policarbonato:** Clique em "Selecionar Caixas" e escolha as combinações
     necessárias

2. Defina a **quantidade de medidores**

3. Clique em **"Avançar"**

---

### ⚡ Passo 3: Disjuntor Geral

#### Escolha o Tipo:

- **Caixa Moldada:** Para instalações maiores (automaticamente tripolar)
- **Disjuntor DIN:** Para instalações menores (escolha a polaridade)

#### Se escolheu DIN, selecione:

- Monopolar, Bipolar ou Tripolar

#### Depois:

1. Selecione o disjuntor da lista
2. Verifique disponibilidade em estoque
3. Clique em **"Avançar"**

---

### 🔌 Passo 4: Disjuntores por Medidor

#### Escolha a Polaridade:

- **Monopolar:** Circuitos simples (127V/220V)
- **Bipolar:** Circuitos 220V bifásicos
- **Tripolar:** Circuitos trifásicos

#### Selecione a Amperagem:

A lista mostrará apenas as amperagens compatíveis!

| Polaridade | Amperagens Disponíveis | Cabo Automático |
| ---------- | ---------------------- | --------------- |
| Monopolar  | 40A, 50A, 63A          | 10mm² HEPR      |
| Bipolar    | 50A, 63A               | 10mm² HEPR      |
| Tripolar   | 40A, 50A, 63A          | 10mm² HEPR      |
| Tripolar   | 70A                    | 16mm² HEPR      |
| Tripolar   | 90A                    | 25mm² HEPR      |
| Tripolar   | 100A, 125A             | 25mm² / 35mm²   |

#### Adicione os Disjuntores:

1. Escolha o modelo
2. Defina quantidade por medidor
3. Clique em **"Adicionar"**
4. Repita para outros modelos (se necessário)

💡 **Dica:** O sistema calculará automaticamente os cabos necessários!

---

### 🛡️ Passo 5: DPS (Proteção contra Surtos)

#### Escolha a Classe:

**DPS CLASSE 1** (60KA):

- Para entrada de energia principal
- Maior capacidade de proteção
- Campos pré-preenchidos:
  - 3 unidades de DPS
  - 9cm de TCM
  - 30cm de cabo 16mm² verde (terra)

**DPS CLASSE 2** (20KA):

- Para quadros secundários
- Proteção complementar
- Campos pré-preenchidos:
  - 3 unidades de DPS
  - 9cm de TCM
  - 30cm de cabo 6mm² verde (terra)
  - 3 disjuntores DIN 25A monopolares

#### Ajuste se Necessário:

Todos os campos podem ser editados para situações especiais!

---

### 🔩 Passo 6: Acabamentos

#### Parafusos e Arruelas:

1. Use a **barra de busca** para encontrar o item
2. Digite a quantidade desejada
3. Verifique o estoque disponível

💡 **Dica:** Busque por "parafuso", "arruela lisa", "arruela pressão"

#### Terminais Tubulares:

- Quantidade padrão: **12 unidades** (para DPS)
- Edite o tipo e cor conforme necessário

#### Curva Box:

- Quantidade padrão: **1 por caixa**
- Ajuste se necessário

---

### 🔌 Passo 7: Terminais de Compressão

#### Cálculo Automático!

O sistema calcula automaticamente:

```
Quantidade = Disjuntores × Unidades por tipo × Medidores
```

**Unidades por tipo:**

- Monopolar: 2 terminais
- Bipolar: 3 terminais
- Tripolar: 4 terminais

#### Exemplo Prático:

```
Configuração:
- 2 disjuntores tripolares por medidor
- 5 medidores total

Cálculo:
2 × 4 × 5 = 40 terminais
```

#### Selecione o Tipo:

Escolha o tamanho do terminal olhal na lista

---

### ✅ Finalizar

1. Revise o **preço total** no rodapé
2. Clique em **"Salvar Kit"**
3. Pronto! Seu kit foi criado 🎉

---

## 🎨 Como Criar Outros Tipos (Modo Personalizado)

### Quadro de Comando / Elétrico / Subestações

Estes tipos oferecem total liberdade:

1. **Passo 1:** Informações básicas
2. **Passo 2:** Configure a estrutura
3. **Passo 3:** Adicione componentes manualmente

💡 **Ideal para:** Projetos especiais, configurações únicas, ou quando você
precisa de total controle.

---

## ❓ Perguntas Frequentes

### **Por que alguns campos estão pré-preenchidos?**

Para agilizar o processo e garantir que você siga as melhores práticas da S3E
Engenharia.

### **Posso editar os campos pré-preenchidos?**

Sim! Todos os campos são editáveis para casos especiais.

### **E se um item estiver sem estoque?**

Aparecerá "SEM ESTOQUE" em vermelho e .

### **Como sei se escolhi os componentes certos?**

O sistema filtra automaticamente apenas os componentes compatíveis la do
estoque!

### **Posso editar um kit depois de criado?**

Sim! Clique no menu (⋮) do kit e selecione "Editar".

### **O preço é calculado automaticamente?**

Sim! O preço total é atualizado em tempo real conforme você adiciona
componentes.

---

## 💡 Dicas de Uso

### ✨ Boas Práticas:

1. **Sempre comece pelo tipo de kit correto**
   - Medição → Modo assistido
   - Outros → Modo personalizado

2. **Revise a configuração antes de finalizar**
   - Verifique todas as etapas
   - Confirme quantidades
   - Valide o preço total

3. **Aproveite os cálculos automáticos**
   - Deixe o sistema sugerir cabos
   - Use as quantidades padrão de DPS
   - Confie nos terminais calculados

4. **Personalize quando necessário**
   - Todos os campos são editáveis
   - Ajuste para casos especiais
   - Documente mudanças na descrição

### ⚠️ Evite:

- ❌ Pular etapas importantes
- ❌ Ignorar avisos de estoque
- ❌ Esquecer de revisar o preço
- ❌ Não salvar o progresso

---

## 🔍 Atalhos e Produtividade

### Navegação Rápida:

- Clique nas etapas completadas para voltar
- Use Tab para navegar entre campos
- Enter para adicionar itens em listas

### Busca Eficiente:

- Use palavras-chave específicas
- Busque por códigos (SKU)
- Filtre por estoque disponível

---

## 📞 Precisa de Ajuda?

Entre em contato com:

- 📧 <suporte@s3e.com.br>
- 📱 WhatsApp: (XX) XXXX-XXXX
- 🌐 Portal de Suporte: support.s3e.com.br

---

**Sistema S3E Engenharia**  
_Versão 2.0 - Outubro 2025_  
Desenvolvido para otimizar seu trabalho! 🚀
