# 🐳 Guia Docker - S3E System PRO

Este guia explica como usar Docker e Docker Compose para desenvolver e fazer
deploy do S3E System PRO.

## 📋 Pré-requisitos

- [Docker](https://www.docker.com/get-started) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) instalado
- Make (opcional, mas recomendado)

### Verificar instalação

```bash
docker --version
docker-compose --version
make --version  # opcional
```

## 🚀 Início Rápido

### 1. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar conforme necessário
nano .env  # ou use seu editor preferido
```

### 2. Iniciar em desenvolvimento

#### Com Make (recomendado)

```bash
make dev
```

#### Sem Make

```bash
docker-compose up
```

### 3. Acessar a aplicação

- **Frontend**: <http://localhost:5173>
- **Backend API**: <http://localhost:3000>
- **PgAdmin**: <http://localhost:5050> (dev only)
- **API Health**: <http://localhost:3000/health>

## 📦 Serviços Disponíveis

### Desenvolvimento

| Serviço  | Porta | Descrição           |
| -------- | ----- | ------------------- |
| frontend | 5173  | React App com Vite  |
| backend  | 3000  | Node.js API         |
| postgres | 5432  | PostgreSQL Database |
| redis    | 6379  | Redis Cache         |
| pgadmin  | 5050  | PostgreSQL Admin UI |

### Produção

| Serviço  | Porta  | Descrição                      |
| -------- | ------ | ------------------------------ |
| nginx    | 80/443 | Reverse Proxy                  |
| frontend | -      | React build servido pelo nginx |
| backend  | -      | API em produção                |
| postgres | -      | Database                       |
| redis    | -      | Cache                          |

## 🛠️ Comandos Principais

### Com Make

```bash
make help              # Ver todos os comandos disponíveis
make dev               # Iniciar em desenvolvimento
make dev-build         # Build e iniciar
make up                # Iniciar em background
make down              # Parar todos os serviços
make logs              # Ver logs
make logs-backend      # Logs do backend
make logs-frontend     # Logs do frontend
make clean             # Limpar tudo
make install           # Instalar dependências
make prod              # Produção
make backup            # Backup do DB
make test              # Executar testes
```

### Docker Compose Direto

```bash
# Desenvolvimento
docker-compose up                          # Iniciar
docker-compose up -d                       # Iniciar em background
docker-compose up --build                  # Build e iniciar
docker-compose down                        # Parar
docker-compose logs -f                     # Ver logs
docker-compose logs -f backend             # Logs do backend
docker-compose ps                          # Status dos containers

# Produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## 🔧 Desenvolvimento

### Hot Reload

Os volumes estão configurados para hot reload automático:

- **Frontend**: Vite HMR ativo
- **Backend**: tsx watch para recarregar em mudanças

### Instalar novas dependências

```bash
# Backend
docker-compose exec backend npm install <pacote>

# Frontend
docker-compose exec frontend npm install <pacote>

# Ou rebuildar
docker-compose up --build
```

### Acessar shell dos containers

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# PostgreSQL
docker-compose exec postgres psql -U s3e_user -d s3e_db

# Redis
docker-compose exec redis redis-cli
```

### Executar migrations

```bash
# Quando implementar Prisma/TypeORM
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

## 🏭 Produção

### Build de produção

```bash
# Com Make
make build
make prod

# Sem Make
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Variáveis de ambiente para produção

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/db
JWT_SECRET=<secure-random-string>
CORS_ORIGIN=https://seu-dominio.com
```

### Deploy

#### Docker Swarm

```bash
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml s3e
```

#### Kubernetes

```bash
# Converter para Kubernetes
kompose convert -f docker-compose.yml
kubectl apply -f .
```

## 💾 Banco de Dados

### Backup

```bash
# Com Make
make backup

# Sem Make
docker-compose exec -T postgres pg_dump -U s3e_user s3e_db > backup.sql
```

### Restore

```bash
# Com Make
make restore BACKUP_FILE=./backups/backup_20241007.sql

# Sem Make
docker-compose exec -T postgres psql -U s3e_user -d s3e_db < backup.sql
```

### Acessar PgAdmin (Desenvolvimento)

1. Acesse <http://localhost:5050>
2. Login: `admin@s3e.com` / `admin`
3. Adicionar servidor:
   - Host: `postgres`
   - Port: `5432`
   - Database: `s3e_db`
   - Username: `s3e_user`
   - Password: `s3e_password`

## 🔍 Monitoramento e Logs

### Ver logs em tempo real

```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Estatísticas dos containers

```bash
docker stats
# ou
make stats
```

### Health Checks

```bash
# API Health
curl http://localhost:3000/health

# PostgreSQL
docker-compose exec postgres pg_isready -U s3e_user

# Redis
docker-compose exec redis redis-cli ping
```

## 🧹 Limpeza

### Parar e remover containers

```bash
make down
# ou
docker-compose down
```

### Remover volumes (CUIDADO: apaga dados)

```bash
make clean
# ou
docker-compose down -v
```

### Limpar cache do Docker

```bash
make clean-cache
# ou
docker system prune -af --volumes
```

## 🐛 Troubleshooting

### Porta já em uso

```bash
# Verificar o que está usando a porta
netstat -ano | findstr :5173  # Windows
lsof -i :5173                  # Linux/Mac

# Mudar a porta no .env
FRONTEND_PORT=5174
```

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs backend

# Reconstruir container
docker-compose up --build backend

# Verificar health
docker-compose ps
```

### Problemas com volumes

```bash
# Remover volumes e recriar
docker-compose down -v
docker-compose up
```

### Dependências desatualizadas

```bash
# Reinstalar dependências
docker-compose down
docker-compose up --build
```

### Banco de dados não conecta

```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# Ver logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker-compose exec postgres psql -U s3e_user -d s3e_db -c "SELECT 1"
```

## 📊 Estrutura dos Arquivos

```text
.
├── docker-compose.yml           # Configuração principal
├── docker-compose.prod.yml      # Overrides de produção
├── .env.example                 # Variáveis de ambiente
├── Makefile                     # Comandos úteis
│
├── backend/
│   ├── Dockerfile              # Multi-stage Dockerfile
│   ├── .dockerignore           # Arquivos ignorados
│   └── ...
│
├── frontend/
│   ├── Dockerfile              # Multi-stage Dockerfile
│   ├── .dockerignore           # Arquivos ignorados
│   ├── nginx/
│   │   └── nginx.conf          # Config Nginx para SPA
│   └── ...
│
└── nginx/
    ├── nginx.conf              # Config principal Nginx
    └── conf.d/
        └── default.conf        # Config do reverse proxy
```

## 🔐 Segurança

### Production

1. **Nunca commitar `.env`** com credenciais reais
2. **Usar secrets do Docker** para dados sensíveis
3. **Configurar HTTPS** com Let's Encrypt
4. **Limitar acesso ao banco** apenas para containers necessários
5. **Usar usuários não-root** nos containers
6. **Manter imagens atualizadas**

### Sensible variables

```bash
# Usar Docker secrets em produção
echo "meu-jwt-secret" | docker secret create jwt_secret -
```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
