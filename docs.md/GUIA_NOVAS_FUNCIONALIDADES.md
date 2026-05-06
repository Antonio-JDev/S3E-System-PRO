# Guia de Novas Funcionalidades - S3E System

## 📦 Importação de XML (Compras)

### Como Usar:

1. Navegue até **Compras**
2. Clique em **"Registrar Nova Compra"**
3. No card azul "Importação Rápida", clique em **"Importar XML"**
4. Selecione o arquivo XML da NF-e
5. O sistema irá preencher automaticamente:
   - Nome do fornecedor
   - CNPJ
   - Telefone (se disponível)
   - Número da nota fiscal
   - Data de emissão
   - Lista completa de itens com:
     - Nome do produto
     - NCM
     - Quantidade
     - Valor unitário
   - Valor do frete
   - Outras despesas
6. Verifique os dados e complete informações adicionais
7. Clique em **"Salvar Compra"**

### Integração com Estoque:

- Ao salvar com status **"Recebido"**, os materiais são automaticamente:
  - Adicionados ao estoque
  - Registrados no histórico de movimentações

---

## 📄 Geração de PDF (Orçamentos)

### Funcionalidade:

Gere PDFs profissionais dos seus orçamentos para enviar aos clientes.

### Como Usar:

1. Acesse **Orçamentos**
2. Crie ou edite um orçamento
3. No campo de descrição, use o **Editor de Texto Rico** (Quill):
   - **Negrito**
   - _Itálico_
   - Listas numeradas e com marcadores
   - Títulos e parágrafos
4. Clique em **"Gerar PDF"**
5. O PDF será gerado com:
   - Logo e header da S3E Engenharia
   - Dados do cliente
   - Descrição formatada
   - Lista de itens e valores
   - Cálculos (Subtotal + BDI = Total)
   - Observações
6. O arquivo será baixado automaticamente

---

## 💰 Módulo Financeiro

### Acesso:

Clique em **"Financeiro"** no menu lateral

### Seções Disponíveis:

#### 1. Vendas 💰

- Lista de todos os projetos vendidos
- Valores e status de cada venda
- Filtros por período

#### 2. Contas a Receber 📥

- Parcelas pendentes de clientes
- Vencimentos
- Status de cada conta
- Total a receber

#### 3. Contas a Pagar 📤

- Pagamentos pendentes a fornecedores
- Vencimentos
- Status de cada conta
- Total a pagar

#### 4. Faturamento 📊

- Resumo mensal/anual
- Receitas vs Despesas
- Lucro líquido
- Margem de lucro

#### 5. Status de Cobranças ⚠️

- Dashboard visual
- Contas a vencer (7 dias)
- Contas vencidas
- Contas pagas

---

## 🧾 Emissão de NF-e

### Acesso:

Clique em **"Emissão NF-e"** no menu lateral

### Processo (Wizard em 3 Etapas):

#### Etapa 1: Selecionar Projeto

- Lista de orçamentos aprovados/projetos
- Selecione o projeto para faturamento

#### Etapa 2: Dados Fiscais

- **Tipo de NF-e:** Produto ou Serviço
- **Série:** Série da nota
- **CFOP:** Código Fiscal
- **Natureza da Operação:** Ex: "Venda de produção"

#### Etapa 3: Revisão

- Revise todos os dados
- Clique em **"Emitir NF-e"**
- ⚠️ _Nota: A integração com SEFAZ/Emissor externo será implementada
  posteriormente_

---

## 🛠️ Criar Kits Personalizados (Catálogo)

### Novo Modal de Criar Kit:

1. Acesse **Catálogo**
2. Clique em **"Criar Kit"** (botão azul)
3. Preencha:
   - **Nome do Kit\***
   - **Descrição**
4. Na seção **Composição do Kit:**
   - Digite o nome ou código do material/kit na busca
   - Selecione a quantidade
   - Clique no item para adicionar
   - Ajuste quantidades com botões +/-
   - Remova itens não desejados
5. Configure **Precificação:**
   - Veja o custo total automaticamente
   - Defina a margem de lucro (%)
   - Visualize o preço de venda calculado
6. Clique em **"Criar Kit"**

---

## 🏗️ Kit Subestações (Especializado)

### Acesso:

**Catálogo** → **"Kit Subestações"** (botão verde)

### Etapa 1: Informações Básicas

- Nome do kit
- Descrição
- Tipo: **Aérea** ou **Abrigada**

### Etapa 2: Configuração dos Materiais

Tópicos organizados em grid:

1. **Posto de Transformação**
   - Potência (KVA)
   - Tensão
   - Materiais

2. **Aterramento**
3. **Iluminação da Cabine**
4. **Cabine de Medição**
5. **Condutores de Saída**
6. **Campos Personalizados** (adicione quantos quiser)

Para cada tópico:

- Clique em "Adicionar Material"
- Busque no estoque
- Defina quantidade
- Visualize lista de materiais alocados

### Funcionalidades Especiais:

- ✅ **Salvar como Rascunho** - Continue depois
- ✅ Layout em grid (visualização lado a lado)
- ✅ Cálculo automático de preços
- ✅ Lista scrollável de materiais

---

## 🎨 Melhorias Visuais Gerais

### Cards dos Materiais

- Header colorido por categoria
- Grid 2x2 com informações principais:
  - Código SKU
  - Valor unitário
  - Estoque atual (com alerta se baixo)
  - Localização
- Valor total em estoque calculado
- Fornecedor exibido

### Modal de Visualização de Materiais

- Design moderno com gradientes
- Grid responsivo (2/3 + 1/3)
- Cards de destaque para preço e estoque
- Alerta visual de estoque baixo
- Informações do produto organizadas
- Cards laterais (localização, fornecedor, status)

### Catálogo

- Cards sem imagens (ícones apenas)
- Header com gradiente (azul para produtos, roxo para kits)
- Botão "Visualizar" em destaque
- Modal de visualização modernizado

### Compras

- Modal com gradiente laranja
- Seções bem definidas (Fornecedor, NF, Itens, Despesas)
- Campos de texto (não select) para flexibilidade
- Cálculo visual em tempo real
- Resumo financeiro no footer

---

## 🔐 Segurança (Backend)

### Autenticação JWT

- Login gera token válido por 7 dias
- Token deve ser enviado no header: `Authorization: Bearer <token>`

### Controle de Acesso (RBAC)

Roles disponíveis:

- **admin** - Acesso total
- **orcamentista** - Orçamentos e projetos
- **compras** - Compras e materiais
- **gerente** - Visualização de tudo

### Rotas Protegidas

Todas as rotas `/api/*` (exceto `/api/auth/login` e `/api/auth/register`)
requerem autenticação.

---

## 📖 Comandos Úteis

### Backend:

```bash
cd backend
npm run dev          # Iniciar servidor em modo desenvolvimento
npx prisma studio    # Abrir interface visual do banco de dados
npx prisma migrate dev --name <nome> # Criar nova migração
```

### Frontend:

```bash
cd frontend
npm run dev          # Iniciar aplicação React
npm run build        # Build para produção
```

### Ambos:

```bash
# Na raiz do projeto
docker-compose up    # Iniciar todo o sistema com Docker
```

---

## 🎓 Próximas Implementações Sugeridas

1. **API Service Layer (Frontend)**

   ```typescript
   // frontend/src/services/api.ts
   const API_URL = 'http://localhost:3000/api';

   export const api = {
     auth: {
       login: (email, password) => fetch(`${API_URL}/auth/login`, {...}),
       register: (data) => fetch(`${API_URL}/auth/register`, {...})
     },
     materiais: {
       getAll: () => fetch(`${API_URL}/materiais`, {...}),
       create: (data) => fetch(`${API_URL}/materiais`, {...})
     },
     // ... outros módulos
   };
   ```

2. **Context API para Estado Global**

   ```typescript
   // frontend/src/context/AuthContext.tsx
   const AuthContext = createContext();
   ```

3. **Persistência de Dados**
   - Migrar de mock data para chamadas API reais
   - Implementar loading states
   - Tratamento de erros

---

## 📞 Suporte

Para dúvidas ou problemas, consulte:

- Documentação do Prisma: <https://www.prisma.io/docs>
- Documentação do React Quill: <https://github.com/zenoamaro/react-quill>
- Documentação do jsPDF: <https://github.com/parallax/jsPDF>
