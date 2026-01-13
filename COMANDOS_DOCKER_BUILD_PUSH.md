# 🐳 Comandos Docker - Build, Push e Deploy

## 📋 Informações das Imagens

- **Backend**: `odev10antonio/s3e-backend`
- **Frontend**: `odev10antonio/s3e-frontend`
- **Versão Atual**: `1.1.2`
- **Nova Versão Sugerida**: `1.1.3` (ou `1.2.0` se houver breaking changes)

---

## 🔨 PASSO 1: Build das Imagens

### Backend

```bash
# Navegar para o diretório do backend
cd backend

# Build da imagem backend (produção)
docker build -t odev10antonio/s3e-backend:1.1.3 -t odev10antonio/s3e-backend:latest --target production -f Dockerfile .

# Verificar se a imagem foi criada
docker images | grep s3e-backend
```

### Frontend

```bash
# Navegar para o diretório do frontend
cd frontend

# Build da imagem frontend (produção)
docker build -t odev10antonio/s3e-frontend:1.1.3 -t odev10antonio/s3e-frontend:latest --target production -f Dockerfile .

# Verificar se a imagem foi criada
docker images | grep s3e-frontend
```

### Build Completo (Backend + Frontend)

```bash
# Do diretório raiz do projeto

# Build Backend
docker build -t odev10antonio/s3e-backend:1.1.3 -t odev10antonio/s3e-backend:latest --target production -f backend/Dockerfile backend/

# Build Frontend
docker build -t odev10antonio/s3e-frontend:1.1.3 -t odev10antonio/s3e-frontend:latest --target production -f frontend/Dockerfile frontend/
```

---

## 🚀 PASSO 2: Login no Docker Hub

```bash
# Fazer login no Docker Hub
docker login

# Você será solicitado a inserir:
# - Username: odev10antonio
# - Password: [sua senha do Docker Hub]
```

---

## 📤 PASSO 3: Push das Imagens para Docker Hub

### Push Backend

```bash
# Push da versão específica
docker push odev10antonio/s3e-backend:1.1.3

# Push da tag latest
docker push odev10antonio/s3e-backend:latest
```

### Push Frontend

```bash
# Push da versão específica
docker push odev10antonio/s3e-frontend:1.1.3

# Push da tag latest
docker push odev10antonio/s3e-frontend:latest
```

### Push Completo (Backend + Frontend)

```bash
# Push Backend
docker push odev10antonio/s3e-backend:1.1.3
docker push odev10antonio/s3e-backend:latest

# Push Frontend
docker push odev10antonio/s3e-frontend:1.1.3
docker push odev10antonio/s3e-frontend:latest
```

---

## 🔄 PASSO 4: Atualizar docker-compose.prod.yml

Antes de fazer deploy, atualize a versão das imagens no `docker-compose.prod.yml`:

```yaml
# Backend
backend:
  image: odev10antonio/s3e-backend:1.1.3  # Atualizar de 1.1.2 para 1.1.3

# Frontend
frontend:
  image: odev10antonio/s3e-frontend:1.1.3  # Atualizar de 1.1.2 para 1.1.3
```

---

## 🖥️ PASSO 5: Deploy no Servidor de Produção

### Opção A: Via SSH (Recomendado)

```bash
# 1. Conectar ao servidor via SSH
ssh usuario@seu-servidor.com

# 2. Navegar para o diretório do projeto
cd /caminho/para/s3e-system-pro

# 3. Fazer pull das novas imagens
docker-compose -f docker-compose.prod.yml pull

# 4. Parar os containers atuais
docker-compose -f docker-compose.prod.yml down

# 5. Subir os containers com as novas imagens
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar o status dos containers
docker-compose -f docker-compose.prod.yml ps

# 7. Verificar os logs (opcional)
docker-compose -f docker-compose.prod.yml logs -f
```

### Opção B: Comando Único (Rolling Update)

```bash
# No servidor, execute:
docker-compose -f docker-compose.prod.yml pull && \
docker-compose -f docker-compose.prod.yml up -d && \
docker-compose -f docker-compose.prod.yml ps
```

### Opção C: Atualização com Zero Downtime (Recomendado para Produção)

```bash
# 1. Fazer pull das novas imagens (sem parar os containers)
docker-compose -f docker-compose.prod.yml pull

# 2. Recriar apenas os containers que mudaram (rolling update)
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# 3. Verificar status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔍 PASSO 6: Verificação Pós-Deploy

### Verificar Containers em Execução

```bash
# No servidor
docker-compose -f docker-compose.prod.yml ps

# Deve mostrar todos os containers com status "Up"
```

### Verificar Logs

```bash
# Logs do backend
docker-compose -f docker-compose.prod.yml logs backend

# Logs do frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs -f
```

### Verificar Health Checks

```bash
# Backend health check
curl http://localhost:3001/api/health

# Frontend health check
curl http://localhost:8080/
```

### Verificar Versões das Imagens

```bash
# Verificar qual versão está rodando
docker-compose -f docker-compose.prod.yml images

# Ou
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

---

## 🧹 Limpeza (Opcional)

### Remover Imagens Antigas do Docker Hub (Local)

```bash
# Remover imagens antigas localmente (após confirmar que está tudo funcionando)
docker rmi odev10antonio/s3e-backend:1.1.2
docker rmi odev10antonio/s3e-frontend:1.1.2

# Limpar imagens não utilizadas
docker image prune -a
```

### Remover Containers Parados

```bash
docker container prune
```

---

## 📝 Checklist Completo

- [ ] Build da imagem backend com sucesso
- [ ] Build da imagem frontend com sucesso
- [ ] Login no Docker Hub realizado
- [ ] Push da imagem backend para Docker Hub
- [ ] Push da imagem frontend para Docker Hub
- [ ] Atualizado `docker-compose.prod.yml` com nova versão
- [ ] Commit e push das alterações no `docker-compose.prod.yml` (opcional)
- [ ] Conectado ao servidor de produção via SSH
- [ ] Pull das novas imagens no servidor
- [ ] Deploy realizado com sucesso
- [ ] Containers rodando corretamente
- [ ] Health checks passando
- [ ] Testes funcionais realizados

---

## 🚨 Troubleshooting

### Erro: "unauthorized: authentication required"

```bash
# Fazer login novamente
docker login
```

### Erro: "pull access denied"

```bash
# Verificar se está logado
docker login

# Verificar se a imagem existe no Docker Hub
docker pull odev10antonio/s3e-backend:1.1.3
```

### Container não inicia

```bash
# Verificar logs detalhados
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml config
```

### Rollback para Versão Anterior

```bash
# No servidor, editar docker-compose.prod.yml para versão anterior
# Exemplo: voltar de 1.1.3 para 1.1.2

# Depois executar:
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💡 Dicas

1. **Sempre teste localmente antes de fazer push**
   ```bash
   docker-compose up -d
   ```

2. **Use tags específicas além de `latest`** para facilitar rollback

3. **Mantenha um backup do `docker-compose.prod.yml`** antes de atualizar

4. **Monitore os logs após o deploy** por pelo menos 5-10 minutos

5. **Faça deploy em horário de baixo tráfego** quando possível

---

## 📞 Comandos Rápidos (Copy & Paste)

### Build e Push Completo

```bash
# Build Backend
docker build -t odev10antonio/s3e-backend:1.1.3 -t odev10antonio/s3e-backend:latest --target production -f backend/Dockerfile backend/

# Build Frontend
docker build -t odev10antonio/s3e-frontend:1.1.3 -t odev10antonio/s3e-frontend:latest --target production -f frontend/Dockerfile frontend/

# Login
docker login

# Push Backend
docker push odev10antonio/s3e-backend:1.1.3 && docker push odev10antonio/s3e-backend:latest

# Push Frontend
docker push odev10antonio/s3e-frontend:1.1.3 && docker push odev10antonio/s3e-frontend:latest
```

### Deploy no Servidor

```bash
docker-compose -f docker-compose.prod.yml pull && \
docker-compose -f docker-compose.prod.yml up -d && \
docker-compose -f docker-compose.prod.yml ps
```
