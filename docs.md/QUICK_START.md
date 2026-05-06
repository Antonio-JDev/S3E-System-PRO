# 🚀 Quick Start - S3E System PRO

Guia rápido para começar a desenvolver no S3E System PRO.

## Opção 1: Docker (Recomendado) 🐳

### Pré-requisitos

- Docker Desktop instalado
- Make (opcional, mas útil)

### Passos

1. **Clone o repositório**

```bash
git clone <repo-url>
cd S3E-System-PRO
```

1. **Configure o ambiente**

```bash
cp .env.example .env
```

1. **Inicie os serviços**

```bash
# Com Make
make dev

# Sem Make
docker-compose up
```

1. **Acesse a aplicação**

- 🌐 Frontend: <http://localhost:5173>
- 🔌 Backend: <http://localhost:3000>
- 🗄️ PgAdmin: <http://localhost:5050>

### Comandos úteis

```bash
make help              # Ver todos os comandos
make logs              # Ver logs
make down              # Parar serviços
make clean             # Limpar tudo
make backup            # Backup do DB
```

## Opção 2: Instalação Local 💻

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis (opcional)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: <http://localhost:5173>

### Backend

```bash
cd backend
npm install
npm run dev
```

Acesse: <http://localhost:3000>

### Banco de Dados

```sql
CREATE DATABASE s3e_db;
CREATE USER s3e_user WITH PASSWORD 's3e_password';
GRANT ALL PRIVILEGES ON DATABASE s3e_db TO s3e_user;
```

## 📁 Estrutura do Projeto

```text
S3E-System-PRO/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   ├── data/
│   │   └── ...
│   └── Dockerfile
│
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── ...
│   └── Dockerfile
│
├── nginx/            # Reverse Proxy (Produção)
├── docker-compose.yml
├── .env.example
└── Makefile
```

## 🛠️ Desenvolvimento

### Hot Reload

- Frontend: Vite HMR ativo automaticamente
- Backend: tsx watch recarrega em mudanças

### Adicionar dependências

**Com Docker:**

```bash
docker-compose exec frontend npm install <pacote>
docker-compose exec backend npm install <pacote>
```

**Sem Docker:**

```bash
cd frontend && npm install <pacote>
cd backend && npm install <pacote>
```

### Database

**Com Docker:**

```bash
# Acessar PostgreSQL
docker-compose exec postgres psql -U s3e_user -d s3e_db

# Backup
make backup

# Restore
make restore BACKUP_FILE=./backups/backup.sql
```

**Sem Docker:**

```bash
psql -U s3e_user -d s3e_db
```

## 🏗️ Build para Produção

### Com Docker

```bash
# Build
make build

# Iniciar produção
make prod
```

### Sem Docker

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
npm start
```

## 🧪 Testes

```bash
# Com Docker
make test

# Sem Docker
cd frontend && npm test
cd backend && npm test
```

## 📚 Documentação Completa

- [README Principal](README.md)
- [Guia Docker](DOCKER_GUIDE.md)
- [Guia de Migração](MIGRATION_GUIDE.md)
- [Arquitetura](ARCHITECTURE.md)
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)

## ❓ Precisa de Ajuda?

### Useful commands

```bash
# Docker
make help                    # Ver comandos disponíveis
docker-compose ps            # Status dos containers
docker-compose logs -f       # Ver logs

# Limpar e recomeçar
make clean
make dev-build
```

### Problemas comuns

**Porta em uso:**

```bash
# Mudar porta no .env
FRONTEND_PORT=5174
BACKEND_PORT=3001
```

**Container não inicia:**

```bash
docker-compose logs <serviço>
docker-compose up --build
```

**Banco não conecta:**

```bash
docker-compose exec postgres pg_isready
docker-compose restart postgres
```

## 🎯 Próximos Passos

1. ✅ Completar migração dos componentes (ver
   [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md))
2. 🔧 Configurar autenticação
3. 📊 Implementar endpoints da API
4. 🔗 Conectar frontend com backend
5. 🚀 Deploy

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
