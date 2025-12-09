# 🚀 Comandos para Build e Deploy - Correção RBAC

## 📋 Resumo das Alterações

Esta atualização corrige o problema de permissões RBAC para engenheiros:
- ✅ Engenheiros podem criar serviços
- ✅ Engenheiros podem criar orçamentos
- ✅ Rotas migradas para usar `checkPermission()` do RBAC

---

## 🔧 Pré-requisitos

1. **Docker instalado e rodando**
2. **Login no Docker Hub** (se ainda não fez):
   ```bash
   docker login
   ```
   Usuário: `odev10antonio`

3. **Verificar se está no diretório do projeto**:
   ```bash
   cd C:\Users\S3E-PC02\Desktop\S3E-System-PRO
   ```

---

## 📦 Opção 1: Build e Push Manual (Recomendado)

### Passo 1: Definir Versão

A versão atual é `1.0.5`. Para esta correção, vamos usar `1.0.6`:

```bash
# Windows (PowerShell ou CMD)
set VERSION=1.0.6
set DOCKER_USER=odev10antonio

# Linux/Mac
export VERSION=1.0.6
export DOCKER_USER=odev10antonio
```

### Passo 2: Build Backend

```bash
docker build -t %DOCKER_USER%/s3e-backend:%VERSION% ^
  --target production ^
  -f backend/Dockerfile ^
  ./backend
```

**Linux/Mac:**
```bash
docker build -t ${DOCKER_USER}/s3e-backend:${VERSION} \
  --target production \
  -f backend/Dockerfile \
  ./backend
```

### Passo 3: Build Frontend

```bash
docker build -t %DOCKER_USER%/s3e-frontend:%VERSION% ^
  --target production ^
  --build-arg VITE_API_URL=http://192.168.100.228:3001 ^
  -f frontend/Dockerfile ^
  ./frontend
```

**Linux/Mac:**
```bash
docker build -t ${DOCKER_USER}/s3e-frontend:${VERSION} \
  --target production \
  --build-arg VITE_API_URL=http://192.168.100.228:3001 \
  -f frontend/Dockerfile \
  ./frontend
```

### Passo 4: Push Backend

```bash
docker push %DOCKER_USER%/s3e-backend:%VERSION%
```

**Linux/Mac:**
```bash
docker push ${DOCKER_USER}/s3e-backend:${VERSION}
```

### Passo 5: Push Frontend

```bash
docker push %DOCKER_USER%/s3e-frontend:%VERSION%
```

**Linux/Mac:**
```bash
docker push ${DOCKER_USER}/s3e-frontend:${VERSION}
```

### Passo 6: Tag Latest (Opcional)

Para manter `latest` apontando para a versão mais recente:

```bash
# Backend
docker tag %DOCKER_USER%/s3e-backend:%VERSION% %DOCKER_USER%/s3e-backend:latest
docker push %DOCKER_USER%/s3e-backend:latest

# Frontend
docker tag %DOCKER_USER%/s3e-frontend:%VERSION% %DOCKER_USER%/s3e-frontend:latest
docker push %DOCKER_USER%/s3e-frontend:latest
```

---

## 🤖 Opção 2: Usar Script Automatizado (Windows)

### Atualizar o script primeiro:

Edite `build-and-push.bat` e altere a linha 6:
```batch
set DOCKER_USER=odev10antonio
```

### Executar o script:

```bash
build-and-push.bat 1.0.6
```

---

## 🐧 Opção 2: Usar Script Automatizado (Linux/Mac)

### Atualizar o script primeiro:

Edite `build-and-push.sh` e altere a linha 6:
```bash
DOCKER_USER="odev10antonio"
```

### Tornar executável e executar:

```bash
chmod +x build-and-push.sh
./build-and-push.sh 1.0.6
```

---

## 🚀 Deploy em Produção

### Opção A: Atualizar docker-compose.prod.yml

Edite `docker-compose.prod.yml` e atualize as versões:

```yaml
backend:
  image: odev10antonio/s3e-backend:1.0.6  # ← Atualizar aqui

frontend:
  image: odev10antonio/s3e-frontend:1.0.6  # ← Atualizar aqui
```

### Opção B: Comandos Docker Compose

```bash
# Parar containers atuais
docker-compose -f docker-compose.prod.yml down

# Atualizar imagens
docker-compose -f docker-compose.prod.yml pull

# Subir novamente
docker-compose -f docker-compose.prod.yml up -d
```

### Opção C: Deploy no TrueNAS Scale

1. **Acesse o TrueNAS Scale**
2. **Vá em Apps > Installed Applications**
3. **Encontre `s3e-backend` e `s3e-frontend`**
4. **Clique em "Edit"**
5. **Atualize a versão da imagem:**
   - Backend: `odev10antonio/s3e-backend:1.0.6`
   - Frontend: `odev10antonio/s3e-frontend:1.0.6`
6. **Salve e aguarde o redeploy**

---

## ✅ Verificação Pós-Deploy

### 1. Verificar se os containers estão rodando:

```bash
docker ps | grep s3e
```

### 2. Verificar logs do backend:

```bash
docker logs s3e-backend-prod
```

### 3. Testar endpoint de health:

```bash
curl http://192.168.100.228:3001/api/health
```

### 4. Testar com usuário engenheiro:

1. Fazer login como engenheiro
2. Tentar criar um serviço → **Deve funcionar** ✅
3. Tentar criar um orçamento → **Deve funcionar** ✅

---

## 🔄 Rollback (Se necessário)

Se algo der errado, volte para a versão anterior:

```bash
# Atualizar docker-compose.prod.yml
backend:
  image: odev10antonio/s3e-backend:1.0.5  # ← Versão anterior

frontend:
  image: odev10antonio/s3e-frontend:1.0.5  # ← Versão anterior

# Redeploy
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 Checklist Completo

### Antes do Deploy:
- [ ] Código commitado e testado localmente
- [ ] Login no Docker Hub realizado
- [ ] Versão definida (1.0.6)
- [ ] Build do backend executado com sucesso
- [ ] Build do frontend executado com sucesso
- [ ] Push das imagens realizado com sucesso

### Durante o Deploy:
- [ ] Containers parados
- [ ] Imagens atualizadas no docker-compose.prod.yml
- [ ] Containers iniciados
- [ ] Logs verificados (sem erros)

### Após o Deploy:
- [ ] Health check passou
- [ ] Login como engenheiro funcionando
- [ ] Criação de serviço testada e funcionando
- [ ] Criação de orçamento testada e funcionando
- [ ] Sem erros 403 para engenheiros

---

## 🐛 Troubleshooting

### Problema: Build falha
**Solução:** Verifique se o Docker está rodando e se há espaço em disco.

### Problema: Push falha
**Solução:** Verifique se está logado no Docker Hub (`docker login`).

### Problema: Containers não iniciam
**Solução:** Verifique os logs (`docker logs s3e-backend-prod`).

### Problema: Engenheiros ainda recebem 403
**Solução:** 
1. Verifique se a nova versão está rodando
2. Verifique os logs do backend para ver as permissões sendo verificadas
3. Limpe o cache do navegador

---

## 📞 Comandos Rápidos (Copy & Paste)

### Windows (CMD):
```cmd
set VERSION=1.0.6
set DOCKER_USER=odev10antonio
docker build -t %DOCKER_USER%/s3e-backend:%VERSION% --target production -f backend/Dockerfile ./backend
docker build -t %DOCKER_USER%/s3e-frontend:%VERSION% --target production --build-arg VITE_API_URL=http://192.168.100.228:3001 -f frontend/Dockerfile ./frontend
docker push %DOCKER_USER%/s3e-backend:%VERSION%
docker push %DOCKER_USER%/s3e-frontend:%VERSION%
```

### Linux/Mac:
```bash
export VERSION=1.0.6
export DOCKER_USER=odev10antonio
docker build -t ${DOCKER_USER}/s3e-backend:${VERSION} --target production -f backend/Dockerfile ./backend
docker build -t ${DOCKER_USER}/s3e-frontend:${VERSION} --target production --build-arg VITE_API_URL=http://192.168.100.228:3001 -f frontend/Dockerfile ./frontend
docker push ${DOCKER_USER}/s3e-backend:${VERSION}
docker push ${DOCKER_USER}/s3e-frontend:${VERSION}
```

---

**✅ Pronto para deploy!** 🚀

