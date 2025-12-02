# S3E System PRO

Sistema profissional de gestão para empresas de engenharia elétrica.

> 📖 **Veja o que a aplicação faz** acessando [SOBRE_A_APLICACAO.md](./SOBRE_A_APLICACAO.md)

## 🏗️ Arquitetura do Projeto

O S3E System PRO é uma aplicação **full-stack** moderna com arquitetura de microsserviços containerizados:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                 │
│  Porta: 5173 (dev) | 80 (prod)                             │
│  - TypeScript, TailwindCSS, React Router                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│              Backend API (Node.js + Express)               │
│  Porta: 3001                                                │
│  - TypeScript, Prisma ORM, JWT Auth                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                ┌──────▼──────┐
                │ PostgreSQL  │
                │   Port:5432  │
                │  (Database) │
                └─────────────┘
```

### 📁 Estrutura de Diretórios

```text
S3E-System-PRO/
├── frontend/          # Aplicação React + TypeScript
│   ├── public/        # Arquivos estáticos
│   ├── src/           # Código fonte do frontend
│   │   ├── components/ # Componentes React
│   │   ├── pages/      # Páginas da aplicação
│   │   ├── contexts/   # Contextos React
│   │   ├── types/      # Definições TypeScript
│   │   ├── config/     # Configurações
│   │   └── utils/      # Funções utilitárias
│   ├── nginx/         # Configuração Nginx (produção)
│   └── Dockerfile      # Container do frontend
│
├── backend/           # API Node.js + Express
│   ├── src/           # Código fonte do backend
│   │   ├── controllers/ # Controladores
│   │   ├── routes/      # Rotas da API
│   │   ├── services/    # Lógica de negócio
│   │   ├── middlewares/ # Middlewares (auth, RBAC, etc)
│   │   ├── utils/       # Utilitários
│   │   └── validators/  # Validações
│   ├── prisma/        # Schema e migrations do banco
│   ├── uploads/       # Arquivos enviados
│   └── Dockerfile      # Container do backend
│
├── docker-compose.yml      # Configuração Docker (desenvolvimento)
├── docker-compose.prod.yml # Configuração Docker (produção)
├── .env.example           # Template de variáveis de ambiente
├── Makefile               # Comandos auxiliares
└── docs/                  # Documentação
```

## 🚀 Começando

### ⚙️ Configuração Inicial

**IMPORTANTE:** Antes de iniciar, configure as variáveis de ambiente:

```bash
# 1. Copiar o template de variáveis de ambiente
cp .env.example .env

# 2. (Opcional) Editar o arquivo .env com suas configurações
# Para desenvolvimento local, os valores padrão já funcionam
```

> ⚠️ **Segurança**: O arquivo `.env.production` contém credenciais de produção e **NUNCA** deve ser commitado no repositório. Ele está protegido pelo `.gitignore`.

### 🐳 Com Docker (Recomendado)

#### Desenvolvimento Local

```bash
# Iniciar todos os serviços em modo desenvolvimento
docker-compose up

# Ou com Make (mais fácil)
make dev

# Para build e iniciar
make dev-build
```

**Serviços disponíveis em desenvolvimento:**

- 🌐 **Frontend**: <http://localhost:5173>
- 🔌 **Backend API**: <http://localhost:3001>
- 🗄️ **PgAdmin**: <http://localhost:5050> (admin@s3e.com / admin)
- 🐘 **PostgreSQL**: localhost:5432

#### Produção

```bash
# Usar docker-compose de produção
docker-compose -f docker-compose.prod.yml up -d

# Ou com Make
make prod
```

> 📝 **Nota**: Para produção, certifique-se de ter o arquivo `.env.production` configurado com credenciais reais.

### 📋 Comandos Úteis (Make)

```bash
make help          # Ver todos os comandos disponíveis
make dev           # Iniciar em desenvolvimento
make up            # Iniciar serviços em background
make down          # Parar todos os serviços
make logs          # Ver logs de todos os serviços
make db-shell      # Abrir shell do PostgreSQL
make backup        # Fazer backup do banco de dados
```

### 💻 Desenvolvimento Local (Sem Docker)

Para desenvolvimento sem Docker, você precisará ter instalado:
- Node.js 20+
- PostgreSQL 16+

#### Frontend

```bash
cd frontend
npm install
# Configure VITE_API_URL no .env ou exporte a variável
export VITE_API_URL=http://localhost:3001
npm run dev
```

#### Backend

```bash
cd backend
npm install

# Configure as variáveis de ambiente no .env
# DATABASE_URL, JWT_SECRET, etc.

# Gerar Prisma Client
npx prisma generate

# Executar migrations
npx prisma migrate dev

# Popular banco com dados de exemplo (opcional)
npm run seed

# Iniciar servidor
npm run dev
```

> 💡 **Recomendação**: Use Docker para desenvolvimento, pois já inclui todos os serviços (PostgreSQL, PgAdmin) configurados e prontos para uso.

## 🛠️ Stack Tecnológico

### Frontend

- **React 18** - Biblioteca UI moderna
- **TypeScript** - Tipagem estática
- **Vite** - Build tool ultra-rápido
- **TailwindCSS** - Framework CSS utility-first
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **Sonner** - Notificações toast
- **Lucide React** - Ícones

### Backend

- **Node.js 20** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Tipagem estática
- **Prisma ORM** - ORM type-safe
- **PostgreSQL 16** - Banco de dados relacional
- **JWT** - Autenticação stateless
- **Puppeteer** - Geração de PDFs
- **Multer** - Upload de arquivos
- **Zod** - Validação de schemas

### DevOps & Infraestrutura

- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **Nginx** - Reverse proxy (produção)
- **PgAdmin** - Interface gráfica PostgreSQL (dev)

## 📝 Módulos Principais

O sistema possui **20+ módulos** integrados para gestão completa de empresas de engenharia elétrica:

### Core
- **Dashboard** - Visão geral com métricas em tempo real
- **Orçamentos** - Criação e gestão com geração de PDFs profissionais
- **Projetos** - Gestão completa do ciclo de vida
- **Obras** - Controle operacional com tarefas e equipes

### Estoque & Materiais
- **Catálogo** - Gestão de materiais elétricos
- **Kits e Quadros** - Composição de kits modulares
- **Movimentações** - Controle de estoque
- **Compras** - Pedidos e entrada de materiais
- **Cotações** - Banco de cotações (banco frio)

### Gestão
- **Clientes** - CRM básico
- **Fornecedores** - Cadastro e histórico
- **Serviços** - Catálogo de serviços
- **Equipes** - Alocação de recursos e Gantt
- **Funcionários** - Gestão de RH
- **Veículos** - Controle de frota

### Financeiro
- **Vendas** - Controle de vendas e parcelas
- **Contas a Receber/Pagar** - Gestão financeira
- **Despesas Fixas** - Controle de despesas recorrentes
- **Vales** - Vale transporte e alimentação

### Outros
- **Notas Fiscais (NFe)** - Emissão e controle
- **Relatórios** - Análises e exportações
- **Auditoria** - Logs e rastreabilidade
- **Configurações** - Personalização do sistema

> 📖 Para detalhes completos de cada módulo, veja [SOBRE_A_APLICACAO.md](./SOBRE_A_APLICACAO.md)

## 🔐 Segurança e Variáveis de Ambiente

### ⚠️ Importante sobre `.env.production`

O arquivo `.env.production` contém **credenciais críticas de produção** e está protegido pelo `.gitignore`. 

**NUNCA faça commit deste arquivo!**

Para trabalhar localmente:
1. Use `.env.example` como template
2. Copie para `.env` para desenvolvimento
3. Mantenha `.env.production` apenas localmente com suas credenciais reais

### 🔑 Variáveis Principais

Consulte `.env.example` para ver todas as variáveis disponíveis. Principais:

- `DATABASE_URL` - Conexão PostgreSQL
- `JWT_SECRET` - Chave secreta para tokens JWT
- `VITE_API_URL` - URL da API para o frontend
- `CORS_ORIGIN` - Origens permitidas para CORS

## 👥 Contribuindo

Este é um projeto privado. Para contribuir, entre em contato com a equipe.

## 📄 Licença

Propriedade da S3E Engenharia Elétrica.

---

**Desenvolvido por**: Antonio Junior dos Santos  
**Versão**: 1.0.0
